import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import {
  changePasswordService,
  getMeService,
  updateAvatarService,
  updateMeService
} from "./user.service.js";

export const getMe = asyncHandler(async (req, res) => {
  const profile = await getMeService(req.user.id);
  return successResponse(res, profile, "Profile fetched successfully");
});

export const updateMe = asyncHandler(async (req, res) => {
  const profile = await updateMeService(req.user.id, req.body);
  return successResponse(res, profile, "Profile updated successfully");
});

export const updateAvatar = asyncHandler(async (req, res) => {
  const profile = await updateAvatarService(req.user.id, req.file);
  return successResponse(res, profile, "Profile image updated successfully");
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await changePasswordService(req.user.id, req.body);
  return successResponse(res, result, "Password updated successfully");
});
