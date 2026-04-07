import { Op, col, fn, literal } from "sequelize";
import {
  Company,
  Contact,
  ContactInteraction,
  JobApplication,
  User,
  sequelize
} from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { buildPageResult, resolvePagePagination } from "../../utils/pagination.js";
import { canWriteToWorkspace, isWorkspaceMember } from "../workspace/workspace.service.js";
import { isSuperAdminRole } from "../../utils/role.js";

const RESPONSE_STATUSES = [
  "Screening",
  "Interviewing",
  "Technical Test",
  "Final Round",
  "Rejected",
  "Offer",
  "Hired"
];
const INTERVIEW_STATUSES = ["Interviewing", "Technical Test", "Final Round", "Offer", "Hired"];

const normalizeWebsite = (website) => {
  if (website === undefined || website === null) {
    return undefined;
  }

  const value = String(website).trim();
  if (!value) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.toString();
  } catch {
    throw new AppError("Website must be a valid URL", 400);
  }
};

const normalizeLinkedinUrl = (url) => {
  if (url === undefined || url === null) {
    return undefined;
  }

  const value = String(url).trim();
  if (!value) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.toString();
  } catch {
    throw new AppError("LinkedIn URL must be a valid URL", 400);
  }
};

const toBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return Boolean(value);
};

const sanitizeCompanyPayload = (data = {}) => {
  const payload = { ...data };

  if (typeof payload.name === "string") {
    payload.name = payload.name.trim();
  }
  if (typeof payload.industry === "string") {
    payload.industry = payload.industry.trim();
  }
  if (typeof payload.location === "string") {
    payload.location = payload.location.trim();
  }
  if (typeof payload.blacklist_reason === "string") {
    payload.blacklist_reason = payload.blacklist_reason.trim();
  }
  if (typeof payload.notes === "string") {
    payload.notes = payload.notes.trim();
  }

  if (payload.workspace_id !== undefined) {
    payload.workspace_id = parseWorkspaceId(payload.workspace_id);
  }

  const normalizedWebsite = normalizeWebsite(payload.website);
  if (normalizedWebsite !== undefined) {
    payload.website = normalizedWebsite;
  }

  if (payload.is_blacklisted !== undefined) {
    payload.is_blacklisted = toBoolean(payload.is_blacklisted);
    if (!payload.is_blacklisted) {
      payload.blacklist_reason = null;
    }
  }

  return payload;
};

const sanitizeContactPayload = (data = {}) => {
  const payload = { ...data };

  if (typeof payload.name === "string") {
    payload.name = payload.name.trim();
  }
  if (typeof payload.role === "string") {
    payload.role = payload.role.trim();
  }
  if (typeof payload.email === "string") {
    payload.email = payload.email.trim().toLowerCase();
  }
  if (typeof payload.phone === "string") {
    payload.phone = payload.phone.trim();
  }
  if (typeof payload.notes === "string") {
    payload.notes = payload.notes.trim();
  }

  const normalizedLinkedinUrl = normalizeLinkedinUrl(payload.linkedin_url);
  if (normalizedLinkedinUrl !== undefined) {
    payload.linkedin_url = normalizedLinkedinUrl;
  }

  return payload;
};

const sanitizeInteractionPayload = (data = {}) => {
  const payload = { ...data };

  if (typeof payload.interaction_type === "string") {
    payload.interaction_type = payload.interaction_type.trim().toLowerCase();
  }
  if (typeof payload.summary === "string") {
    payload.summary = payload.summary.trim();
  }
  if (typeof payload.detail === "string") {
    payload.detail = payload.detail.trim();
  }
  if (typeof payload.outcome === "string") {
    payload.outcome = payload.outcome.trim();
  }

  if (!payload.interaction_type) {
    payload.interaction_type = "email";
  }
  if (!payload.summary) {
    throw new AppError("Interaction summary is required", 400);
  }

  if (payload.interacted_at) {
    const interactedAt = new Date(payload.interacted_at);
    if (Number.isNaN(interactedAt.getTime())) {
      throw new AppError("Invalid interaction date", 400);
    }
    payload.interacted_at = interactedAt;
  } else {
    payload.interacted_at = new Date();
  }

  if (payload.next_follow_up_at) {
    const nextFollowUp = new Date(payload.next_follow_up_at);
    if (Number.isNaN(nextFollowUp.getTime())) {
      throw new AppError("Invalid follow-up date", 400);
    }
    payload.next_follow_up_at = nextFollowUp;
  } else {
    payload.next_follow_up_at = null;
  }

  return payload;
};

