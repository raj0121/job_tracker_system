import express from "express";
import {
  getMyAuditTrail,
  getMyActiveSessions,
  getMyPlanOverview,
  getMyPermissions,
  getMySecuritySummary,
  updateMyProfile,
  uploadMyAvatar,
  getMySessions,
  login,
  logout,
  me,
  revokeMySession,
  refreshAccessToken,
  register
} from "./auth.controller.js";
import { optionalAuth, protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import { avatarUpload } from "../../utils/upload.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", optionalAuth, logout);
router.get("/me", protect, me);
router.patch("/me", protect, updateMyProfile);
router.post("/me/avatar", protect, avatarUpload.single("avatar"), uploadMyAvatar);
router.get("/sessions", protect, authorizePermission("sessions:read:own"), getMySessions);
router.get("/sessions/active", protect, authorizePermission("sessions:read:own"), getMyActiveSessions);
router.delete("/sessions/:sessionId", protect, authorizePermission("sessions:write:own"), revokeMySession);
router.get("/permissions", protect, getMyPermissions);
router.get("/plan", protect, getMyPlanOverview);
router.get("/security-summary", protect, authorizePermission("sessions:read:own"), getMySecuritySummary);
router.get("/audit-trail", protect, authorizePermission("audit:read:own"), getMyAuditTrail);

export default router;
