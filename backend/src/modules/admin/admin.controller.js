import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/AppError.js";
import * as adminService from "./admin.service.js";
import { getAdminStateChangesService } from "../analytics/timeline.service.js";
import {
  listDeadLetterJobsService,
  retryDeadLetterJobService
} from "../queue/queue.service.js";
import { listNotificationTemplates } from "../notification/notification.service.js";
import {
  detectStaleJobsService,
  runAutomationRulesService
} from "../workflow/workflow.service.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getGlobalStatsService(req.user, req.query);
  return successResponse(res, stats, "Admin dashboard stats fetched successfully");
});

export const getEnterpriseOverview = asyncHandler(async (req, res) => {
  const overview = await adminService.getEnterpriseFlowService(req.user);
  return successResponse(res, overview, "Enterprise admin flow fetched successfully");
});

export const getFeatureCenter = asyncHandler(async (req, res) => {
  if (req.user?.role !== "superadmin") {
    throw new AppError("Superadmin access required", 403);
  }
  const featureCenter = await adminService.getFeatureCenterService();
  return successResponse(res, featureCenter, "Enterprise feature center fetched successfully");
});

export const getUsers = asyncHandler(async (req, res) => {
  if (req.user?.role !== "superadmin") {
    throw new AppError("Superadmin access required", 403);
  }
  const users = await adminService.getAllUsersService(req.user, req.query);
  return successResponse(res, users, "Users fetched successfully");
});

export const getWorkspaces = asyncHandler(async (req, res) => {
  if (req.user?.role !== "superadmin") {
    throw new AppError("Superadmin access required", 403);
  }
  const workspaces = await adminService.getAllWorkspacesService(req.user);
  return successResponse(res, workspaces, "Workspaces fetched successfully");
});

export const createUser = asyncHandler(async (req, res) => {
  if (req.user?.role !== "superadmin") {
    throw new AppError("Superadmin access required", 403);
  }
  const user = await adminService.createUserService(req.user, req.body);
  return successResponse(res, user, "User created successfully", 201);
});

export const updateUser = asyncHandler(async (req, res) => {
  if (req.user?.role !== "superadmin") {
    throw new AppError("Superadmin access required", 403);
  }
  const user = await adminService.updateUserService(req.user, req.params.userId, req.body);
  return successResponse(res, user, "User updated successfully");
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (req.user?.role !== "superadmin") {
    throw new AppError("Superadmin access required", 403);
  }
  const result = await adminService.deleteUserService(req.user, req.params.userId);
  return successResponse(res, result, "User deleted successfully");
});

export const updateWorkspace = asyncHandler(async (req, res) => {
  if (req.user?.role !== "superadmin") {
    throw new AppError("Superadmin access required", 403);
  }
  const workspace = await adminService.updateWorkspaceService(req.user, req.params.workspaceId, req.body);
  return successResponse(res, workspace, "Workspace updated successfully");
});

export const getAdminStateChanges = asyncHandler(async (req, res) => {
  const scope = await adminService.resolveAdminScope(req.user);
  const stateChanges = await getAdminStateChangesService(req.query, scope);
  return successResponse(res, stateChanges, "Admin state change feed fetched successfully");
});

export const getDeadLetterJobs = asyncHandler(async (req, res) => {
  if (req.user?.role !== "superadmin") {
    throw new AppError("Superadmin access required", 403);
  }
  const jobs = await listDeadLetterJobsService(req.query);
  return successResponse(res, jobs, "Dead-letter jobs fetched successfully");
});

export const retryDeadLetterJob = asyncHandler(async (req, res) => {
  if (req.user?.role !== "superadmin") {
    throw new AppError("Superadmin access required", 403);
  }
  const queueJob = await retryDeadLetterJobService(req.params.id, req.user?.id || null);
  return successResponse(res, queueJob, "Dead-letter job requeued successfully");
});

export const getNotificationTemplateCatalog = asyncHandler(async (req, res) => {
  if (req.user?.role !== "superadmin") {
    throw new AppError("Superadmin access required", 403);
  }
  const templates = listNotificationTemplates();
  return successResponse(res, templates, "Notification templates fetched successfully");
});

export const runWorkflowAutomationNow = asyncHandler(async (req, res) => {
  if (req.user?.role !== "superadmin") {
    throw new AppError("Superadmin access required", 403);
  }
  const [automation, staleJobs] = await Promise.all([
    runAutomationRulesService(),
    detectStaleJobsService()
  ]);

  return successResponse(
    res,
    {
      automation,
      staleJobsDetected: staleJobs,
      triggeredAt: new Date().toISOString()
    },
    "Workflow automation executed successfully"
  );
});
