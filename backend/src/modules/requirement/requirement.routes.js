import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { upload } from "../../utils/upload.js";
import {
  createRequirement,
  deleteRequirement,
  getRequirementById,
  getRequirements,
  updateRequirement
} from "./requirement.controller.js";
import {
  createRequirementValidator,
  updateRequirementValidator
} from "./requirement.validator.js";

const router = express.Router();

router.use(protect);
// Permissions handled by individual routes

router.get("/", authorizePermission("requirements:read:any"), getRequirements);
router.get("/:id", authorizePermission("requirements:read:any"), getRequirementById);
router.post(
  "/",
  authorizePermission("requirements:write:any"),
  upload.single("file"),
  createRequirementValidator,
  validate,
  createRequirement
);
router.patch(
  "/:id",
  authorizePermission("requirements:write:any"),
  upload.single("file"),
  updateRequirementValidator,
  validate,
  updateRequirement
);
router.delete("/:id", authorizePermission("requirements:write:any"), deleteRequirement);

export default router;
