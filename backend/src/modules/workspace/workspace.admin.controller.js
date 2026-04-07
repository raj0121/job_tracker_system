import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { assertPlanLimitService } from "../plan/plan.service.js";
import * as workspaceService from "./workspace.service.js";

const resolveWorkspaceId = (req) => {
  const rawId = req.query.workspace_id || req.body.workspace_id;
  const workspaceId = Number(rawId);

  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    throw new AppError("workspace_id is required", 400);
  }

  return workspaceId;
};

export const getWorkspaceUsers = asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const members = await workspaceService.getWorkspaceMembersService(workspaceId, req.user, req.query);
  return successResponse(res, members, "Workspace users fetched successfully");
});

export const inviteWorkspaceUser = asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!email) {
    throw new AppError("Email is required", 400);
  }

  await assertPlanLimitService(req.user, "workspaceMembers", { workspaceId });

  const member = await workspaceService.inviteToWorkspaceService(
    workspaceId,
    email,
    req.body.role,
    req.user
  );

  return successResponse(res, member, "Workspace user invited successfully", 201);
});
