import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import {
  getMasterData,
  createMasterData,
  updateMasterData,
  deleteMasterData
} from "../../controllers/masters/masterController.js";

const router = express.Router();

router.use(protect);

router.get("/:type", authorizePermission("masters:read:any"), getMasterData);
router.post("/:type", authorizePermission("masters:write:any"), createMasterData);
router.patch("/:type/:id", authorizePermission("masters:write:any"), updateMasterData);
router.delete("/:type/:id", authorizePermission("masters:write:any"), deleteMasterData);

export default router;
