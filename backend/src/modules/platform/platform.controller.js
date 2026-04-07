import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import * as adminService from "../admin/admin.service.js";
import * as platformService from "./platform.service.js";
import { listQueueJobsService } from "../queue/queue.service.js";

export const getPlatformDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getGlobalStatsService(req.user);
  return successResponse(res, stats, "Platform dashboard stats fetched successfully");
});

export const getPlatformFeatureCenter = asyncHandler(async (req, res) => {
  const featureCenter = await adminService.getFeatureCenterService();
  return successResponse(res, featureCenter, "Platform feature center fetched successfully");
});

export const getPlatformUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getAllUsersService(req.user, req.query);
  return successResponse(res, users, "Platform users fetched successfully");
});

export const createPlatformUser = asyncHandler(async (req, res) => {
  const user = await adminService.createUserService(req.user, req.body);
  return successResponse(res, user, "User created successfully", 201);
});

export const updatePlatformUser = asyncHandler(async (req, res) => {
  const user = await adminService.updateUserService(req.user, req.params.userId, req.body);
  return successResponse(res, user, "User updated successfully");
});

export const deletePlatformUser = asyncHandler(async (req, res) => {
  const result = await adminService.deleteUserService(req.user, req.params.userId);
  return successResponse(res, result, "User deleted successfully");
});

export const getPlatformWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await adminService.getAllWorkspacesService(req.user);
  return successResponse(res, workspaces, "Platform workspaces fetched successfully");
});

export const createPlatformWorkspace = asyncHandler(async (req, res) => {
  const workspace = await platformService.createPlatformWorkspaceService(req.user, req.body);
  return successResponse(res, workspace, "Workspace created successfully", 201);
});

export const updatePlatformWorkspace = asyncHandler(async (req, res) => {
  const workspace = await adminService.updateWorkspaceService(req.user, req.params.workspaceId, req.body);
  return successResponse(res, workspace, "Workspace updated successfully");
});

export const deletePlatformWorkspace = asyncHandler(async (req, res) => {
  const result = await platformService.deletePlatformWorkspaceService(req.user, req.params.workspaceId);
  return successResponse(res, result, "Workspace deleted successfully");
});

export const getPlatformJobs = asyncHandler(async (req, res) => {
  const jobs = await adminService.getPlatformJobsService(req.user, req.query);
  return successResponse(res, jobs, "Platform jobs fetched successfully");
});

export const getPlatformQueueJobs = asyncHandler(async (req, res) => {
  const jobs = await listQueueJobsService(req.query);
  return successResponse(res, jobs, "Queue jobs fetched successfully");
});
