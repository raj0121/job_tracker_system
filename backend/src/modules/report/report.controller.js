import { asyncHandler } from "../../utils/asyncHandler.js";
import { QueueJob } from "../../models/index.js";
import {
  createAdminExportRequest,
  createExportRequest,
  createScheduledReportService,
  deleteScheduledReportService,
  enqueueScheduledReportRunService,
  getExportDownloadPayload,
  listReportHistoryService,
  listReportTemplatesService,
  listScheduledReportsService,
  runReportTemplateService,
  updateScheduledReportService
} from "./export.service.js";
import { AppError } from "../../utils/AppError.js";
import { assertPlanLimitService } from "../plan/plan.service.js";
import { getYearlyReportService } from "./yearly-report.service.js";

const resolveExportStatus = async ({ jobId, userId, allowAdmin = false }) => {
  const where = allowAdmin
    ? { id: jobId }
    : { id: jobId, user_id: userId };

  const job = await QueueJob.findOne({ where });
  if (!job) {
    throw new AppError("Export job not found", 404);
  }

  return {
    status: job.status,
    result: job.result,
    error: job.error_message,
    attempts: job.attempts,
    scheduled_for: job.scheduled_for
  };
};

export const requestExport = asyncHandler(async (req, res) => {
  await assertPlanLimitService(req.user, "dailyExports");
  const job = await createExportRequest(req.user.id, req.body || {});

  res.status(202).json({
    success: true,
    message: "Export request received and queued.",
    data: { jobId: job.id }
  });
});

export const requestAdminExport = asyncHandler(async (req, res) => {
  await assertPlanLimitService(req.user, "dailyExports");
  const job = await createAdminExportRequest(req.user.id, req.body || {});

  res.status(202).json({
    success: true,
    message: "Aggregate export queued.",
    data: { jobId: job.id }
  });
});

export const getExportStatus = asyncHandler(async (req, res) => {
  const data = await resolveExportStatus({
    jobId: req.params.id,
    userId: req.user.id,
    allowAdmin: false
  });

  res.json({
    success: true,
    data
  });
});

export const getAdminExportStatus = asyncHandler(async (req, res) => {
  const data = await resolveExportStatus({
    jobId: req.params.id,
    userId: req.user.id,
    allowAdmin: true
  });

  res.json({
    success: true,
    data
  });
});

export const downloadExport = asyncHandler(async (req, res) => {
  const { filePath, fileName } = await getExportDownloadPayload(req.params.id, req.user.id);
  return res.download(filePath, fileName);
});

export const downloadAdminExport = asyncHandler(async (req, res) => {
  const { filePath, fileName } = await getExportDownloadPayload(req.params.id, req.user.id, true);
  return res.download(filePath, fileName);
});

export const createScheduledReport = asyncHandler(async (req, res) => {
  await assertPlanLimitService(req.user, "scheduledReports");
  const report = await createScheduledReportService(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: "Scheduled report created successfully.",
    data: report
  });
});

export const listScheduledReports = asyncHandler(async (req, res) => {
  const reports = await listScheduledReportsService(req.user.id);

  res.json({
    success: true,
    data: reports
  });
});

export const updateScheduledReport = asyncHandler(async (req, res) => {
  const report = await updateScheduledReportService(req.user.id, req.params.id, req.body);

  res.json({
    success: true,
    message: "Scheduled report updated successfully.",
    data: report
  });
});

export const deleteScheduledReport = asyncHandler(async (req, res) => {
  await deleteScheduledReportService(req.user.id, req.params.id);

  res.json({
    success: true,
    message: "Scheduled report deleted successfully."
  });
});

export const runScheduledReportNow = asyncHandler(async (req, res) => {
  const queued = await enqueueScheduledReportRunService(req.user.id, req.params.id);

  res.status(202).json({
    success: true,
    message: "Scheduled report queued for immediate run.",
    data: { jobId: queued.id }
  });
});

export const getReportTemplates = asyncHandler(async (req, res) => {
  const templates = listReportTemplatesService(req.user.role);

  res.json({
    success: true,
    data: templates
  });
});

export const runReportTemplate = asyncHandler(async (req, res) => {
  await assertPlanLimitService(req.user, "dailyExports");
  const result = await runReportTemplateService(req.user, {
    ...req.body,
    templateKey: req.params.templateKey
  });

  res.status(202).json({
    success: true,
    message: "Template report queued successfully.",
    data: result
  });
});

export const getReportHistory = asyncHandler(async (req, res) => {
  const history = await listReportHistoryService(req.user, req.query || {});

  res.json({
    success: true,
    data: history
  });
});

export const getYearlyReport = asyncHandler(async (req, res) => {
  const report = await getYearlyReportService(req.user.id, req.query.year);

  res.json({
    success: true,
    data: report
  });
});
