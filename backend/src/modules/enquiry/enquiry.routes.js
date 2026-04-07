import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { upload } from "../../utils/upload.js";
import {
  addEnquiryAttachments,
  createEnquiry,
  deleteEnquiry,
  deleteEnquiryAttachment,
  getEnquiries,
  getEnquiryById,
  updateEnquiry
} from "./enquiry.controller.js";
import {
  createEnquiryValidator,
  updateEnquiryValidator
} from "./enquiry.validator.js";

const router = express.Router();

router.use(protect);
// Individual permissions apply below

router.get("/", authorizePermission("enquiries:read:any"), getEnquiries);
router.get("/:id", authorizePermission("enquiries:read:any"), getEnquiryById);
router.post(
  "/",
  authorizePermission("enquiries:write:any"),
  upload.array("attachments", 8),
  createEnquiryValidator,
  validate,
  createEnquiry
);
router.patch("/:id", authorizePermission("enquiries:write:any"), updateEnquiryValidator, validate, updateEnquiry);
router.delete("/:id", authorizePermission("enquiries:write:any"), deleteEnquiry);
router.post(
  "/:id/attachments",
  authorizePermission("enquiries:write:any"),
  upload.array("attachments", 8),
  addEnquiryAttachments
);
router.delete(
  "/:id/attachments/:attachmentId",
  authorizePermission("enquiries:write:any"),
  deleteEnquiryAttachment
);

export default router;
