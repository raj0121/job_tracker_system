import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import {
  createGoal,
  deleteGoal,
  getGoalById,
  getGoals,
  getGoalSummary,
  updateGoal
} from "./goal.controller.js";

const router = express.Router();

router.use(protect);
router.get("/summary", authorizePermission("analytics:read:own"), getGoalSummary);
router.post("/", authorizePermission("jobs:write:own"), createGoal);
router.get("/", authorizePermission("analytics:read:own"), getGoals);
router.get("/:id", authorizePermission("analytics:read:own"), getGoalById);
router.put("/:id", authorizePermission("jobs:write:own"), updateGoal);
router.delete("/:id", authorizePermission("jobs:write:own"), deleteGoal);

export default router;
