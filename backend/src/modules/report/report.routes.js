import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorize, authorizePermission } from "../../middleware/role.middleware.js";
import {
  createScheduledReport,
  deleteScheduledReport,
  downloadExport,
  downloadAdminExport,
  getReportHistory,
  getReportTemplates,
  getYearlyReport,
  getExportStatus,
  getAdminExportStatus,
  listScheduledReports,
  requestAdminExport,
  requestExport,
  runReportTemplate,
  runScheduledReportNow,
  updateScheduledReport
} from "./report.controller.js";

const router = express.Router();

router.use(protect);

router.post("/export", authorizePermission("reports:export:own"), requestExport);
router.get("/yearly", authorizePermission("reports:export:own"), getYearlyReport);
router.get("/status/:id", authorizePermission("reports:export:own"), getExportStatus);
router.get("/download/:id", authorizePermission("reports:export:own"), downloadExport);
router.get("/history", authorizePermission("reports:export:own"), getReportHistory);
router.get("/templates", authorizePermission("reports:export:own"), getReportTemplates);
router.post("/templates/:templateKey/run", authorizePermission("reports:export:own"), runReportTemplate);
router.post("/export/admin", authorize("superadmin"), authorizePermission("reports:export:any"), requestAdminExport);
router.get("/admin/status/:id", authorize("superadmin"), authorizePermission("reports:export:any"), getAdminExportStatus);
router.get("/admin/download/:id", authorize("superadmin"), authorizePermission("reports:export:any"), downloadAdminExport);

router.get("/schedules", authorizePermission("reports:export:own"), listScheduledReports);
router.post("/schedules", authorizePermission("reports:export:own"), createScheduledReport);
router.put("/schedules/:id", authorizePermission("reports:export:own"), updateScheduledReport);
router.delete("/schedules/:id", authorizePermission("reports:export:own"), deleteScheduledReport);
router.post("/schedules/:id/run", authorizePermission("reports:export:own"), runScheduledReportNow);

export default router;
