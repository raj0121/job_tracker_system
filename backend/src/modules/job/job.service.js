import { Op } from "sequelize";
import {
  Document,
  Company,
  Interview,
  JobApplication,
  JobStatusHistory,
  SavedFilter,
  User,
  Workspace,
  sequelize
} from "../../models/index.js";
import { logAction } from "../audit/audit.service.js";
import { AppError } from "../../utils/AppError.js";
import { withRetryTransaction } from "../../utils/withRetryTransaction.js";
import {
  canWriteToWorkspace,
  getWorkspaceMembership,
  isWorkspaceMember
} from "../workspace/workspace.service.js";
import { isSuperAdminRole } from "../../utils/role.js";

const COLLAB_VISIBILITY = ["public", "private"];
const MAX_ACTIVITY_ENTRIES = 300;
const MAX_NOTES = 200;
const MAX_BULK_OPERATION_SIZE = 200;
const APPLICATION_SOURCES = [
  "LinkedIn",
  "Company Website",
  "Referral",
  "Job Board",
  "Agency",
  "Networking",
  "Other"
];
const PRIORITY_LEVELS = ["Low", "Medium", "High", "Critical"];

const QUERY_FIELD_MAP = {
  company_name: "company_name",
  job_title: "job_title",
  status: "status",
  application_source: "application_source",
  priority: "priority",
  location: "location",
  job_type: "job_type",
  salary_range: "salary_range",
  applied_at: "applied_at",
  createdAt: "createdAt"
};

const QUERY_OPERATOR_MAP = {
  eq: Op.eq,
  ne: Op.ne,
  like: Op.like,
  notLike: Op.notLike,
  startsWith: Op.like,
  endsWith: Op.like,
  in: Op.in,
  notIn: Op.notIn,
  gte: Op.gte,
  lte: Op.lte,
  gt: Op.gt,
  lt: Op.lt,
  between: Op.between
};

