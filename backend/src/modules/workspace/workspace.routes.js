import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import {
  createWorkspace,
  getMembers,
  getMyWorkspaces,
  inviteMember,
  updateMemberRole
} from "./workspace.controller.js";

const router = express.Router();

router.use(protect);

router.post("/", authorizePermission("workspaces:write:own"), createWorkspace);
router.get("/", authorizePermission("workspaces:read:own"), getMyWorkspaces);
router.get("/my", authorizePermission("workspaces:read:own"), getMyWorkspaces);
router.get("/:id/members", authorizePermission("workspaces:read:own"), getMembers);
router.post("/:id/invite", authorizePermission("workspaces:write:own"), inviteMember);
router.patch("/:id/members/:memberId/role", authorizePermission("workspaces:write:own"), updateMemberRole);

export default router;
