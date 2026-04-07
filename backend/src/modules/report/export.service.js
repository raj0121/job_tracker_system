import fs from "fs";
import path from "path";
import * as fastcsv from "fast-csv";
import { Op } from "sequelize";
import { JobApplication, QueueJob, ScheduledReport } from "../../models/index.js";
import logger from "../../utils/logger.js";
import { AppError } from "../../utils/AppError.js";
import { addToQueue } from "../queue/queue.service.js";
import { isSuperAdminRole } from "../../utils/role.js";

const EXPORTS_DIR = path.resolve("exports");

const REPORT_TEMPLATES = [
  {
    key: "pipeline-health",
    name: "Pipeline Health",
    description: "Active pipeline states with priority and source details.",
    filter_definition: {
      status: ["Applied", "Screening", "Interviewing", "Technical Test", "Final Round"]
    },
    include_all_users: false,
    admin_only: false
  },
  {
    key: "offer-readiness",
    name: "Offer Readiness",
    description: "Interview-heavy opportunities close to offer stage.",
    filter_definition: {
      status: ["Interviewing", "Technical Test", "Final Round", "Offer"]
    },
    include_all_users: false,
    admin_only: false
  },
  {
    key: "duplicate-audit",
    name: "Duplicate Audit",
    description: "Detect duplicate records and source quality concerns.",
    filter_definition: {
      is_duplicate: true
    },
    include_all_users: false,
    admin_only: false
  },
  {
    key: "enterprise-overview",
    name: "Enterprise Overview",
    description: "Cross-user export for leadership reporting.",
    filter_definition: {},
    include_all_users: true,
    admin_only: true
  }
];

if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

const writeCsv = (rows, filePath) => {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(filePath);

    ws.on("finish", resolve);
    ws.on("error", reject);

    fastcsv.write(rows, { headers: true }).pipe(ws);
  });
};

const parseQueuePayload = (value) => {
  if (value === null || value === undefined) {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  if (typeof value !== "string") {
    return {};
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      try {
        const nested = JSON.parse(parsed);
        return typeof nested === "object" && nested !== null ? nested : {};
      } catch {
        return {};
      }
    }

    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const sanitizeRecipients = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (item || "").toString().trim().toLowerCase())
    .filter((item) => item && item.includes("@"));
};

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }
  }

  return null;
};

const normalizeStatusFilter = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (!value) {
    return [];
  }

  return [String(value).trim()].filter(Boolean);
};

const normalizeFilterDefinition = (definition = {}) => {
  const source = typeof definition === "object" && definition !== null ? definition : {};
  const statusList = normalizeStatusFilter(source.status);
  const parsedWorkspaceId = Number(source.workspace_id || source.workspaceId || 0);
  const duplicateFlag = normalizeBoolean(source.is_duplicate);

  return {
    ...source,
    status: statusList.length ? statusList : undefined,
    workspace_id: Number.isInteger(parsedWorkspaceId) && parsedWorkspaceId > 0 ? parsedWorkspaceId : undefined,
    is_duplicate: duplicateFlag === null ? undefined : duplicateFlag
  };
};

const sanitizeScheduledReportPayload = (payload = {}) => {
  const name = (payload.name || "").toString().trim();
  if (!name) {
    throw new AppError("Scheduled report name is required", 400);
  }

  const frequency = (payload.frequency || "weekly").toString().trim().toLowerCase();
  if (!["daily", "weekly", "monthly"].includes(frequency)) {
    throw new AppError("Invalid report frequency", 400);
  }

  const recipients = sanitizeRecipients(payload.recipients || []);
  const filterDefinition = normalizeFilterDefinition(payload.filter_definition || {});

  return {
    name,
    frequency,
    recipients,
    filter_definition: filterDefinition,
    include_all_users: Boolean(payload.include_all_users),
    is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true
  };
};

const getFrequencyNextRun = (frequency, fromDate = new Date()) => {
  const source = new Date(fromDate);

  if (frequency === "daily") {
    source.setDate(source.getDate() + 1);
    return source;
  }

  if (frequency === "weekly") {
    source.setDate(source.getDate() + 7);
    return source;
  }

  source.setMonth(source.getMonth() + 1);
  return source;
};

