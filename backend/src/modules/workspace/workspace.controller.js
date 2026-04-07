import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import * as workspaceService from "./workspace.service.js";
import { assertPlanLimitService } from "../plan/plan.service.js";

export const createWorkspace = asyncHandler(async (req, res) => {
  await assertPlanLimitService(req.user, "workspaces");

  const workspace = await workspaceService.createWorkspaceService(
    req.user,
    req.body
  );

  return successResponse(res, workspace, "Workspace created successfully", 201);
});

export const getMyWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await workspaceService.getUserWorkspacesService(req.user);
  return successResponse(res, workspaces, "Workspaces fetched successfully");
});

export const inviteMember = asyncHandler(async (req, res) => {
  await assertPlanLimitService(req.user, "workspaceMembers", { workspaceId: req.params.id });

  const member = await workspaceService.inviteToWorkspaceService(
    req.params.id,
    req.body.email,
    req.body.role,
    req.user
  );

  return successResponse(res, member, "Member invited successfully", 201);
});

export const getMembers = asyncHandler(async (req, res) => {
  const members = await workspaceService.getWorkspaceMembersService(req.params.id, req.user);
  return successResponse(res, members, "Workspace members fetched successfully");
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const member = await workspaceService.updateWorkspaceMemberRoleService(
    req.params.id,
    req.params.memberId,
    req.body.role,
    req.user
  );

  return successResponse(res, member, "Workspace member role updated successfully");
});
