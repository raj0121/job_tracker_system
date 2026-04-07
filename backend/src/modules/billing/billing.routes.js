import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import {
  createBillingPortalSession,
  getBillingOverview,
  updateBillingAccount
} from "./billing.controller.js";

const router = express.Router();

router.use(protect);

router.get("/overview", authorizePermission("billing:read:own"), getBillingOverview);
router.patch("/account", authorizePermission("billing:write:any"), updateBillingAccount);
router.post("/portal-session", authorizePermission("billing:read:own"), createBillingPortalSession);

export default router;