const buildReportWhere = ({ userId, includeAllUsers = false, filterDefinition = {} }) => {
  const normalizedFilters = normalizeFilterDefinition(filterDefinition);
  const where = {};

  if (!includeAllUsers) {
    where.user_id = userId;
  }

  if (Array.isArray(normalizedFilters.status) && normalizedFilters.status.length) {
    where.status = normalizedFilters.status.length === 1
      ? normalizedFilters.status[0]
      : { [Op.in]: normalizedFilters.status };
  }

  if (normalizedFilters.location) {
    where.location = { [Op.like]: `%${normalizedFilters.location}%` };
  }

  if (normalizedFilters.job_type) {
    where.job_type = normalizedFilters.job_type;
  }

  if (normalizedFilters.priority) {
    where.priority = normalizedFilters.priority;
  }

  if (normalizedFilters.application_source) {
    where.application_source = normalizedFilters.application_source;
  }

  if (normalizedFilters.company) {
    where.company_name = { [Op.like]: `%${normalizedFilters.company}%` };
  }

  if (normalizedFilters.search) {
    where[Op.or] = [
      { company_name: { [Op.like]: `%${normalizedFilters.search}%` } },
      { job_title: { [Op.like]: `%${normalizedFilters.search}%` } }
    ];
  }

  if (normalizedFilters.workspace_id) {
    where.workspace_id = normalizedFilters.workspace_id;
  }

  if (normalizedFilters.is_duplicate !== undefined) {
    where.is_duplicate = normalizedFilters.is_duplicate;
  }

  if (normalizedFilters.date_from || normalizedFilters.date_to) {
    where.applied_at = {};

    if (normalizedFilters.date_from) {
      where.applied_at[Op.gte] = new Date(normalizedFilters.date_from);
    }

    if (normalizedFilters.date_to) {
      where.applied_at[Op.lte] = new Date(normalizedFilters.date_to);
    }
  }

  return where;
};

export const processExportJob = async (queueJob) => {
  if (queueJob.type !== "EXPORT_CSV" && queueJob.type !== "EXPORT_CSV_ADMIN") {
    return null;
  }

  const isAdminExport = queueJob.type === "EXPORT_CSV_ADMIN";
  const payload = parseQueuePayload(queueJob.payload);
  const requestedIncludeAllUsers = Boolean(payload.include_all_users || payload.includeAllUsers);
  const includeAllUsers = isAdminExport || requestedIncludeAllUsers;
  const where = buildReportWhere({
    userId: queueJob.user_id,
    includeAllUsers,
    filterDefinition: payload.filter_definition || payload.filterDefinition || {}
  });

  const rows = await JobApplication.findAll({
    where,
    attributes: [
      "id",
      "user_id",
      "company_name",
      "job_title",
      "application_source",
      "priority",
      "is_duplicate",
      "status",
      "location",
      "job_type",
      "salary_range",
      "applied_at",
      "createdAt"
    ],
    raw: true
  });

  const filePrefix = payload.filePrefix || payload.templateKey || queueJob.type.toLowerCase();
  const fileName = `${filePrefix}_${queueJob.user_id}_${Date.now()}.csv`;
  const filePath = path.join(EXPORTS_DIR, fileName);

  await writeCsv(rows, filePath);

  return {
    fileName,
    filePath,
    rows: rows.length,
    requestedAt: payload.requestedAt || new Date().toISOString(),
    templateKey: payload.templateKey || null,
    includeAllUsers
  };
};

export const createExportRequest = async (userId, options = {}) => {
  const normalizedFilters = normalizeFilterDefinition(options.filter_definition || options.filterDefinition || {});

  return addToQueue({
    userId,
    type: "EXPORT_CSV",
    payload: {
      requestedAt: new Date().toISOString(),
      source: "report-module",
      filePrefix: options.filePrefix || "export_csv",
      filter_definition: normalizedFilters
    },
    maxAttempts: 4
  });
};

export const createAdminExportRequest = async (adminUserId, options = {}) => {
  const normalizedFilters = normalizeFilterDefinition(options.filter_definition || options.filterDefinition || {});

  return addToQueue({
    userId: adminUserId,
    type: "EXPORT_CSV_ADMIN",
    payload: {
      requestedAt: new Date().toISOString(),
      source: "admin-report-module",
      filePrefix: options.filePrefix || "export_csv_admin",
      filter_definition: normalizedFilters,
      include_all_users: true
    },
    maxAttempts: 4
  });
};

