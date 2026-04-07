import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import { getJobAnalyticsService } from "../analytics/analytics.service.js";
import { invalidateTags } from "../../utils/cache.js";
import { createExportRequest } from "../report/export.service.js";
import { getFunnelAnalyticsService } from "../analytics/funnel.service.js";
import { getCareerTimelineService, getJobTimelineService } from "../analytics/timeline.service.js";
import { isWorkspaceMember } from "../workspace/workspace.service.js";
import { AppError } from "../../utils/AppError.js";
import { queueNotificationJob } from "../notification/notification.service.js";

import {
  addJobCommentService,
  addJobInternalNoteService,
  bulkUpdateJobStatusService,
  createSavedFilterService,
  createJobService,
  deleteSavedFilterService,
  deleteJobService,
  getAllJobsService,
  getJobCollaborationService,
  getJobByIdService,
  getSavedFiltersService,
  getJobStatsService,
  getOfferComparisonService,
  shareJobToWorkspaceService,
  updateJobService
} from "./job.service.js";

const parseWorkspaceId = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const assertWorkspaceAccess = async (workspaceId, actor) => {
  if (!workspaceId) {
    return null;
  }

  const member = await isWorkspaceMember(workspaceId, actor);
  if (!member) {
    throw new AppError("Access denied to workspace", 403);
  }

  return workspaceId;
};

const buildAnalyticsTags = (userId, workspaceIds = []) => {
  const tags = new Set([`analytics:user:${userId}`]);
  workspaceIds.filter(Boolean).forEach((id) => {
    tags.add(`analytics:workspace:${id}`);
  });
  return [...tags];
};

export const createJob = asyncHandler(async (req, res) => {
  const job = await createJobService(req.body, req.user);
  await invalidateTags(buildAnalyticsTags(req.user.id, [job.workspace_id]));
  return successResponse(res, job, "Job created successfully", 201);
});

export const getAllJobs = asyncHandler(async (req, res) => {
  const result = await getAllJobsService(req.user, req.query);
  return successResponse(res, result, "Jobs fetched successfully");
});

export const getJobById = asyncHandler(async (req, res) => {
  const job = await getJobByIdService(req.params.id, req.user);
  return successResponse(res, job, "Job fetched successfully");
});

export const getJobCollaboration = asyncHandler(async (req, res) => {
  const collaboration = await getJobCollaborationService(req.params.id, req.user);
  return successResponse(res, collaboration, "Job collaboration fetched successfully");
});

export const updateJob = asyncHandler(async (req, res) => {
  const updated = await updateJobService(req.params.id, req.user.id, req.body, req.user);

  if (updated.statusChanged) {
    await queueNotificationJob({
      userId: req.user.id,
      template: "STATUS_CHANGE_ALERT",
      data: {
        title: updated.job.job_title,
        company: updated.job.company_name,
        previousStatus: updated.previousStatus,
        status: updated.job.status
      },
      metadata: {
        source: "job-update",
        jobId: updated.job.id
      }
    });
  }

  await invalidateTags(buildAnalyticsTags(req.user.id, [updated.job.workspace_id]));

  return successResponse(res, updated.job, "Job updated successfully");
});

export const addJobComment = asyncHandler(async (req, res) => {
  const collaboration = await addJobCommentService(req.params.id, req.user, req.body);
  return successResponse(res, collaboration, "Comment added successfully", 201);
});

export const addJobInternalNote = asyncHandler(async (req, res) => {
  const collaboration = await addJobInternalNoteService(req.params.id, req.user, req.body);
  return successResponse(res, collaboration, "Internal note added successfully", 201);
});

export const shareJobToWorkspace = asyncHandler(async (req, res) => {
  const result = await shareJobToWorkspaceService(req.params.id, req.body.workspace_id, req.user);
  const workspaceIds = [result.job?.workspace_id, result.previousWorkspaceId].filter(Boolean);
  await invalidateTags(buildAnalyticsTags(req.user.id, workspaceIds));
  return successResponse(res, result.job, "Job shared to workspace successfully");
});

export const deleteJob = asyncHandler(async (req, res) => {
  const result = await deleteJobService(req.params.id, req.user.id, req.user);
  await invalidateTags(buildAnalyticsTags(req.user.id, [result.workspaceId]));

  return successResponse(res, null, "Job deleted successfully");
});

export const getJobStats = asyncHandler(async (req, res) => {
  const workspaceId = await assertWorkspaceAccess(parseWorkspaceId(req.query.workspace_id), req.user);
  const stats = await getJobStatsService(req.user, { workspaceId });
  return successResponse(res, stats, "Job statistics fetched successfully");
});

export const getOfferComparison = asyncHandler(async (req, res) => {
  const comparison = await getOfferComparisonService(req.user, req.query);
  return successResponse(res, comparison, "Offer comparison fetched successfully");
});

export const getJobAnalytics = asyncHandler(async (req, res) => {
  const months = Math.max(1, Math.min(24, parseInt(req.query.months, 10) || 6));
  const workspaceId = await assertWorkspaceAccess(parseWorkspaceId(req.query.workspace_id), req.user);
  const analytics = await getJobAnalyticsService(req.user.id, months, workspaceId);

  return successResponse(res, analytics, "Analytics generated successfully");
});

export const getFunnelAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getFunnelAnalyticsService(req.user.id);
  return successResponse(res, analytics, "Funnel analytics generated");
});

export const getJobTimeline = asyncHandler(async (req, res) => {
  const timeline = await getJobTimelineService(req.params.id, req.user);
  return successResponse(res, timeline, "Job timeline fetched successfully");
});

export const getCareerTimeline = asyncHandler(async (req, res) => {
  const workspaceId = await assertWorkspaceAccess(parseWorkspaceId(req.query.workspace_id), req.user);
  const timeline = await getCareerTimelineService(req.user, {
    ...req.query,
    workspaceId
  });

  return successResponse(res, timeline, "Career timeline fetched successfully");
});

export const exportJobs = asyncHandler(async (req, res) => {
  const queueJob = await createExportRequest(req.user.id);

  return res.status(202).json({
    success: true,
    message: "Export job queued. You can track status from reports module.",
    data: { jobId: queueJob.id }
  });
});

export const requestExport = exportJobs;

export const getSavedFilters = asyncHandler(async (req, res) => {
  const filters = await getSavedFiltersService(req.user.id, req.query.scope || "jobs");
  return successResponse(res, filters, "Saved filters fetched successfully");
});

export const createSavedFilter = asyncHandler(async (req, res) => {
  const filter = await createSavedFilterService(req.user.id, req.body);
  return successResponse(res, filter, "Saved filter created successfully", 201);
});

export const deleteSavedFilter = asyncHandler(async (req, res) => {
  await deleteSavedFilterService(req.user.id, req.params.filterId);
  return successResponse(res, null, "Saved filter deleted successfully");
});

export const bulkUpdateJobStatus = asyncHandler(async (req, res) => {
  const result = await bulkUpdateJobStatusService(req.user, req.body);
  await invalidateTags(buildAnalyticsTags(req.user.id, result.workspaceIds || []));
  return successResponse(res, result, "Bulk job status operation completed");
});
