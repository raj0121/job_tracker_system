import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { getAuditLogs } from "../audit/audit.controller.js";
import {
  createPlatformUser,
  createPlatformWorkspace,
  deletePlatformUser,
  deletePlatformWorkspace,
  getPlatformDashboardStats,
  getPlatformFeatureCenter,
  getPlatformJobs,
  getPlatformQueueJobs,
  getPlatformUsers,
  getPlatformWorkspaces,
  updatePlatformUser,
  updatePlatformWorkspace
} from "./platform.controller.js";
import { createCandidate, getCandidates, updateCandidate } from "../candidate/candidate.controller.js";
import {
  createCandidateValidator,
  updateCandidateValidator
} from "../candidate/candidate.validator.js";

const router = express.Router();

router.use(protect);
// Permissions handled by individual routes

router.get("/dashboard-stats", authorizePermission("analytics:read:any"), getPlatformDashboardStats);
router.get("/feature-center", authorizePermission("analytics:read:any"), getPlatformFeatureCenter);
router.get("/users", authorizePermission("users:read:any"), getPlatformUsers);
router.post("/users", authorizePermission("users:write:any"), createPlatformUser);
router.patch("/users/:userId", authorizePermission("users:write:any"), updatePlatformUser);
router.delete("/users/:userId", authorizePermission("users:write:any"), deletePlatformUser);
router.get("/jobs", authorizePermission("jobs:read:any"), getPlatformJobs);
router.get("/queue/jobs", authorizePermission("monitor:read:any"), getPlatformQueueJobs);
router.get("/candidates", authorizePermission("candidates:read:any"), getCandidates);
router.post("/candidates", authorizePermission("candidates:write:any"), createCandidateValidator, validate, createCandidate);
router.patch("/candidates/:id", authorizePermission("candidates:write:any"), updateCandidateValidator, validate, updateCandidate);
router.get("/workspaces", authorizePermission("workspaces:read:any"), getPlatformWorkspaces);
router.post("/workspaces", authorizePermission("workspaces:write:any"), createPlatformWorkspace);
router.patch("/workspaces/:workspaceId", authorizePermission("workspaces:write:any"), updatePlatformWorkspace);
router.delete("/workspaces/:workspaceId", authorizePermission("workspaces:write:any"), deletePlatformWorkspace);
router.get("/audit-logs", authorizePermission("audit:read:any"), getAuditLogs);

export default router;