const parseWorkspaceId = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const resolveCompanyScope = async (actor, workspaceId, { requireWrite = false } = {}) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  const scopedWorkspaceId = parseWorkspaceId(workspaceId);
  if (scopedWorkspaceId) {
    if (!isSuperAdminRole(actor?.role)) {
      const allowed = requireWrite
        ? await canWriteToWorkspace(scopedWorkspaceId, actor)
        : await isWorkspaceMember(scopedWorkspaceId, actor);
      if (!allowed) {
        throw new AppError("Access denied to workspace", 403);
      }
    }

    return { userId, workspaceId: scopedWorkspaceId };
  }

  return { userId, workspaceId: null };
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

const assertCompanyAccess = async (companyId, actor, { requireWrite = false } = {}) => {
  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  if (isSuperAdminRole(actor?.role)) {
    return company;
  }

  if (company.workspace_id) {
    const allowed = requireWrite
      ? await canWriteToWorkspace(company.workspace_id, actor)
      : await isWorkspaceMember(company.workspace_id, actor);
    if (!allowed) {
      throw new AppError("Access denied to workspace company", 403);
    }
    return company;
  }

  if (company.user_id !== actor?.id) {
    throw new AppError("Access denied to company", 403);
  }

  return company;
};

const resolveJobScopeForCompany = (company, fallbackUserId) => {
  if (company.workspace_id) {
    return { workspace_id: company.workspace_id };
  }

  return {
    user_id: company.user_id || fallbackUserId,
    workspace_id: { [Op.is]: null }
  };
};

const buildRate = (numerator, denominator) => {
  if (!denominator) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(2));
};

const aggregateCompanyMetrics = async (companyIds, scope) => {
  if (!companyIds.length) {
    return new Map();
  }

  const scopeWhere = scope?.workspaceId
    ? { workspace_id: scope.workspaceId }
    : scope?.userId
      ? { user_id: scope.userId, workspace_id: { [Op.is]: null } }
      : {};

  const statsRows = await JobApplication.findAll({
    where: {
      company_id: { [Op.in]: companyIds },
      deletedAt: null,
      ...(scopeWhere || {})
    },
    attributes: [
      "company_id",
      [fn("COUNT", col("id")), "totalApplications"],
      [literal(`SUM(CASE WHEN status IN ('${RESPONSE_STATUSES.join("','")}') THEN 1 ELSE 0 END)`), "responses"],
      [literal(`SUM(CASE WHEN status IN ('${INTERVIEW_STATUSES.join("','")}') THEN 1 ELSE 0 END)`), "interviews"],
      [literal("SUM(CASE WHEN status IN ('Offer','Hired') THEN 1 ELSE 0 END)"), "offers"]
    ],
    group: ["company_id"],
    raw: true
  });

  return new Map(
    statsRows.map((row) => [
      Number(row.company_id),
      {
        totalApplications: Number(row.totalApplications || 0),
        responses: Number(row.responses || 0),
        interviews: Number(row.interviews || 0),
        offers: Number(row.offers || 0)
      }
    ])
  );
};

const mapCompanyWithMetrics = (company, metric = {}) => {
  const totalApplications = Number(metric.totalApplications || 0);
  const responses = Number(metric.responses || 0);
  const interviews = Number(metric.interviews || 0);
  const offers = Number(metric.offers || 0);

  return {
    ...company.toJSON(),
    intelligence: {
      totalApplications,
      responseRate: buildRate(responses, totalApplications),
      interviewRatio: buildRate(interviews, totalApplications),
      offerRate: buildRate(offers, totalApplications)
    }
  };
};