const parseJsonSafe = (value, fallback = null) => {
  if (!value) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const buildDateRangeFilter = (dateFrom, dateTo) => {
  if (!dateFrom && !dateTo) {
    return undefined;
  }

  const filter = {};
  if (dateFrom) {
    filter[Op.gte] = new Date(dateFrom);
  }
  if (dateTo) {
    filter[Op.lte] = new Date(dateTo);
  }

  return filter;
};

const normalizeSavedFilterPayload = (payload = {}) => {
  const name = (payload.name || "").toString().trim();
  if (!name) {
    throw new AppError("Saved filter name is required", 400);
  }

  const scope = (payload.scope || "jobs").toString().trim().toLowerCase();
  if (!["jobs", "companies", "interviews", "documents"].includes(scope)) {
    throw new AppError("Invalid saved filter scope", 400);
  }

  const definition = typeof payload.definition === "string"
    ? parseJsonSafe(payload.definition, null)
    : payload.definition;

  if (!definition || typeof definition !== "object") {
    throw new AppError("Saved filter definition must be a valid object", 400);
  }

  return {
    name,
    scope,
    definition,
    is_default: Boolean(payload.is_default)
  };
};

const normalizeSource = (value) => {
  if (!value) {
    return "Other";
  }

  const normalized = String(value).trim();
  return APPLICATION_SOURCES.includes(normalized) ? normalized : "Other";
};

const normalizePriority = (value) => {
  if (!value) {
    return "Medium";
  }

  const normalized = String(value).trim();
  return PRIORITY_LEVELS.includes(normalized) ? normalized : "Medium";
};

const assertCompanyScopeForJob = async ({ companyId, workspaceId, actor }) => {
  if (!companyId) {
    return null;
  }

  const company = await Company.findByPk(companyId, {
    attributes: ["id", "user_id", "workspace_id", "name"]
  });

  if (!company) {
    throw new AppError("Company not found", 404);
  }

  if (company.workspace_id) {
    if (workspaceId && Number(workspaceId) !== Number(company.workspace_id)) {
      throw new AppError("Company belongs to a different workspace", 400);
    }

    if (!isSuperAdminRole(actor?.role)) {
      const member = await isWorkspaceMember(company.workspace_id, actor);
      if (!member) {
        throw new AppError("Access denied to workspace company", 403);
      }
    }

    return company;
  }

  if (company.user_id) {
    if (!isSuperAdminRole(actor?.role) && company.user_id !== actor?.id) {
      throw new AppError("Access denied to personal company", 403);
    }

    if (workspaceId) {
      throw new AppError("Personal companies cannot be attached to workspace jobs", 400);
    }

    return company;
  }

  if (!isSuperAdminRole(actor?.role)) {
    throw new AppError("Company scope is not configured", 403);
  }

  return company;
};

const normalizeRuleValue = (field, value) => {
  if (value === undefined || value === null) {
    return value;
  }

  if (["applied_at", "createdAt"].includes(field)) {
    if (Array.isArray(value)) {
      return value.map((item) => new Date(item));
    }

    return new Date(value);
  }

  return value;
};

const normalizeRulePattern = (operator, value) => {
  if (typeof value !== "string") {
    return value;
  }

  if (operator === "startsWith") {
    return `${value}%`;
  }

  if (operator === "endsWith") {
    return `%${value}`;
  }

  return value;
};

const buildAdvancedRule = (rule = {}) => {
  const field = QUERY_FIELD_MAP[rule.field];
  if (!field) {
    throw new AppError(`Unsupported query-builder field: ${rule.field}`, 400);
  }

  const operator = QUERY_OPERATOR_MAP[rule.operator];
  if (!operator) {
    throw new AppError(`Unsupported query-builder operator: ${rule.operator}`, 400);
  }

  const normalizedValue = normalizeRuleValue(field, rule.value);

  if (rule.operator === "between") {
    if (!Array.isArray(normalizedValue) || normalizedValue.length !== 2) {
      throw new AppError(`Operator "between" requires array with two values for field ${rule.field}`, 400);
    }

    return {
      [field]: {
        [operator]: normalizedValue
      }
    };
  }

  if (["in", "notIn"].includes(rule.operator) && !Array.isArray(normalizedValue)) {
    throw new AppError(`Operator "${rule.operator}" requires an array value`, 400);
  }

  return {
    [field]: {
      [operator]: normalizeRulePattern(rule.operator, normalizedValue)
    }
  };
};

const buildAdvancedQueryFilter = (queryBuilderInput) => {
  const queryBuilder = typeof queryBuilderInput === "string"
    ? parseJsonSafe(queryBuilderInput, null)
    : queryBuilderInput;

  if (!queryBuilder || typeof queryBuilder !== "object") {
    return null;
  }

  const rules = Array.isArray(queryBuilder.rules) ? queryBuilder.rules : [];
  if (!rules.length) {
    return null;
  }

  const logic = (queryBuilder.logic || "and").toString().trim().toLowerCase();
  const logicalOperator = logic === "or" ? Op.or : Op.and;

  return {
    [logicalOperator]: rules.map((rule) => buildAdvancedRule(rule))
  };
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const createEntryId = () => `ent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const normalizeVisibility = (value, fallback = "public") => {
  const normalized = (value || fallback).toString().toLowerCase();
  return COLLAB_VISIBILITY.includes(normalized) ? normalized : fallback;
};

const canViewPrivateEntry = ({ entry, actor, job, workspaceRole }) => {
  if (entry.visibility !== "private") {
    return true;
  }

  if (isSuperAdminRole(actor.role)) {
    return true;
  }

  if (entry.user_id === actor.id || job.user_id === actor.id) {
    return true;
  }

  if (workspaceRole === "owner") {
    return true;
  }

  return false;
};

const filterByVisibility = ({ entries, actor, job, workspaceRole }) => {
  return safeArray(entries).filter((entry) => canViewPrivateEntry({
    entry,
    actor,
    job,
    workspaceRole
  }));
};

const appendActivityEntry = (feed, entry) => {
  const next = [...safeArray(feed), entry];
  if (next.length > MAX_ACTIVITY_ENTRIES) {
    return next.slice(next.length - MAX_ACTIVITY_ENTRIES);
  }
  return next;
};

const buildActivityEntry = ({
  actor,
  type,
  message,
  visibility = "public",
  metadata = {}
}) => ({
  id: createEntryId(),
  type,
  message,
  visibility: normalizeVisibility(visibility),
  metadata,
  user_id: actor.id,
  user_name: actor.name || actor.email || `User-${actor.id}`,
  createdAt: new Date().toISOString()
});

const resolveWorkspaceRole = async (job, actor) => {
  if (!job.workspace_id) {
    return null;
  }

  const membership = await getWorkspaceMembership(job.workspace_id, actor);
  return membership?.role || null;
};

const canWriteOnJob = ({ actor, job, workspaceRole }) => {
  if (isSuperAdminRole(actor.role)) {
    return true;
  }

  if (job.user_id === actor.id) {
    return true;
  }

  if (workspaceRole && workspaceRole !== "viewer") {
    return true;
  }

  return false;
};

const findDuplicateJob = async ({
  actorId,
  companyName,
  jobTitle,
  workspaceId = null,
  excludeId = null,
  transaction = null
}) => {
  if (!companyName || !jobTitle) {
    return null;
  }

  const where = {
    user_id: actorId,
    company_name: companyName.trim(),
    job_title: jobTitle.trim(),
    workspace_id: workspaceId || { [Op.is]: null },
    deletedAt: null
  };

  if (excludeId) {
    where.id = { [Op.ne]: Number(excludeId) };
  }

  return JobApplication.findOne({
    where,
    attributes: ["id", "company_name", "job_title", "status", "createdAt"],
    transaction
  });
};

const buildCollaborationPayload = async (job, actor) => {
  const workspaceRole = await resolveWorkspaceRole(job, actor);
  const visibleActivity = filterByVisibility({
    entries: job.activity_feed,
    actor,
    job,
    workspaceRole
  }).sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

  const visibleNotes = filterByVisibility({
    entries: job.internal_notes,
    actor,
    job,
    workspaceRole
  }).sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

  return {
    comments: visibleActivity.filter((item) => item.type === "COMMENT"),
    internalNotes: visibleNotes,
    activityFeed: visibleActivity,
    workspaceRole,
    canWrite: canWriteOnJob({ actor, job, workspaceRole })
  };
};

const assertJobAccess = async (job, actor) => {
  if (isSuperAdminRole(actor.role)) {
    return;
  }

  if (job.user_id === actor.id) {
    return;
  }

  if (job.workspace_id) {
    const member = await isWorkspaceMember(job.workspace_id, actor);
    if (member) {
      return;
    }
  }

  throw new AppError("Access denied", 403);
};

const assertJobWriteAccess = async (job, actor) => {
  if (isSuperAdminRole(actor.role)) {
    return;
  }

  if (job.user_id === actor.id) {
    return;
  }

  if (job.workspace_id) {
    const membership = await getWorkspaceMembership(job.workspace_id, actor);
    if (membership && membership.role !== "viewer") {
      return;
    }
  }

  throw new AppError("Write access denied", 403);
};

export const createJobService = async (data, actor) => {
  const transaction = await sequelize.transaction();

  try {
    const companyId = data.company_id ? Number(data.company_id) : null;
    if (data.company_id && (!Number.isInteger(companyId) || companyId <= 0)) {
      throw new AppError("company_id must be a positive integer", 400);
    }

    let company = null;
    if (companyId) {
      company = await assertCompanyScopeForJob({
        companyId,
        workspaceId: data.workspace_id || null,
        actor
      });
    }

    const normalizedCompanyName = company?.name || String(data.company_name || "").trim();
    if (!normalizedCompanyName) {
      throw new AppError("company_name is required", 400);
    }

    const normalizedSource = normalizeSource(data.application_source);
    const normalizedPriority = normalizePriority(data.priority);
    const duplicate = await findDuplicateJob({
      actorId: actor.id,
      companyName: normalizedCompanyName,
      jobTitle: data.job_title,
      workspaceId: data.workspace_id || null,
      transaction
    });

    if (duplicate && !Boolean(data.allow_duplicate)) {
      throw new AppError(
        `Duplicate application detected (Job #${duplicate.id}) for same company and title. Use allow_duplicate=true to save anyway.`,
        409
      );
    }

    if (data.workspace_id) {
      const canWrite = await canWriteToWorkspace(data.workspace_id, actor);
      if (!canWrite) {
        throw new AppError("Write access denied to workspace", 403);
      }
    }

    const activityFeed = [buildActivityEntry({
      actor,
      type: "JOB_CREATED",
      message: "Job created",
      visibility: "public",
      metadata: {
        status: data.status || "Applied",
        workspace_id: data.workspace_id || null,
        application_source: normalizedSource,
        priority: normalizedPriority,
        duplicate_of_job_id: duplicate?.id || null
      }
    })];

    const createPayload = {
      ...data,
      company_id: companyId || null,
      company_name: normalizedCompanyName
    };
    delete createPayload.allow_duplicate;

    const job = await JobApplication.create(
      {
        ...createPayload,
        application_source: normalizedSource,
        priority: normalizedPriority,
        is_duplicate: Boolean(duplicate),
        duplicate_of_job_id: duplicate?.id || null,
        user_id: actor.id,
        activity_feed: activityFeed
      },
      { transaction, actorId: actor.id }
    );

    await logAction(
      {
        userId: actor.id,
        role: actor.role,
        action: "CREATE_JOB",
        resource: "JobApplication",
        resourceId: job.id
      },
      transaction
    );

    await transaction.commit();
    return job;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const getAllJobsService = async (actor, query) => {
  const userId = actor?.id;

  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  let mergedQuery = { ...(query || {}) };

  if (query?.saved_filter_id) {
    const savedFilter = await SavedFilter.findOne({
      where: {
        id: query.saved_filter_id,
        user_id: userId,
        scope: "jobs"
      }
    });

    if (!savedFilter) {
      throw new AppError("Saved filter not found", 404);
    }

    mergedQuery = {
      ...(savedFilter.definition || {}),
      ...mergedQuery
    };
  }

  const {
    status,
    search,
    location,
    job_type,
    workspace_id,
    cursor,
    date_from,
    date_to,
    company,
    application_source,
    priority,
    query_builder,
    limit = 20
  } = mergedQuery;

  const filter = {};

  if (workspace_id) {
    const member = await isWorkspaceMember(workspace_id, actor);
    if (!member) {
      throw new AppError("Access denied to workspace", 403);
    }

    filter.workspace_id = workspace_id;
  } else {
    filter.user_id = userId;
    filter.workspace_id = { [Op.is]: null };
  }

  if (status) {
    filter.status = status;
  }

  if (job_type) {
    filter.job_type = job_type;
  }

  if (location) {
    filter.location = { [Op.like]: `%${location}%` };
  }

  if (company) {
    filter.company_name = { [Op.like]: `%${company}%` };
  }

  if (application_source) {
    filter.application_source = application_source;
  }

  if (priority) {
    filter.priority = priority;
  }

  const dateRange = buildDateRangeFilter(date_from, date_to);
  if (dateRange) {
    filter.applied_at = dateRange;
  }

  if (search) {
    filter[Op.or] = [
      { company_name: { [Op.like]: `%${search}%` } },
      { job_title: { [Op.like]: `%${search}%` } }
    ];
  }

  const advancedFilter = buildAdvancedQueryFilter(query_builder);
  if (advancedFilter) {
    const existingAnd = Array.isArray(filter[Op.and]) ? filter[Op.and] : [];
    filter[Op.and] = [...existingAnd, advancedFilter];
  }

  if (cursor) {
    filter.createdAt = {
      ...(filter.createdAt || {}),
      [Op.lt]: new Date(cursor)
    };
  }

  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));

  const jobs = await JobApplication.findAll({
    where: filter,
    attributes: [
      "id",
      "user_id",
      "company_id",
      "company_name",
      "job_title",
      "status",
      "application_source",
      "priority",
      "is_duplicate",
      "duplicate_of_job_id",
      "location",
      "job_type",
      "salary_range",
      "workspace_id",
      "applied_at",
      "createdAt",
      "updatedAt"
    ],
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"]
      }
    ],
    order: [["createdAt", "DESC"]],
    limit: safeLimit
  });

  return {
    data: jobs,
    nextCursor: jobs.length ? jobs[jobs.length - 1].createdAt : null
  };
};

