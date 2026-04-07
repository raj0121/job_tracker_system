import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import { Company, Requirement, User } from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { serializePageResult, serializeRequirement } from "../../utils/atsSerializers.js";
import { buildPageResult, resolvePagePagination } from "../../utils/pagination.js";

const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"];
const STATUS_OPTIONS = ["open", "on_hold", "closed"];

const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const normalizeInteger = (value, label) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`${label} must be a positive number`, 400);
  }
  return Math.trunc(parsed);
};

const normalizeId = (value, label) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${label} must be a positive integer`, 400);
  }
  return parsed;
};

const normalizeNonNegativeInteger = (value, label, options = {}) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new AppError(`${label} must be a number`, 400);
  }
  const normalized = Math.trunc(parsed);
  if (normalized < 0) {
    throw new AppError(`${label} must be zero or greater`, 400);
  }
  if (typeof options.max === "number" && normalized > options.max) {
    throw new AppError(`${label} must be at most ${options.max}`, 400);
  }
  return normalized;
};

const normalizeStatus = (value) => {
  if (!value) {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  return STATUS_OPTIONS.includes(normalized) ? normalized : null;
};

const normalizePriority = (value) => {
  if (!value) {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  return PRIORITY_OPTIONS.includes(normalized) ? normalized : null;
};

const normalizeDate = (value, label) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${label}`, 400);
  }
  return parsed;
};

const parseJsonField = (value, label) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new AppError(`Invalid ${label} payload`, 400);
    }
  }
  return value;
};

const normalizeEducation = (value) => {
  const parsed = parseJsonField(value, "education");
  if (!parsed) {
    return [];
  }
  if (!Array.isArray(parsed)) {
    throw new AppError("Education must be an array", 400);
  }
  const normalized = parsed.map((item) => ({
    education_group: normalizeString(item?.education_group),
    education_type: normalizeString(item?.education_type),
    specialization: normalizeString(item?.specialization)
  }));
  return normalized.filter((entry) => Object.values(entry).some(Boolean));
};

const normalizeKeywords = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => String(item || "").trim()).filter(Boolean);
    return cleaned.length ? cleaned.join(", ") : null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map((item) => String(item || "").trim()).filter(Boolean);
        return cleaned.length ? cleaned.join(", ") : null;
      }
    } catch {
      return raw;
    }
  }
  return raw;
};

const normalizeMonth = (value, label) => normalizeNonNegativeInteger(value, label, { max: 11 });

const resolveUploadPayload = (file) => {
  if (!file) {
    return {
      file_url: null,
      file_original_name: null,
      file_mime_type: null,
      file_size: null
    };
  }

  return {
    file_url: `/uploads/${file.filename}`,
    file_original_name: file.originalname || null,
    file_mime_type: file.mimetype || null,
    file_size: Number.isFinite(file.size) ? file.size : null
  };
};

export const listRequirementsService = async (query = {}) => {
  const pagination = resolvePagePagination(query, {
    defaultLimit: 50,
    maxLimit: 200
  });

  const where = {};
  const status = normalizeStatus(query.status);
  if (status) {
    where.status = status;
  }

  const priority = normalizePriority(query.priority);
  if (priority) {
    where.priority = priority;
  }

  const companyId = normalizeId(query.company_id, "company_id");
  if (companyId) {
    where.company_id = companyId;
  }

  const search = normalizeString(query.search);
  if (search) {
    where[Op.or] = [
      { position: { [Op.like]: `%${search}%` } },
      { client_name: { [Op.like]: `%${search}%` } },
      { end_client_name: { [Op.like]: `%${search}%` } },
      { industry: { [Op.like]: `%${search}%` } },
      { department: { [Op.like]: `%${search}%` } },
      { client_job_id: { [Op.like]: `%${search}%` } },
      { email_subject: { [Op.like]: `%${search}%` } },
      { country: { [Op.like]: `%${search}%` } },
      { state: { [Op.like]: `%${search}%` } },
      { city: { [Op.like]: `%${search}%` } },
      { job_type: { [Op.like]: `%${search}%` } },
      { workplace_type: { [Op.like]: `%${search}%` } },
      { remarks: { [Op.like]: `%${search}%` } },
      { keywords: { [Op.like]: `%${search}%` } }
    ];
  }

  const baseQuery = {
    where,
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"]
      },
      {
        model: Company,
        attributes: ["id", "name", "industry", "location"]
      }
    ],
    order: [["updatedAt", "DESC"]]
  };

  if (pagination.enabled) {
    const { rows, count } = await Requirement.findAndCountAll({
      ...baseQuery,
      distinct: true,
      limit: pagination.limit,
      offset: pagination.offset
    });
    return serializePageResult(buildPageResult(rows, count, pagination), serializeRequirement);
  }

  const requirements = await Requirement.findAll(baseQuery);
  return requirements.map(serializeRequirement);
};