const assertCompanyContact = async (companyId, contactId) => {
  const contact = await Contact.findOne({
    where: {
      id: contactId,
      company_id: companyId
    }
  });

  if (!contact) {
    throw new AppError("Contact not found for this company", 404);
  }

  return contact;
};

const syncCompanyNameAcrossJobs = async (companyId, name, transaction) => {
  await JobApplication.update(
    { company_name: name },
    {
      where: {
        company_id: companyId,
        deletedAt: null
      },
      transaction
    }
  );
};

export const createCompanyService = async (actor, data) => {
  const payload = sanitizeCompanyPayload(data);

  if (!payload.name) {
    throw new AppError("Company name is required", 400);
  }

  const scope = await resolveCompanyScope(actor, payload.workspace_id, { requireWrite: true });
  const existing = await Company.findOne({
    where: {
      name: payload.name,
      ...buildCompanyScopeWhere(scope)
    }
  });
  if (existing) {
    throw new AppError("Company already exists", 400);
  }

  return Company.create({
    ...payload,
    user_id: scope.userId,
    workspace_id: scope.workspaceId
  });
};

export const getAllCompaniesService = async (actor, query = {}) => {
  const { search, blacklisted, workspace_id } = query;
  const scope = await resolveCompanyScope(actor, workspace_id);
  const where = buildCompanyScopeWhere(scope);
  const pagination = resolvePagePagination(query, {
    defaultLimit: 100,
    maxLimit: 500
  });

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { industry: { [Op.like]: `%${search}%` } },
      { location: { [Op.like]: `%${search}%` } }
    ];
  }

  if (blacklisted !== undefined) {
    where.is_blacklisted = blacklisted === "true";
  }

  const companyQuery = {
    where,
    include: [
      {
        model: Contact,
        attributes: ["id", "name", "role", "email", "last_interaction_at"]
      }
    ],
    order: [["updatedAt", "DESC"]]
  };

  let companies;
  let totalCount = 0;

  if (pagination.enabled) {
    const result = await Company.findAndCountAll({
      ...companyQuery,
      distinct: true,
      limit: pagination.limit,
      offset: pagination.offset
    });
    companies = result.rows;
    totalCount = result.count;
  } else {
    companies = await Company.findAll(companyQuery);
  }

  const statsByCompanyId = await aggregateCompanyMetrics(
    companies.map((item) => item.id),
    scope
  );

  const mappedCompanies = companies.map((company) => mapCompanyWithMetrics(company, statsByCompanyId.get(company.id)));

  if (pagination.enabled) {
    return buildPageResult(mappedCompanies, totalCount, pagination);
  }

  return mappedCompanies;
};

export const getCompanyTrackingOverviewService = async (actor, query = {}) => {
  const scope = await resolveCompanyScope(actor, query.workspace_id);

  const companies = await Company.findAll({
    where: buildCompanyScopeWhere(scope),
    attributes: ["id", "name", "is_blacklisted", "location", "industry"],
    order: [["name", "ASC"]]
  });

  const companyIds = companies.map((item) => item.id);
  const [totalContacts, totalInteractions, statsByCompanyId] = await Promise.all([
    companyIds.length
      ? Contact.count({ where: { company_id: { [Op.in]: companyIds } } })
      : 0,
    companyIds.length
      ? ContactInteraction.count({ where: { company_id: { [Op.in]: companyIds } } })
      : 0,
    aggregateCompanyMetrics(companyIds, scope)
  ]);

  const trackedCompanies = companies.map((company) => mapCompanyWithMetrics(company, statsByCompanyId.get(company.id)));

  const topResponseRate = [...trackedCompanies]
    .filter((company) => company.intelligence.totalApplications > 0)
    .sort((a, b) => b.intelligence.responseRate - a.intelligence.responseRate)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      responseRate: item.intelligence.responseRate,
      totalApplications: item.intelligence.totalApplications
    }));

  const topInterviewRatio = [...trackedCompanies]
    .filter((company) => company.intelligence.totalApplications > 0)
    .sort((a, b) => b.intelligence.interviewRatio - a.intelligence.interviewRatio)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      interviewRatio: item.intelligence.interviewRatio,
      totalApplications: item.intelligence.totalApplications
    }));

  return {
    totals: {
      totalCompanies: companies.length,
      blacklistedCompanies: companies.filter((company) => company.is_blacklisted).length,
      recruiterContacts: Number(totalContacts || 0),
      recruiterInteractions: Number(totalInteractions || 0)
    },
    topResponseRate,
    topInterviewRatio
  };
};

