import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import {
  addContactInteraction,
  addContact,
  createCompany,
  getCompanyContacts,
  getAllCompanies,
  getCompanyById,
  getCompanyTrackingOverview,
  getDueRecruiterFollowUps,
  getContactInteractions,
  updateCompanyBlacklist,
  updateCompany
} from "./company.controller.js";

const router = express.Router();

router.use(protect);

router.post("/", authorizePermission("companies:write:own"), createCompany);
router.get("/", authorizePermission("companies:read:own"), getAllCompanies);
router.get("/tracking/overview", authorizePermission("companies:read:own"), getCompanyTrackingOverview);
router.get("/follow-ups", authorizePermission("companies:read:own"), getDueRecruiterFollowUps);
router.get("/:id", authorizePermission("companies:read:own"), getCompanyById);
router.put("/:id", authorizePermission("companies:write:own"), updateCompany);
router.patch("/:id/blacklist", authorizePermission("companies:write:own"), updateCompanyBlacklist);
router.post("/:id/contacts", authorizePermission("companies:write:own"), addContact);
router.get("/:id/contacts", authorizePermission("companies:read:own"), getCompanyContacts);
router.post("/:id/contacts/:contactId/interactions", authorizePermission("companies:write:own"), addContactInteraction);
router.get("/:id/contacts/:contactId/interactions", authorizePermission("companies:read:own"), getContactInteractions);

export default router;
