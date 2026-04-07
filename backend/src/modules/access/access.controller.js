import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import {
  createPermissionService,
  createRoleService,
  deletePermissionService,
  deleteRoleService,
  listPermissionsService,
  listRolesService,
  updatePermissionService,
  updateRoleService
} from "./access.service.js";

export const getRoles = asyncHandler(async (_req, res) => {
  const rows = await listRolesService();
  return successResponse(res, rows, "Roles fetched successfully");
});

export const createRole = asyncHandler(async (req, res) => {
  const row = await createRoleService(req.body);
  return successResponse(res, row, "Role created successfully", 201);
});

export const updateRole = asyncHandler(async (req, res) => {
  const row = await updateRoleService(req.params.roleId, req.body);
  return successResponse(res, row, "Role updated successfully");
});

export const deleteRole = asyncHandler(async (req, res) => {
  const row = await deleteRoleService(req.params.roleId);
  return successResponse(res, row, "Role deleted successfully");
});

export const getPermissions = asyncHandler(async (req, res) => {
  const rows = await listPermissionsService(req.query);
  return successResponse(res, rows, "Permissions fetched successfully");
});

export const createPermission = asyncHandler(async (req, res) => {
  const row = await createPermissionService(req.body);
  return successResponse(res, row, "Permission created successfully", 201);
});

export const updatePermission = asyncHandler(async (req, res) => {
  const row = await updatePermissionService(req.params.permissionId, req.body);
  return successResponse(res, row, "Permission updated successfully");
});

export const deletePermission = asyncHandler(async (req, res) => {
  const row = await deletePermissionService(req.params.permissionId);
  return successResponse(res, row, "Permission deleted successfully");
});