export const getRequirementByIdService = async (id) => {
  const requirement = await Requirement.findByPk(id, {
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"]
      },
      {
        model: Company,
        attributes: ["id", "name", "industry", "location"]
      }
    ]
  });

  if (!requirement) {
    throw new AppError("Requirement not found", 404);
  }

  return serializeRequirement(requirement);
};

export const createRequirementService = async (payload = {}, actor, file) => {
  const clientName = normalizeString(payload.client_name);
  if (!clientName) {
    throw new AppError("Client name is required", 400);
  }

  const position = normalizeString(payload.position ?? payload.title);
  if (!position) {
    throw new AppError("Position is required", 400);
  }
  const companyId = normalizeId(payload.company_id, "company_id");
  if (!companyId) {
    throw new AppError("Company is required", 400);
  }
  const company = await Company.findByPk(companyId, {
    attributes: ["id", "name"]
  });
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  if (!actor?.id) {
    throw new AppError("Unauthorized access.", 401);
  }

  const noOfPositions = normalizeInteger(
    payload.no_of_positions ?? payload.openings ?? 1,
    "no_of_positions"
  ) || 1;
  const status = normalizeStatus(payload.status) || "open";
  const priority = normalizePriority(payload.priority) || "medium";
  const minExpYear = normalizeNonNegativeInteger(payload.min_exp_year, "min_exp_year");
  const minExpMonth = normalizeMonth(payload.min_exp_month, "min_exp_month");
  const maxExpYear = normalizeNonNegativeInteger(payload.max_exp_year, "max_exp_year");
  const maxExpMonth = normalizeMonth(payload.max_exp_month, "max_exp_month");
  const durationYear = normalizeNonNegativeInteger(payload.duration_year, "duration_year");
  const durationMonths = normalizeNonNegativeInteger(payload.duration_months, "duration_months");
  const education = normalizeEducation(payload.education);
  const keywords = normalizeKeywords(payload.keywords);
  const uploadPayload = resolveUploadPayload(file);
  const assignedTo = normalizeInteger(payload.assigned_to, "assigned_to");

  const requirement = await Requirement.create({
    company_id: company.id,
    client_name: clientName,
    end_client_name: normalizeString(payload.end_client_name),
    position,
    industry: normalizeString(payload.industry),
    department: normalizeString(payload.department),
    client_job_id: null,
    min_exp_year: minExpYear,
    min_exp_month: minExpMonth,
    max_exp_year: maxExpYear,
    max_exp_month: maxExpMonth,
    no_of_positions: noOfPositions,
    assign_date: normalizeDate(
      payload.assign_date ?? payload.assignDate ?? payload.due_date ?? payload.dueDate,
      "assign_date"
    ),
    email_subject: normalizeString(payload.email_subject),
    country: normalizeString(payload.country),
    state: normalizeString(payload.state),
    city: normalizeString(payload.city),
    zip_code: normalizeString(payload.zip_code),
    job_type: normalizeString(payload.job_type),
    workplace_type: normalizeString(payload.workplace_type),
    status,
    priority,
    duration_year: durationYear,
    duration_months: durationMonths,
    keywords,
    description: normalizeString(payload.description ?? payload.notes),
    remarks: normalizeString(payload.remarks),
    education,
    ...uploadPayload,
    assigned_to: assignedTo,
    created_by: actor.id
  });

  const generatedJobId = `JOB-${String(requirement.id).padStart(3, "0")}`;
  await requirement.update({ client_job_id: generatedJobId });

  const createdRequirement = await Requirement.findByPk(requirement.id, {
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"]
      },
      {
        model: Company,
        attributes: ["id", "name", "industry", "location"]
      }
    ]
  });
  return serializeRequirement(createdRequirement);
};