export const getCompanyDetailsService = async (id, actor) => {
  const company = await assertCompanyAccess(id, actor);
  const jobScope = resolveJobScopeForCompany(company, actor?.id);
  const scope = company.workspace_id
    ? { workspaceId: company.workspace_id, userId: actor?.id }
    : { workspaceId: null, userId: company.user_id || actor?.id };

  const scopedCompany = await Company.findByPk(id, {
    include: [
      {
        model: Contact,
        attributes: [
          "id",
          "name",
          "role",
          "email",
          "phone",
          "linkedin_url",
          "notes",
          "last_interaction_at",
          "createdAt"
        ]
      },
      {
        model: JobApplication,
        attributes: ["id", "job_title", "status", "createdAt"],
        where: { deletedAt: null, ...jobScope },
        required: false
      }
    ]
  });

  if (!scopedCompany) {
    throw new AppError("Company not found", 404);
  }

  const [statsByCompanyId, interactionHistory] = await Promise.all([
    aggregateCompanyMetrics([Number(id)], scope),
    ContactInteraction.findAll({
      where: { company_id: id },
      include: [
        { model: Contact, attributes: ["id", "name", "role", "email"] },
        { model: User, attributes: ["id", "name", "email"] }
      ],
      order: [["interacted_at", "DESC"]],
      limit: 100
    })
  ]);

  const rejectionsRows = await JobApplication.findAll({
    where: {
      company_id: id,
      deletedAt: null,
      ...jobScope
    },
    attributes: [
      [literal("SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END)"), "rejections"]
    ],
    raw: true
  });

  const metric = statsByCompanyId.get(Number(id)) || {};
  const totalApplications = Number(metric.totalApplications || 0);
  const rejections = Number(rejectionsRows[0]?.rejections || 0);

  const payload = mapCompanyWithMetrics(scopedCompany, metric);
  payload.intelligence = {
    ...payload.intelligence,
    rejectionRate: buildRate(rejections, totalApplications)
  };
  payload.interactionHistory = interactionHistory;

  return payload;
};

export const updateCompanyService = async (id, data, actor) => {
  const company = await assertCompanyAccess(id, actor, { requireWrite: true });
  const payload = sanitizeCompanyPayload(data);
  delete payload.workspace_id;
  delete payload.user_id;

  return sequelize.transaction(async (transaction) => {
    const previousName = company.name;
    const updatedCompany = await company.update(payload, { transaction });

    if (payload.name && payload.name !== previousName) {
      await syncCompanyNameAcrossJobs(updatedCompany.id, updatedCompany.name, transaction);
    }

    return updatedCompany;
  });
};

export const updateCompanyBlacklistService = async (id, data, actor) => {
  const company = await assertCompanyAccess(id, actor, { requireWrite: true });
  const isBlacklisted = toBoolean(data?.is_blacklisted);
  const reason = isBlacklisted ? (data?.blacklist_reason || "").trim() : null;

  return company.update({
    is_blacklisted: isBlacklisted,
    blacklist_reason: reason || null
  });
};

export const addContactService = async (companyId, data, actor) => {
  await assertCompanyAccess(companyId, actor, { requireWrite: true });
  const payload = sanitizeContactPayload(data);

  if (!payload.name) {
    throw new AppError("Recruiter contact name is required", 400);
  }

  return Contact.create({
    ...payload,
    company_id: companyId
  });
};

