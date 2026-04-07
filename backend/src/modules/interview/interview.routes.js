import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import {
  getInterviews,
  getInterviewWorkspaceBoard,
  recordOutcome,
  scheduleInterview,
  updateInterview
} from "./interview.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorizePermission("interviews:read:own"));

router.post("/", authorizePermission("interviews:write:own"), scheduleInterview);
router.get("/", getInterviews);
router.get("/workspace-board", getInterviewWorkspaceBoard);
router.put("/:id", authorizePermission("interviews:write:own"), updateInterview);
router.patch("/:id/outcome", authorizePermission("interviews:write:own"), recordOutcome);

export default router;
