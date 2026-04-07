import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorize, authorizePermission } from "../../middleware/role.middleware.js";
import { getAuditLogs } from "../audit/audit.controller.js";
import {
  createUser,
  deleteUser,
  getAdminStateChanges,
  getDashboardStats,
  getDeadLetterJobs,
  getFeatureCenter,
  getNotificationTemplateCatalog,
  getEnterpriseOverview,
  getWorkspaces,
  runWorkflowAutomationNow,
  retryDeadLetterJob,
  getUsers,
  updateUser,
  updateWorkspace
} from "./admin.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorize("superadmin"));

router.get("/dashboard-stats", authorizePermission("analytics:read:any"), getDashboardStats);
router.get("/enterprise-overview", authorizePermission("analytics:read:any"), getEnterpriseOverview);
router.get("/feature-center", authorizePermission("analytics:read:any"), getFeatureCenter);
router.get("/state-changes", authorizePermission("analytics:read:any"), getAdminStateChanges);
router.get("/queue/dead-letter", authorizePermission("monitor:read:any"), getDeadLetterJobs);
router.post("/queue/dead-letter/:id/retry", authorizePermission("monitor:read:any"), retryDeadLetterJob);
router.get("/notification-templates", authorizePermission("monitor:read:any"), getNotificationTemplateCatalog);
router.post("/workflow/run-now", authorizePermission("jobs:write:any"), runWorkflowAutomationNow);
router.get("/users", authorizePermission("users:read:any"), getUsers);
router.post("/users", authorizePermission("users:write:any"), createUser);
router.patch("/users/:userId", authorizePermission("users:write:any"), updateUser);
router.delete("/users/:userId", authorizePermission("users:write:any"), deleteUser);
router.get("/workspaces", authorizePermission("workspaces:read:any"), getWorkspaces);
router.patch("/workspaces/:workspaceId", authorizePermission("workspaces:write:any"), updateWorkspace);
router.get("/audit-logs", authorize("superadmin"), authorizePermission("audit:read:any"), getAuditLogs);

export default router;