export const getContactsByCompanyService = async (companyId, actor) => {
  await assertCompanyAccess(companyId, actor);
  return Contact.findAll({
    where: { company_id: companyId },
    attributes: [
      "id",
      "name",
      "role",
      "email",
      "phone",
      "linkedin_url",
      "notes",
      "last_interaction_at",
      "createdAt",
      "updatedAt"
    ],
    order: [
      ["last_interaction_at", "DESC"],
      ["createdAt", "DESC"]
    ]
  });
};

export const addContactInteractionService = async (companyId, contactId, actor, data) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  await assertCompanyAccess(companyId, actor, { requireWrite: true });
  const contact = await assertCompanyContact(companyId, contactId);
  const payload = sanitizeInteractionPayload(data);

  const interaction = await sequelize.transaction(async (transaction) => {
    const created = await ContactInteraction.create({
      ...payload,
      company_id: companyId,
      contact_id: contactId,
      user_id: userId
    }, { transaction });

    const nextInteractionDate = payload.interacted_at || new Date();
    const previousDate = contact.last_interaction_at ? new Date(contact.last_interaction_at) : null;
    const shouldUpdateLastInteraction = !previousDate || nextInteractionDate > previousDate;

    if (shouldUpdateLastInteraction) {
      contact.last_interaction_at = nextInteractionDate;
      await contact.save({ transaction });
    }

    return created;
  });

  return ContactInteraction.findByPk(interaction.id, {
    include: [
      { model: Contact, attributes: ["id", "name", "role", "email"] },
      { model: User, attributes: ["id", "name", "email"] }
    ]
  });
};

export const getContactInteractionHistoryService = async (companyId, contactId, actor, limit = 50) => {
  await assertCompanyAccess(companyId, actor);
  await assertCompanyContact(companyId, contactId);

  const parsedLimit = Math.max(1, Math.min(200, Number(limit) || 50));

  return ContactInteraction.findAll({
    where: {
      company_id: companyId,
      contact_id: contactId
    },
    include: [
      { model: Contact, attributes: ["id", "name", "role", "email"] },
      { model: User, attributes: ["id", "name", "email"] }
    ],
    order: [["interacted_at", "DESC"]],
    limit: parsedLimit
  });
};

export const getDueRecruiterFollowUpsService = async (actor, query = {}) => {
  const scope = await resolveCompanyScope(actor, query.workspace_id);
  const limit = Math.max(1, Math.min(300, Number(query.limit) || 100));
  const windowDays = Math.max(1, Math.min(30, Number(query.days) || 7));
  const includeCompleted = query.include_completed === "true";
  const overdueOnly = query.overdue_only === "true";

  const now = new Date();
  const dueUntil = new Date();
  dueUntil.setDate(dueUntil.getDate() + windowDays);

  const where = {
    next_follow_up_at: overdueOnly
      ? { [Op.lte]: now }
      : { [Op.lte]: dueUntil }
  };

  if (!includeCompleted) {
    where.follow_up_notified_at = { [Op.is]: null };
  }

  const companyWhere = buildCompanyScopeWhere(scope);
  const interactions = await ContactInteraction.findAll({
    where,
    include: [
      { model: Company, attributes: ["id", "name", "industry", "location"], where: companyWhere, required: true },
      { model: Contact, attributes: ["id", "name", "role", "email", "phone"] },
      { model: User, attributes: ["id", "name", "email"] }
    ],
    order: [["next_follow_up_at", "ASC"]],
    limit
  });

  return interactions.map((item) => {
    const nextFollowUp = item.next_follow_up_at ? new Date(item.next_follow_up_at) : null;
    const isOverdue = nextFollowUp ? nextFollowUp < now : false;

    return {
      ...item.toJSON(),
      is_overdue: isOverdue,
      hours_until_due: nextFollowUp ? Number(((nextFollowUp.getTime() - now.getTime()) / (60 * 60 * 1000)).toFixed(2)) : null
    };
  });
};
