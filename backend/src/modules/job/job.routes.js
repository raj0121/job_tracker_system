import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorize, authorizePermission } from "../../middleware/role.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { JobApplication } from "../../models/index.js";
import { createJobValidator } from "./job.validator.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  addJobComment,
  addJobInternalNote,
  bulkUpdateJobStatus,
  createSavedFilter,
  createJob,
  deleteSavedFilter,
  deleteJob,
  exportJobs,
  getAllJobs,
  getOfferComparison,
  getFunnelAnalytics,
  getJobAnalytics,
  getJobById,
  getJobCollaboration,
  getCareerTimeline,
  getSavedFilters,
  getJobStats,
  getJobTimeline,
  requestExport,
  shareJobToWorkspace,
  updateJob
} from "./job.controller.js";

const router = express.Router();

router.use(protect);

router.get("/stats", authorizePermission("analytics:read:own"), getJobStats);
router.get("/offers/compare", authorizePermission("analytics:read:own"), getOfferComparison);
router.get("/analytics", authorizePermission("analytics:read:own"), getJobAnalytics);
router.get("/analytics/funnel", authorizePermission("analytics:read:own"), getFunnelAnalytics);
router.get("/career/timeline", authorizePermission("analytics:read:own"), getCareerTimeline);
router.get("/filters", authorizePermission("jobs:read:own"), getSavedFilters);
router.post("/filters", authorizePermission("jobs:read:own"), createSavedFilter);
router.delete("/filters/:filterId", authorizePermission("jobs:read:own"), deleteSavedFilter);
router.post("/bulk/status", authorizePermission("jobs:write:own"), bulkUpdateJobStatus);

router.get("/export", authorizePermission("reports:export:own"), exportJobs);
router.post("/export-request", authorizePermission("reports:export:own"), requestExport);

router.get("/:id/timeline", authorizePermission("jobs:read:own"), getJobTimeline);
router.get("/:id/collaboration", authorizePermission("jobs:read:own"), getJobCollaboration);
router.post("/:id/comments", authorizePermission("jobs:write:own"), addJobComment);
router.post("/:id/notes", authorizePermission("jobs:write:own"), addJobInternalNote);
router.post("/:id/share", authorizePermission("jobs:write:own"), shareJobToWorkspace);

router.get(
  "/admin/all",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const jobs = await JobApplication.findAll();
    res.status(200).json({ success: true, data: jobs });
  })
);

router.post("/", authorizePermission("jobs:write:own"), createJobValidator, validate, createJob);
router.get("/", authorizePermission("jobs:read:own"), getAllJobs);
router.get("/:id", authorizePermission("jobs:read:own"), getJobById);
router.patch("/:id", authorizePermission("jobs:write:own"), updateJob);
router.put("/:id", authorizePermission("jobs:write:own"), updateJob);
router.delete("/:id", authorizePermission("jobs:write:own"), deleteJob);

export default router;
