import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import {
  createPermission,
  createRole,
  deletePermission,
  deleteRole,
  getPermissions,
  getRoles,
  updatePermission,
  updateRole
} from "./access.controller.js";

const router = express.Router();

router.use(protect);

router.get("/roles", authorizePermission("masters:read:any"), getRoles);
router.post("/roles", authorizePermission("masters:write:any"), createRole);
router.patch("/roles/:roleId", authorizePermission("masters:write:any"), updateRole);
router.delete("/roles/:roleId", authorizePermission("masters:write:any"), deleteRole);

router.get("/permissions", authorizePermission("masters:read:any"), getPermissions);
router.post("/permissions", authorizePermission("masters:write:any"), createPermission);
router.patch("/permissions/:permissionId", authorizePermission("masters:write:any"), updatePermission);
router.delete("/permissions/:permissionId", authorizePermission("masters:write:any"), deletePermission);

export default router;