export const getJobByIdService = async (id, actor) => {
  const job = await JobApplication.findOne({
    where: { id },
    include: [
      {
        model: JobStatusHistory,
        attributes: ["id", "from_status", "to_status", "changed_at"]
      },
      {
        model: Interview,
        attributes: ["id", "scheduled_at", "status", "outcome", "location_type"]
      },
      {
        model: Document,
        attributes: ["id", "original_name", "file_type", "version", "createdAt"]
      },
      {
        model: Workspace,
        attributes: ["id", "name"]
      },
      {
        model: Company,
        attributes: ["id", "name", "location", "website"]
      },
      {
        model: User,
        attributes: ["id", "name", "email"]
      }
    ],
    order: [[JobStatusHistory, "changed_at", "ASC"]]
  });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  await assertJobAccess(job, actor);

  const collaboration = await buildCollaborationPayload(job, actor);
  job.setDataValue("internal_notes", collaboration.internalNotes);
  job.setDataValue("activity_feed", collaboration.activityFeed);
  job.setDataValue("comments", collaboration.comments);
  job.setDataValue("workspace_role", collaboration.workspaceRole);
  job.setDataValue("can_write", collaboration.canWrite);

  return job;
};

export const updateJobService = async (id, userId, data, actor) => {
  return withRetryTransaction(async (transaction) => {
    const job = await JobApplication.findOne({
      where: { id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!job) {
      throw new AppError("Job not found", 404);
    }

    await assertJobAccess(job, actor);
    await assertJobWriteAccess(job, actor);

    const payload = { ...data };
    delete payload.workspace_id;
    delete payload.allow_duplicate;

    if (Object.prototype.hasOwnProperty.call(payload, "company_id")) {
      const nextCompanyId = payload.company_id ? Number(payload.company_id) : null;
      if (payload.company_id && (!Number.isInteger(nextCompanyId) || nextCompanyId <= 0)) {
        throw new AppError("company_id must be a positive integer", 400);
      }
      payload.company_id = nextCompanyId;

      if (nextCompanyId) {
        const company = await assertCompanyScopeForJob({
          companyId: nextCompanyId,
          workspaceId: job.workspace_id || null,
          actor
        });
        payload.company_name = company.name;
      }
    }

    if (payload.company_name !== undefined) {
      payload.company_name = String(payload.company_name || "").trim();
      if (!payload.company_name) {
        throw new AppError("company_name is required", 400);
      }
    }

    if (payload.application_source !== undefined) {
      payload.application_source = normalizeSource(payload.application_source);
    }

    if (payload.priority !== undefined) {
      payload.priority = normalizePriority(payload.priority);
    }

    const nextCompanyName = payload.company_name !== undefined ? payload.company_name : job.company_name;
    const nextJobTitle = payload.job_title !== undefined ? payload.job_title : job.job_title;
    const duplicate = await findDuplicateJob({
      actorId: actor.id,
      companyName: nextCompanyName,
      jobTitle: nextJobTitle,
      workspaceId: job.workspace_id || null,
      excludeId: job.id,
      transaction
    });

    if (duplicate && !Boolean(data.allow_duplicate)) {
      throw new AppError(
        `Duplicate application detected (Job #${duplicate.id}) for same company and title. Use allow_duplicate=true to save anyway.`,
        409
      );
    }

    payload.is_duplicate = Boolean(duplicate);
    payload.duplicate_of_job_id = duplicate?.id || null;

    const previousStatus = job.status;
    await job.update(payload, { transaction, actorId: actor.id });
    const statusChanged = job.status !== previousStatus;

    if (statusChanged) {
      const activityFeed = appendActivityEntry(
        job.activity_feed,
        buildActivityEntry({
          actor,
          type: "STATUS_CHANGED",
          message: `${previousStatus} -> ${job.status}`,
          visibility: "public",
          metadata: {
            previousStatus,
            status: job.status
          }
        })
      );

      await job.update(
        { activity_feed: activityFeed },
        { transaction, hooks: false }
      );
    }

    await logAction(
      {
        userId: actor.id,
        role: actor.role,
        action: "UPDATE_JOB",
        resource: "JobApplication",
        resourceId: id
      },
      transaction
    );

    return {
      job,
      previousStatus,
      statusChanged
    };
  });
};

export const shareJobToWorkspaceService = async (jobId, workspaceId, actor) => {
  const targetWorkspaceId = Number(workspaceId);
  if (!Number.isInteger(targetWorkspaceId) || targetWorkspaceId <= 0) {
    throw new AppError("workspace_id must be a positive integer", 400);
  }

  return withRetryTransaction(async (transaction) => {
    const job = await JobApplication.findOne({
      where: { id: jobId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!job) {
      throw new AppError("Job not found", 404);
    }

    await assertJobAccess(job, actor);
    await assertJobWriteAccess(job, actor);

    const targetMembership = await getWorkspaceMembership(targetWorkspaceId, actor);
    if (!targetMembership) {
      throw new AppError("Access denied to target workspace", 403);
    }

    if (targetMembership.role === "viewer" && !isSuperAdminRole(actor.role)) {
      throw new AppError("Viewer role cannot share jobs", 403);
    }

    const previousWorkspaceId = job.workspace_id || null;
    if (previousWorkspaceId === targetWorkspaceId) {
      return job;
    }

    if (job.company_id) {
      await assertCompanyScopeForJob({
        companyId: job.company_id,
        workspaceId: targetWorkspaceId,
        actor
      });
    }

    const activityFeed = appendActivityEntry(
      job.activity_feed,
      buildActivityEntry({
        actor,
        type: "SHARED_TO_WORKSPACE",
        message: previousWorkspaceId
          ? `Moved from workspace ${previousWorkspaceId} to ${targetWorkspaceId}`
          : `Shared to workspace ${targetWorkspaceId}`,
        visibility: "public",
        metadata: {
          previousWorkspaceId,
          workspaceId: targetWorkspaceId
        }
      })
    );

    await job.update({
      workspace_id: targetWorkspaceId,
      activity_feed: activityFeed
    }, { transaction, actorId: actor.id });

    await logAction(
      {
        userId: actor.id,
        role: actor.role,
        action: "SHARE_JOB_WORKSPACE",
        resource: "JobApplication",
        resourceId: job.id
      },
      transaction
    );

    return {
      job,
      previousWorkspaceId
    };
  });
};

export const getJobCollaborationService = async (jobId, actor) => {
  const job = await JobApplication.findOne({
    where: { id: jobId },
    attributes: ["id", "user_id", "workspace_id", "internal_notes", "activity_feed"]
  });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  await assertJobAccess(job, actor);
  return buildCollaborationPayload(job, actor);
};

export const addJobCommentService = async (jobId, actor, payload) => {
  const message = (payload?.message || "").toString().trim();
  if (!message) {
    throw new AppError("Comment message is required", 400);
  }

  const visibility = normalizeVisibility(payload?.visibility, "public");

  return withRetryTransaction(async (transaction) => {
    const job = await JobApplication.findOne({
      where: { id: jobId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!job) {
      throw new AppError("Job not found", 404);
    }

    await assertJobAccess(job, actor);
    await assertJobWriteAccess(job, actor);

    const activityFeed = appendActivityEntry(
      job.activity_feed,
      buildActivityEntry({
        actor,
        type: "COMMENT",
        message,
        visibility,
        metadata: {
          scope: "job-comment"
        }
      })
    );

    await job.update({ activity_feed: activityFeed }, { transaction, hooks: false });

    await logAction(
      {
        userId: actor.id,
        role: actor.role,
        action: "ADD_JOB_COMMENT",
        resource: "JobApplication",
        resourceId: job.id
      },
      transaction
    );

    return buildCollaborationPayload(job, actor);
  });
};

export const addJobInternalNoteService = async (jobId, actor, payload) => {
  const message = (payload?.message || "").toString().trim();
  if (!message) {
    throw new AppError("Note message is required", 400);
  }

  const visibility = normalizeVisibility(payload?.visibility, "private");

  return withRetryTransaction(async (transaction) => {
    const job = await JobApplication.findOne({
      where: { id: jobId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!job) {
      throw new AppError("Job not found", 404);
    }

    await assertJobAccess(job, actor);
    await assertJobWriteAccess(job, actor);

    const notes = safeArray(job.internal_notes);
    const noteEntry = {
      id: createEntryId(),
      message,
      visibility,
      user_id: actor.id,
      user_name: actor.name || actor.email || `User-${actor.id}`,
      createdAt: new Date().toISOString()
    };
    const nextNotes = [...notes, noteEntry].slice(-MAX_NOTES);

    const activityFeed = appendActivityEntry(
      job.activity_feed,
      buildActivityEntry({
        actor,
        type: "NOTE_ADDED",
        message: visibility === "private" ? "Private note added" : message,
        visibility,
        metadata: {
          scope: "internal-note",
          noteId: noteEntry.id
        }
      })
    );

    await job.update(
      {
        internal_notes: nextNotes,
        activity_feed: activityFeed
      },
      { transaction, hooks: false }
    );

    await logAction(
      {
        userId: actor.id,
        role: actor.role,
        action: "ADD_JOB_INTERNAL_NOTE",
        resource: "JobApplication",
        resourceId: job.id
      },
      transaction
    );

    return buildCollaborationPayload(job, actor);
  });
};

export const deleteJobService = async (id, userId, actor) => {
  const transaction = await sequelize.transaction();

  try {
    const job = await JobApplication.findOne({
      where: { id },
      transaction
    });

    if (!job) {
      throw new AppError("Job not found", 404);
    }

    await assertJobAccess(job, actor);
    await assertJobWriteAccess(job, actor);

    await job.destroy({ transaction });

    await logAction(
      {
        userId: actor.id,
        role: actor.role,
        action: "DELETE_JOB",
        resource: "JobApplication",
        resourceId: id
      },
      transaction
    );

    const workspaceId = job.workspace_id || null;

    await transaction.commit();

    return { message: "Job deleted successfully", workspaceId };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const getJobStatsService = async (actor, options = {}) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  const { workspaceId = null } = options;
  const where = {};

  if (workspaceId) {
    const member = await isWorkspaceMember(workspaceId, actor);
    if (!member) {
      throw new AppError("Access denied to workspace", 403);
    }
    where.workspace_id = workspaceId;
  } else {
    where.user_id = userId;
    where.workspace_id = { [Op.is]: null };
  }

  const rows = await JobApplication.findAll({
    attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
    where,
    group: ["status"],
    raw: true
  });

  const statuses = [
    "Applied",
    "Screening",
    "Interviewing",
    "Technical Test",
    "Final Round",
    "Rejected",
    "Offer",
    "Hired"
  ];

  const stats = Object.fromEntries(statuses.map((item) => [item, 0]));

  for (const row of rows) {
    stats[row.status] = Number(row.count);
  }

  return stats;
};

const parseCompensation = (input) => {
  const source = String(input || "").trim();
  if (!source) {
    return null;
  }

  const values = source.match(/\d+(\.\d+)?/g);
  if (!values || !values.length) {
    return null;
  }

  const parsed = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!parsed.length) {
    return null;
  }

  if (parsed.length === 1) {
    return parsed[0];
  }

  return Number(((parsed[0] + parsed[parsed.length - 1]) / 2).toFixed(2));
};

export const getOfferComparisonService = async (actor, query = {}) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }
  const workspaceId = Number(query.workspace_id);
  const hasWorkspace = Number.isInteger(workspaceId) && workspaceId > 0;
  const includeHiredOnly = query.hired_only === "true";

  const where = {};
  if (hasWorkspace) {
    const member = await isWorkspaceMember(workspaceId, actor);
    if (!member) {
      throw new AppError("Access denied to workspace", 403);
    }
    where.workspace_id = workspaceId;
  } else {
    where.user_id = userId;
    where.workspace_id = { [Op.is]: null };
  }

  where.status = includeHiredOnly
    ? "Hired"
    : { [Op.in]: ["Offer", "Hired"] };

  const jobs = await JobApplication.findAll({
    where,
    attributes: [
      "id",
      "company_name",
      "job_title",
      "status",
      "salary_range",
      "location",
      "job_type",
      "updatedAt"
    ],
    order: [["updatedAt", "DESC"]]
  });

  const offers = jobs.map((job) => {
    const estimatedValue = parseCompensation(job.salary_range);
    return {
      ...job.toJSON(),
      estimated_compensation_value: estimatedValue
    };
  });

  const comparable = offers
    .filter((offer) => Number.isFinite(offer.estimated_compensation_value))
    .sort((a, b) => b.estimated_compensation_value - a.estimated_compensation_value);

  const highest = comparable[0] || null;
  const lowest = comparable[comparable.length - 1] || null;
  const average = comparable.length
    ? Number(
      (comparable.reduce((acc, offer) => acc + Number(offer.estimated_compensation_value || 0), 0) / comparable.length).toFixed(2)
    )
    : 0;

  const spread = highest && lowest && lowest.estimated_compensation_value > 0
    ? Number((((highest.estimated_compensation_value - lowest.estimated_compensation_value) / lowest.estimated_compensation_value) * 100).toFixed(2))
    : 0;

  return {
    totalOffers: offers.length,
    comparableOffers: comparable.length,
    averageCompensation: average,
    spreadPercentage: spread,
    highestOffer: highest,
    lowestOffer: lowest,
    offers
  };
};

export const getSavedFiltersService = async (userId, scope = "jobs") => {
  const normalizedScope = (scope || "jobs").toString().trim().toLowerCase();
  return SavedFilter.findAll({
    where: {
      user_id: userId,
      scope: normalizedScope
    },
    order: [
      ["is_default", "DESC"],
      ["updatedAt", "DESC"]
    ]
  });
};

export const createSavedFilterService = async (userId, payload) => {
  const normalized = normalizeSavedFilterPayload(payload);

  return sequelize.transaction(async (transaction) => {
    if (normalized.is_default) {
      await SavedFilter.update(
        { is_default: false },
        {
          where: {
            user_id: userId,
            scope: normalized.scope,
            is_default: true
          },
          transaction
        }
      );
    }

    const savedFilter = await SavedFilter.create(
      {
        user_id: userId,
        ...normalized
      },
      { transaction }
    );

    await logAction(
      {
        userId,
        role: "recruiter",
        action: "CREATE_SAVED_FILTER",
        resource: "SavedFilter",
        resourceId: savedFilter.id
      },
      transaction
    );

    return savedFilter;
  });
};

export const deleteSavedFilterService = async (userId, filterId) => {
  const savedFilter = await SavedFilter.findOne({
    where: {
      id: filterId,
      user_id: userId
    }
  });

  if (!savedFilter) {
    throw new AppError("Saved filter not found", 404);
  }

  await savedFilter.destroy();
  return { message: "Saved filter deleted successfully" };
};

export const bulkUpdateJobStatusService = async (actor, payload = {}) => {
  const ids = Array.isArray(payload.job_ids) ? payload.job_ids : [];
  const uniqueIds = [...new Set(ids.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))];
  const nextStatus = (payload.status || "").toString().trim();

  if (!uniqueIds.length) {
    throw new AppError("job_ids must contain at least one valid id", 400);
  }

  if (!nextStatus) {
    throw new AppError("status is required for bulk operation", 400);
  }

  if (uniqueIds.length > MAX_BULK_OPERATION_SIZE) {
    throw new AppError(`Bulk limit exceeded. Max ${MAX_BULK_OPERATION_SIZE} jobs per request`, 400);
  }

  return withRetryTransaction(async (transaction) => {
    const jobs = await JobApplication.findAll({
      where: { id: { [Op.in]: uniqueIds } },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const jobMap = new Map(jobs.map((job) => [job.id, job]));
    const updatedIds = [];
    const skipped = [];
    const workspaceIds = new Set();

    for (const requestedId of uniqueIds) {
      const job = jobMap.get(requestedId);
      if (!job) {
        skipped.push({ id: requestedId, reason: "Job not found" });
        continue;
      }

      try {
        await assertJobAccess(job, actor);
        await assertJobWriteAccess(job, actor);
      } catch (error) {
        skipped.push({ id: requestedId, reason: error.message });
        continue;
      }

      const previousStatus = job.status;
      if (previousStatus === nextStatus) {
        skipped.push({ id: requestedId, reason: "Already in target status" });
        continue;
      }

      const activityFeed = appendActivityEntry(
        job.activity_feed,
        buildActivityEntry({
          actor,
          type: "BULK_STATUS_CHANGED",
          message: `${previousStatus} -> ${nextStatus}`,
          visibility: "public",
          metadata: {
            previousStatus,
            status: nextStatus
          }
        })
      );

      await job.update(
        {
          status: nextStatus,
          activity_feed: activityFeed
        },
        { transaction, actorId: actor.id, hooks: true }
      );

      updatedIds.push(job.id);
      if (job.workspace_id) {
        workspaceIds.add(job.workspace_id);
      }
    }

    await logAction(
      {
        userId: actor.id,
        role: actor.role,
        action: "BULK_UPDATE_JOB_STATUS",
        resource: "JobApplication",
        resourceId: null
      },
      transaction
    );

    return {
      requested: uniqueIds.length,
      updated: updatedIds.length,
      updatedIds,
      skipped,
      workspaceIds: [...workspaceIds]
    };
  });
};