export const createScheduledReportService = async (userId, payload) => {
  const normalized = sanitizeScheduledReportPayload(payload);

  return ScheduledReport.create({
    user_id: userId,
    ...normalized,
    next_run_at: getFrequencyNextRun(normalized.frequency)
  });
};

export const listScheduledReportsService = async (userId) => {
  return ScheduledReport.findAll({
    where: { user_id: userId },
    order: [["createdAt", "DESC"]]
  });
};

export const updateScheduledReportService = async (userId, reportId, payload) => {
  const report = await ScheduledReport.findOne({
    where: { id: reportId, user_id: userId }
  });

  if (!report) {
    throw new AppError("Scheduled report not found", 404);
  }

  const normalized = sanitizeScheduledReportPayload({
    ...report.toJSON(),
    ...payload
  });

  const nextRunAt = payload.frequency
    ? getFrequencyNextRun(normalized.frequency)
    : report.next_run_at;

  return report.update({
    ...normalized,
    next_run_at: nextRunAt
  });
};

export const deleteScheduledReportService = async (userId, reportId) => {
  const report = await ScheduledReport.findOne({
    where: { id: reportId, user_id: userId }
  });

  if (!report) {
    throw new AppError("Scheduled report not found", 404);
  }

  await report.destroy();
  return { message: "Scheduled report deleted successfully" };
};

export const enqueueScheduledReportRunService = async (userId, reportId) => {
  const report = await ScheduledReport.findOne({
    where: { id: reportId, user_id: userId }
  });

  if (!report) {
    throw new AppError("Scheduled report not found", 404);
  }

  return addToQueue({
    userId,
    type: "GENERATE_SCHEDULED_REPORT",
    payload: {
      reportId: report.id,
      trigger: "manual",
      requestedAt: new Date().toISOString()
    },
    maxAttempts: 4
  });
};

export const enqueueDueScheduledReportsService = async () => {
  const dueReports = await ScheduledReport.findAll({
    where: {
      is_active: true,
      next_run_at: { [Op.lte]: new Date() }
    },
    limit: 100
  });

  for (const report of dueReports) {
    await addToQueue({
      userId: report.user_id,
      type: "GENERATE_SCHEDULED_REPORT",
      payload: {
        reportId: report.id,
        trigger: "scheduler",
        requestedAt: new Date().toISOString()
      },
      maxAttempts: 4
    });

    await report.update({
      next_run_at: getFrequencyNextRun(report.frequency, report.next_run_at || new Date()),
      last_run_at: new Date()
    });
  }

  return dueReports.length;
};

export const processScheduledReportJob = async (queueJob) => {
  if (queueJob.type !== "GENERATE_SCHEDULED_REPORT") {
    return null;
  }

  const payload = parseQueuePayload(queueJob.payload);
  const reportId = Number(
    payload.reportId
    || payload.report_id
    || payload.scheduledReportId
    || payload.scheduled_report_id
  );
  if (!Number.isInteger(reportId) || reportId <= 0) {
    throw new AppError("Scheduled report id missing in queue payload", 400);
  }

  const report = await ScheduledReport.findByPk(reportId);
  if (!report) {
    throw new AppError("Scheduled report no longer exists", 404);
  }

  const where = buildReportWhere({
    userId: report.user_id,
    includeAllUsers: report.include_all_users,
    filterDefinition: report.filter_definition || {}
  });

  const rows = await JobApplication.findAll({
    where,
    attributes: [
      "id",
      "user_id",
      "company_name",
      "job_title",
      "application_source",
      "priority",
      "is_duplicate",
      "status",
      "location",
      "job_type",
      "salary_range",
      "applied_at",
      "createdAt"
    ],
    raw: true
  });

  const fileName = `scheduled_report_${report.id}_${Date.now()}.csv`;
  const filePath = path.join(EXPORTS_DIR, fileName);
  await writeCsv(rows, filePath);

  await report.update({
    last_run_at: new Date(),
    next_run_at: getFrequencyNextRun(report.frequency)
  });

  return {
    reportId: report.id,
    reportName: report.name,
    recipients: report.recipients || [],
    fileName,
    filePath,
    rows: rows.length,
    requestedAt: payload.requestedAt || new Date().toISOString()
  };
};

