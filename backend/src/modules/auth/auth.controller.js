import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import {
  getMyAuditTrailService,
  getActiveSessionsService,
  getLoginHistoryService,
  getPermissionsService,
  getProfileService,
  getSecuritySummaryService,
  loginService,
  logoutService,
  revokeSessionService,
  refreshTokenService,
  registerService,
  updateProfileService,
  updateProfileAvatarService
} from "./auth.service.js";
import { logAction } from "../audit/audit.service.js";
import { getPlanOverviewService } from "../plan/plan.service.js";
import { attachAuthCookies, authCookieNames, clearAuthCookies } from "../../utils/authCookies.js";

const stripTokensFromPayload = (payload) => {
  if (!payload) {
    return payload;
  }

  const { accessToken, refreshToken, ...rest } = payload;
  return rest;
};

export const register = asyncHandler(async (req, res) => {
  const user = await registerService(req.body);
  return successResponse(res, user, "User registered successfully", 201);
});

export const login = asyncHandler(async (req, res) => {
  const payload = await loginService({
    email: req.body.email,
    password: req.body.password,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    deviceFingerprint: req.body.device_fingerprint
  });

  await logAction({
    userId: payload.user.id,
    role: payload.user.role,
    action: "LOGIN_SUCCESS",
    resource: "User",
    resourceId: payload.user.id
  });

  attachAuthCookies(res, payload);

  return successResponse(res, stripTokensFromPayload(payload), "Login successful");
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const refreshToken = req.cookies?.[authCookieNames.refreshToken] || req.body.refreshToken;
    const payload = await refreshTokenService(refreshToken);

    attachAuthCookies(res, payload);

    return successResponse(res, stripTokensFromPayload(payload), "Token refreshed");
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[authCookieNames.refreshToken] || req.body.refreshToken;

  await logoutService({
    refreshToken,
    userId: req.user?.id
  });

  clearAuthCookies(res);

  if (req.user) {
    await logAction({
      userId: req.user.id,
      role: req.user.role,
      action: "LOGOUT",
      resource: "User",
      resourceId: req.user.id
    });
  }

  return successResponse(res, null, "Logged out successfully");
});

export const me = asyncHandler(async (req, res) => {
  const profile = await getProfileService(req.user.id);
  return successResponse(res, profile, "Profile fetched successfully");
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const profile = await updateProfileService(req.user.id, req.body);
  return successResponse(res, profile, "Profile updated successfully");
});

export const uploadMyAvatar = asyncHandler(async (req, res) => {
  const profile = await updateProfileAvatarService(req.user.id, req.file);
  return successResponse(res, profile, "Profile image updated successfully");
});

export const getMySessions = asyncHandler(async (req, res) => {
  const sessions = await getLoginHistoryService(req.user.id, req.query.limit);
  return successResponse(res, sessions, "Login history fetched successfully");
});

export const getMyActiveSessions = asyncHandler(async (req, res) => {
  const sessions = await getActiveSessionsService(req.user.id, req.query.limit);
  return successResponse(res, sessions, "Active sessions fetched successfully");
});

export const revokeMySession = asyncHandler(async (req, res) => {
  await revokeSessionService(req.user.id, req.params.sessionId);

  await logAction({
    userId: req.user.id,
    role: req.user.role,
    action: "REVOKE_SESSION",
    resource: "UserSession",
    resourceId: req.params.sessionId
  });

  return successResponse(res, null, "Session revoked successfully");
});

export const getMyPermissions = asyncHandler(async (req, res) => {
  const permissions = await getPermissionsService(req.user);
  return successResponse(res, permissions, "Permissions fetched successfully");
});

export const getMySecuritySummary = asyncHandler(async (req, res) => {
  const summary = await getSecuritySummaryService(req.user.id);
  return successResponse(res, summary, "Security summary fetched successfully");
});

export const getMyAuditTrail = asyncHandler(async (req, res) => {
  const logs = await getMyAuditTrailService(req.user.id, req.query.limit);
  return successResponse(res, logs, "Audit trail fetched successfully");
});

export const getMyPlanOverview = asyncHandler(async (req, res) => {
  const overview = await getPlanOverviewService(req.user);
  return successResponse(res, overview, "Plan overview fetched successfully");
});
