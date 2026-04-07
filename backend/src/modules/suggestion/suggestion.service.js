import { Op, Sequelize } from "sequelize";
import { Company, Contact, JobApplication } from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { getWorkspaceMembership } from "../workspace/workspace.service.js";
import { isSuperAdminRole } from "../../utils/role.js";

const ENTITY_TYPES = new Set(["companies", "contacts", "job_titles", "locations"]);
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 15;

const parseWorkspaceId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
};

const normalizeEntity = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!ENTITY_TYPES.has(normalized)) {
    throw new AppError("Invalid suggestion entity", 400);
  }

  return normalized;
};

const resolveScope = async (actor, workspaceIdInput) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  const workspaceId = parseWorkspaceId(workspaceIdInput);
  if (!workspaceId) {
    return { userId, workspaceId: null };
  }

  if (isSuperAdminRole(actor?.role)) {
    return { userId, workspaceId };
  }

  const membership = await getWorkspaceMembership(workspaceId, actor);
  if (!membership) {
    throw new AppError("Access denied to workspace", 403);
  }

  return { userId, workspaceId };
};

const buildCompanyScopeWhere = ({ userId, workspaceId }) => {
  if (workspaceId) {
    return { workspace_id: workspaceId };
  }

  return {
    user_id: userId,
    workspace_id: { [Op.is]: null }
  };
};

const buildJobScopeWhere = ({ userId, workspaceId }) => {
  if (workspaceId) {
    return {
      workspace_id: workspaceId,
      deletedAt: null
    };
  }

  return {
    user_id: userId,
    workspace_id: { [Op.is]: null },
    deletedAt: null
  };
};

const buildSuggestionItem = ({ entity, label, value, secondaryText = "", payload = {}, id = null }) => ({
  id: id ?? value,
  entity,
  label,
  value,
  secondaryText,
  payload
});

const searchCompanies = async (scope, query, limit) => {
  const records = await Company.findAll({
    where: {
      ...buildCompanyScopeWhere(scope),
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { industry: { [Op.like]: `%${query}%` } },
        { location: { [Op.like]: `%${query}%` } }
      ]
    },
    attributes: ["id", "name", "industry", "website", "location", "workspace_id", "user_id"],
    order: [["name", "ASC"]],
    limit
  });

  return records.map((company) => buildSuggestionItem({
    id: company.id,
    entity: "companies",
    label: company.name,
    value: company.name,
    secondaryText: [company.industry, company.location].filter(Boolean).join(" · "),
    payload: company.toJSON()
  }));
};

const searchContacts = async (scope, query, limit) => {
  const records = await Contact.findAll({
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { role: { [Op.like]: `%${query}%` } }
      ]
    },
    include: [
      {
        model: Company,
        attributes: ["id", "name", "workspace_id", "user_id"],
        where: buildCompanyScopeWhere(scope),
        required: true
      }
    ],
    order: [["name", "ASC"]],
    limit
  });

  return records.map((contact) => {
    const payload = contact.toJSON();
    const companyName = payload.Company?.name || "";

    return buildSuggestionItem({
      id: contact.id,
      entity: "contacts",
      label: contact.name,
      value: contact.name,
      secondaryText: [contact.role, companyName].filter(Boolean).join(" · "),
      payload: {
        ...payload,
        company_name: companyName
      }
    });
  });
};

const searchJobTitles = async (scope, query, limit) => {
  const records = await JobApplication.findAll({
    where: {
      ...buildJobScopeWhere(scope),
      job_title: { [Op.like]: `%${query}%` }
    },
    attributes: [
      [Sequelize.fn("DISTINCT", Sequelize.col("job_title")), "job_title"]
    ],
    order: [["job_title", "ASC"]],
    limit,
    raw: true
  });

  return records
    .map((row) => row.job_title)
    .filter(Boolean)
    .map((jobTitle) => buildSuggestionItem({
      entity: "job_titles",
      label: jobTitle,
      value: jobTitle,
      payload: { job_title: jobTitle }
    }));
};

const searchLocations = async (scope, query, limit) => {
  const [jobLocations, companyLocations] = await Promise.all([
    JobApplication.findAll({
      where: {
        ...buildJobScopeWhere(scope),
        location: {
          [Op.and]: [
            { [Op.not]: null },
            { [Op.like]: `%${query}%` }
          ]
        }
      },
      attributes: [
        [Sequelize.fn("DISTINCT", Sequelize.col("location")), "location"]
      ],
      order: [["location", "ASC"]],
      limit,
      raw: true
    }),
    Company.findAll({
      where: {
        ...buildCompanyScopeWhere(scope),
        location: {
          [Op.and]: [
            { [Op.not]: null },
            { [Op.like]: `%${query}%` }
          ]
        }
      },
      attributes: [
        [Sequelize.fn("DISTINCT", Sequelize.col("location")), "location"]
      ],
      order: [["location", "ASC"]],
      limit,
      raw: true
    })
  ]);

  const seen = new Set();
  const merged = [...jobLocations, ...companyLocations]
    .map((row) => row.location)
    .filter((location) => {
      const normalized = String(location || "").trim();
      if (!normalized) {
        return false;
      }

      const key = normalized.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, limit);

  return merged.map((location) => buildSuggestionItem({
    entity: "locations",
    label: location,
    value: location,
    payload: { location }
  }));
};

export const getSuggestionsService = async (actor, query = {}) => {
  const entity = normalizeEntity(query.entity);
  const search = String(query.q || "").trim();
  if (!search) {
    return [];
  }

  const limit = normalizeLimit(query.limit);
  const scope = await resolveScope(actor, query.workspace_id);

  switch (entity) {
    case "companies":
      return searchCompanies(scope, search, limit);
    case "contacts":
      return searchContacts(scope, search, limit);
    case "job_titles":
      return searchJobTitles(scope, search, limit);
    case "locations":
      return searchLocations(scope, search, limit);
    default:
      throw new AppError("Invalid suggestion entity", 400);
  }
};