export const listReportTemplatesService = (role) => {
  const isSuperAdmin = isSuperAdminRole(role);

  return REPORT_TEMPLATES
    .filter((item) => !item.admin_only || isSuperAdmin)
    .map((item) => ({
      key: item.key,
      name: item.name,
      description: item.description,
      include_all_users: item.include_all_users,
      admin_only: item.admin_only,
      filter_definition: item.filter_definition
    }));
};

export const runReportTemplateService = async (user, payload = {}) => {
  const templateKey = String(payload.templateKey || payload.template_key || "").trim().toLowerCase();
  if (!templateKey) {
    throw new AppError("Template key is required", 400);
  }

  const template = REPORT_TEMPLATES.find((item) => item.key === templateKey);
  if (!template) {
    throw new AppError("Report template not found", 404);
  }

  const isSuperAdmin = isSuperAdminRole(user?.role);
  if (template.admin_only && !isSuperAdmin) {
    throw new AppError("Only superadmin users can run this report template", 403);
  }

  const overrideFilters = normalizeFilterDefinition(payload.filter_definition || payload.filterDefinition || {});
  const mergedFilterDefinition = normalizeFilterDefinition({
    ...(template.filter_definition || {}),
    ...overrideFilters
  });

  const includeAllUsers = Boolean(template.include_all_users && isSuperAdmin);

  const queueJob = await addToQueue({
    userId: user.id,
    type: includeAllUsers ? "EXPORT_CSV_ADMIN" : "EXPORT_CSV",
    payload: {
      requestedAt: new Date().toISOString(),
      source: "report-template",
      templateKey: template.key,
      templateName: template.name,
      filePrefix: `template_${template.key.replaceAll("-", "_")}`,
      include_all_users: includeAllUsers,
      filter_definition: mergedFilterDefinition
    },
    maxAttempts: 4
  });

  return {
    jobId: queueJob.id,
    template: {
      key: template.key,
      name: template.name,
      include_all_users: includeAllUsers,
      filter_definition: mergedFilterDefinition
    }
  };
};

export const listReportHistoryService = async (user, options = {}) => {
  const limit = Math.max(10, Math.min(200, Number(options.limit) || 50));
  const scope = String(options.scope || "").trim().toLowerCase();
  const includeAllUsers = isSuperAdminRole(user?.role) && scope === "all";

  const where = {
    type: {
      [Op.in]: ["EXPORT_CSV", "EXPORT_CSV_ADMIN", "GENERATE_SCHEDULED_REPORT"]
    }
  };

  if (!includeAllUsers) {
    where.user_id = user.id;
  }

  if (options.status) {
    where.status = String(options.status).trim().toUpperCase();
  }

  const rows = await QueueJob.findAll({
    where,
    attributes: [
      "id",
      "user_id",
      "type",
      "status",
      "attempts",
      "max_attempts",
      "scheduled_for",
      "error_message",
      "payload",
      "result",
      "createdAt",
      "updatedAt"
    ],
    order: [["createdAt", "DESC"]],
    limit
  });

  return rows.map((row) => {
    const payload = parseQueuePayload(row.payload);
    const result = row.result || {};

    return {
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      status: row.status,
      attempts: row.attempts,
      max_attempts: row.max_attempts,
      scheduled_for: row.scheduled_for,
      error_message: row.error_message,
      template_key: payload.templateKey || null,
      template_name: payload.templateName || null,
      report_id: payload.reportId || payload.report_id || null,
      rows: result.rows || 0,
      fileName: result.fileName || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  });
};

export const getExportDownloadPayload = async (jobId, userId, allowAdmin = false) => {
  const where = allowAdmin ? { id: jobId } : { id: jobId, user_id: userId };

  const job = await QueueJob.findOne({ where });
  if (!job) {
    throw new AppError("Export job not found", 404);
  }

  if (job.status !== "COMPLETED" || !job.result?.filePath) {
    throw new AppError("Export is not ready yet", 409);
  }

  if (!fs.existsSync(job.result.filePath)) {
    logger.warn({ message: "Export file missing", jobId });
    throw new AppError("Export file no longer exists", 410);
  }

  return {
    filePath: job.result.filePath,
    fileName: job.result.fileName
  };
};
