import { Op } from "sequelize";
import { Candidate, Company, Department, Designation, Requirement, User } from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { serializeCandidate, serializePageResult } from "../../utils/atsSerializers.js";
import { buildPageResult, resolvePagePagination } from "../../utils/pagination.js";

const STATUS_MAP = {
  new: "New",
  screening: "Screening",
  interview: "Interview",
  rejected: "Rejected",
  hired: "Hired"
};

const normalizeStatus = (value) => {
  if (!value) {
    return null;
  }

  const normalizedKey = String(value).trim().toLowerCase();
  return STATUS_MAP[normalizedKey] || null;
};

const resolveInput = (payload, ...keys) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      return payload[key];
    }
  }
  return undefined;
};

const normalizeString = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
};

const normalizeInteger = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return null;
  }
  return Math.trunc(numberValue);
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

const normalizeBoolean = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }
  return null;
};

const sanitizeEducationEntries = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => ({
      education_group: normalizeString(entry?.education_group ?? entry?.educationGroup),
      education_type: normalizeString(entry?.education_type ?? entry?.educationType),
      university: normalizeString(entry?.university),
      cgpa: normalizeString(entry?.cgpa),
      year: normalizeString(entry?.year ?? entry?.education_year ?? entry?.educationYear),
      specialization: normalizeString(entry?.specialization)
    }))
    .filter((entry) => Object.values(entry).some(Boolean));
};

const sanitizeExperienceEntries = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => ({
      company: normalizeString(entry?.company ?? entry?.company_name ?? entry?.companyName),
      role: normalizeString(entry?.role ?? entry?.job_role ?? entry?.jobRole ?? entry?.title),
      years: normalizeInteger(entry?.years),
      months: normalizeInteger(entry?.months),
      description: normalizeString(entry?.description ?? entry?.responsibilities)
    }))
    .filter((entry) => Object.values(entry).some((item) => item !== null && item !== ""));
};

export const listCandidatesService = async (query = {}) => {
  const pagination = resolvePagePagination(query, {
    defaultLimit: 50,
    maxLimit: 200
  });

  const where = {};
  const status = normalizeStatus(query.stage || query.status);
  const search = String(query.search || "").trim();
  const companyId = normalizeId(query.company_id, "company_id");

  if (status) {
    where.status = status;
  }

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { applied_position: { [Op.like]: `%${search}%` } }
    ];
  }

  const { rows, count } = await Candidate.findAndCountAll({
    where,
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"]
      },
      {
        model: User,
        as: "Assignee",
        attributes: ["id", "name", "email"]
      },
      {
        model: Requirement,
        required: Boolean(companyId),
        where: companyId ? { company_id: companyId } : undefined,
        attributes: [
          "id",
          "company_id",
          "client_name",
          "position",
          "client_job_id",
          "no_of_positions",
          "status",
          "min_exp_year",
          "min_exp_month",
          "max_exp_year",
          "max_exp_month"
        ],
        include: [
          {
            model: Company,
            attributes: ["id", "name", "industry", "location"]
          }
        ]
      },
      {
        model: Department,
        attributes: ["id", "name"]
      },
      {
        model: Designation,
        attributes: ["id", "name", "department_id"]
      }
    ],
    order: [["createdAt", "DESC"]],
    limit: pagination.limit,
    offset: pagination.offset
  });

  return serializePageResult(buildPageResult(rows, count, pagination), serializeCandidate);
};

export const createCandidateService = async (payload = {}, actor) => {
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new AppError("Candidate name is required", 400);
  }

  const candidatePayload = {
    name,
    email: normalizeString(payload.email),
    phone: normalizeString(payload.phone),
    resume_url: normalizeString(resolveInput(payload, "resume_url", "resumeUrl")),
    applied_position: normalizeString(resolveInput(payload, "applied_position", "appliedPosition", "position")),
    department_id: normalizeInteger(resolveInput(payload, "department_id", "departmentId")),
    designation_id: normalizeInteger(resolveInput(payload, "designation_id", "designationId")),
    department: normalizeString(resolveInput(payload, "department")),
    compensation: normalizeString(resolveInput(payload, "compensation")),
    current_salary: normalizeString(resolveInput(payload, "current_salary", "currentSalary")),
    expected_salary: normalizeString(resolveInput(payload, "expected_salary", "expectedSalary")),
    tax_terms: normalizeString(resolveInput(payload, "tax_terms", "taxTerms")),
    experience_years: normalizeInteger(resolveInput(payload, "experience_years", "experienceYears")),
    experience_months: normalizeInteger(resolveInput(payload, "experience_months", "experienceMonths")),
    work_authorization: normalizeString(resolveInput(payload, "work_authorization", "workAuthorization")),
    availability_days: normalizeInteger(resolveInput(payload, "availability_days", "availabilityDays")),
    native_place: normalizeString(resolveInput(payload, "native_place", "nativePlace")),
    country: normalizeString(resolveInput(payload, "country")),
    state: normalizeString(resolveInput(payload, "state")),
    city: normalizeString(resolveInput(payload, "city")),
    zip_code: normalizeString(resolveInput(payload, "zip_code", "zipCode")),
    source: normalizeString(resolveInput(payload, "source")),
    education_group: normalizeString(resolveInput(payload, "education_group", "educationGroup")),
    education_type: normalizeString(resolveInput(payload, "education_type", "educationType")),
    university: normalizeString(resolveInput(payload, "university")),
    cgpa: normalizeString(resolveInput(payload, "cgpa")),
    education_year: normalizeString(resolveInput(payload, "education_year", "year")),
    specialization: normalizeString(resolveInput(payload, "specialization")),
    educations: sanitizeEducationEntries(resolveInput(payload, "educations")),
    experiences: sanitizeExperienceEntries(resolveInput(payload, "experiences")),
    status: normalizeStatus(payload.status) || "New",
    requirement_id: normalizeId(resolveInput(payload, "requirement_id", "requirementId"), "requirement_id"),
    client_job_id: normalizeString(resolveInput(payload, "client_job_id", "clientJobId")),
    assigned_to: normalizeId(resolveInput(payload, "assigned_to", "assignedTo"), "assigned_to"),
    assignment_role: normalizeString(resolveInput(payload, "assignment_role", "assignmentRole")),
    assignment_remarks: normalizeString(resolveInput(payload, "assignment_remarks", "assignmentRemarks")),
    created_by: actor?.id || null
  };

  const relocateValue = normalizeBoolean(resolveInput(payload, "relocate"));
  if (relocateValue !== null) {
    candidatePayload.relocate = relocateValue;
  }

  const candidate = await Candidate.create(candidatePayload);
  return serializeCandidate(candidate);
};

