import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import { upload } from "../../utils/upload.js";
import {
  deleteDocument,
  downloadDocument,
  getDocuments,
  getResumeLibrary,
  mapDocumentToJob,
  setDocumentActive,
  uploadDocument
} from "./document.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorizePermission("documents:read:own"));

router.post("/upload", authorizePermission("documents:write:own"), upload.single("file"), uploadDocument);
router.get("/resumes/library", getResumeLibrary);
router.get("/", getDocuments);
router.patch("/:id/activate", authorizePermission("documents:write:own"), setDocumentActive);
router.patch("/:id/map-job", authorizePermission("documents:write:own"), mapDocumentToJob);
router.get("/:id/download", downloadDocument);
router.delete("/:id", authorizePermission("documents:write:own"), deleteDocument);

export default router;