export const updateRequirementService = async (id, payload = {}, file) => {
  const requirement = await Requirement.findByPk(id);
  if (!requirement) {
    throw new AppError("Requirement not found", 404);
  }

  const previousFileUrl = requirement.file_url;

  if (Object.prototype.hasOwnProperty.call(payload, "client_name")) {
    const clientName = normalizeString(payload.client_name);
    if (!clientName) {
      throw new AppError("Client name is required", 400);
    }
    requirement.client_name = clientName;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "company_id")) {
    const companyId = normalizeId(payload.company_id, "company_id");
    if (!companyId) {
      throw new AppError("Company is required", 400);
    }
    const company = await Company.findByPk(companyId, {
      attributes: ["id", "name"]
    });
    if (!company) {
      throw new AppError("Company not found", 404);
    }
    requirement.company_id = company.id;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "end_client_name")) {
    requirement.end_client_name = normalizeString(payload.end_client_name);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "position")
    || Object.prototype.hasOwnProperty.call(payload, "title")) {
    const position = normalizeString(payload.position ?? payload.title);
    if (!position) {
      throw new AppError("Position is required", 400);
    }
    requirement.position = position;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "industry")) {
    requirement.industry = normalizeString(payload.industry);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "department")) {
    requirement.department = normalizeString(payload.department);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "min_exp_year")) {
    requirement.min_exp_year = normalizeNonNegativeInteger(payload.min_exp_year, "min_exp_year");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "min_exp_month")) {
    requirement.min_exp_month = normalizeMonth(payload.min_exp_month, "min_exp_month");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "max_exp_year")) {
    requirement.max_exp_year = normalizeNonNegativeInteger(payload.max_exp_year, "max_exp_year");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "max_exp_month")) {
    requirement.max_exp_month = normalizeMonth(payload.max_exp_month, "max_exp_month");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "no_of_positions")
    || Object.prototype.hasOwnProperty.call(payload, "openings")) {
    requirement.no_of_positions = normalizeInteger(payload.no_of_positions ?? payload.openings, "no_of_positions")
      || requirement.no_of_positions;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "assigned_to")) {
    requirement.assigned_to = normalizeInteger(payload.assigned_to, "assigned_to");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "assign_date")
    || Object.prototype.hasOwnProperty.call(payload, "assignDate")
    || Object.prototype.hasOwnProperty.call(payload, "due_date")
    || Object.prototype.hasOwnProperty.call(payload, "dueDate")) {
    requirement.assign_date = normalizeDate(
      payload.assign_date ?? payload.assignDate ?? payload.due_date ?? payload.dueDate,
      "assign_date"
    );
  }

  if (Object.prototype.hasOwnProperty.call(payload, "email_subject")) {
    requirement.email_subject = normalizeString(payload.email_subject);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "country")) {
    requirement.country = normalizeString(payload.country);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "state")) {
    requirement.state = normalizeString(payload.state);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "city")) {
    requirement.city = normalizeString(payload.city);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "zip_code")) {
    requirement.zip_code = normalizeString(payload.zip_code);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "job_type")) {
    requirement.job_type = normalizeString(payload.job_type);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "workplace_type")) {
    requirement.workplace_type = normalizeString(payload.workplace_type);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "priority")) {
    const priority = normalizePriority(payload.priority);
    if (!priority) {
      throw new AppError("Invalid priority", 400);
    }
    requirement.priority = priority;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    const status = normalizeStatus(payload.status);
    if (!status) {
      throw new AppError("Invalid status", 400);
    }
    requirement.status = status;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "duration_year")) {
    requirement.duration_year = normalizeNonNegativeInteger(payload.duration_year, "duration_year");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "duration_months")) {
    requirement.duration_months = normalizeNonNegativeInteger(payload.duration_months, "duration_months");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "keywords")) {
    requirement.keywords = normalizeKeywords(payload.keywords);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "description")
    || Object.prototype.hasOwnProperty.call(payload, "notes")) {
    requirement.description = normalizeString(payload.description ?? payload.notes);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "remarks")) {
    requirement.remarks = normalizeString(payload.remarks);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "education")) {
    requirement.education = normalizeEducation(payload.education);
  }

  if (file) {
    const uploadPayload = resolveUploadPayload(file);
    requirement.file_url = uploadPayload.file_url;
    requirement.file_original_name = uploadPayload.file_original_name;
    requirement.file_mime_type = uploadPayload.file_mime_type;
    requirement.file_size = uploadPayload.file_size;

    if (previousFileUrl && previousFileUrl.startsWith("/uploads/")) {
      const previousPath = path.resolve(previousFileUrl.replace(/^\/+/, ""));
      const nextPath = path.resolve("uploads", file.filename);
      if (previousPath !== nextPath) {
        fs.promises.unlink(previousPath).catch(() => {});
      }
    }
  }

  await requirement.save();

  const updatedRequirement = await Requirement.findByPk(requirement.id, {
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"]
      },
      {
        model: Company,
        attributes: ["id", "name", "industry", "location"]
      }
    ]
  });
  return serializeRequirement(updatedRequirement);
};

export const deleteRequirementService = async (id) => {
  const requirement = await Requirement.findByPk(id);
  if (!requirement) {
    throw new AppError("Requirement not found", 404);
  }

  await requirement.destroy();
  return { deleted: true };
};
