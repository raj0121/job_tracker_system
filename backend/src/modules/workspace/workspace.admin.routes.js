import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorize, authorizePermission } from "../../middleware/role.middleware.js";
import { getWorkspaceUsers, inviteWorkspaceUser } from "./workspace.admin.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorize("superadmin"));

router.get("/users", authorizePermission("workspaces:read:any"), getWorkspaceUsers);
router.post("/users", authorizePermission("workspaces:write:any"), inviteWorkspaceUser);

export default router;