export const updateCandidateService = async (id, payload = {}) => {
  const candidate = await Candidate.findByPk(id);
  if (!candidate) {
    throw new AppError("Candidate not found", 404);
  }

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(payload, "educations")) {
    updates.educations = sanitizeEducationEntries(resolveInput(payload, "educations"));
  }

  if (Object.prototype.hasOwnProperty.call(payload, "experiences")) {
    updates.experiences = sanitizeExperienceEntries(resolveInput(payload, "experiences"));
  }

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    const status = normalizeStatus(payload.status);
    if (!status) {
      throw new AppError("Invalid candidate status", 400);
    }
    updates.status = status;
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "assigned_to")
    || Object.prototype.hasOwnProperty.call(payload, "assignedTo")
  ) {
    updates.assigned_to = normalizeId(
      resolveInput(payload, "assigned_to", "assignedTo"),
      "assigned_to"
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "assignment_role")
    || Object.prototype.hasOwnProperty.call(payload, "assignmentRole")
  ) {
    updates.assignment_role = normalizeString(
      resolveInput(payload, "assignment_role", "assignmentRole")
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "assignment_remarks")
    || Object.prototype.hasOwnProperty.call(payload, "assignmentRemarks")
  ) {
    updates.assignment_remarks = normalizeString(
      resolveInput(payload, "assignment_remarks", "assignmentRemarks")
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "requirement_id")
    || Object.prototype.hasOwnProperty.call(payload, "requirementId")
  ) {
    const requirementId = normalizeId(
      resolveInput(payload, "requirement_id", "requirementId"),
      "requirement_id"
    );
    if (requirementId) {
      const requirement = await Requirement.findByPk(requirementId);
      if (!requirement) {
        throw new AppError("Requirement not found", 404);
      }
      updates.requirement_id = requirement.id;
      updates.client_job_id = requirement.client_job_id || updates.client_job_id || null;
    } else {
      updates.requirement_id = null;
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "client_job_id")
    || Object.prototype.hasOwnProperty.call(payload, "clientJobId")
  ) {
    updates.client_job_id = normalizeString(
      resolveInput(payload, "client_job_id", "clientJobId")
    );
  }

  if (!Object.keys(updates).length) {
    const existingCandidate = await Candidate.findByPk(candidate.id, {
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"]
        },
        {
          model: User,
          as: "Assignee",
          attributes: ["id", "name", "email"]
        },
        {
          model: Requirement,
          attributes: [
            "id",
            "company_id",
            "client_name",
            "position",
            "client_job_id",
            "no_of_positions",
            "status",
            "min_exp_year",
            "min_exp_month",
            "max_exp_year",
            "max_exp_month"
          ],
          include: [
            {
              model: Company,
              attributes: ["id", "name", "industry", "location"]
            }
          ]
        },
        {
          model: Department,
          attributes: ["id", "name"]
        },
        {
          model: Designation,
          attributes: ["id", "name", "department_id"]
        }
      ]
    });
    return serializeCandidate(existingCandidate);
  }

  await candidate.update(updates);

  const updatedCandidate = await Candidate.findByPk(candidate.id, {
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"]
      },
      {
        model: User,
        as: "Assignee",
        attributes: ["id", "name", "email"]
      },
      {
        model: Requirement,
        attributes: [
          "id",
          "company_id",
          "client_name",
          "position",
          "client_job_id",
          "no_of_positions",
          "status",
          "min_exp_year",
          "min_exp_month",
          "max_exp_year",
          "max_exp_month"
        ],
        include: [
          {
            model: Company,
            attributes: ["id", "name", "industry", "location"]
          }
        ]
      },
      {
        model: Department,
        attributes: ["id", "name"]
      },
      {
        model: Designation,
        attributes: ["id", "name", "department_id"]
      }
    ]
  });
  return serializeCandidate(updatedCandidate);
};
