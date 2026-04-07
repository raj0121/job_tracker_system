import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import {
  createBillingPortalSessionService,
  getBillingOverviewService,
  updateBillingAccountService
} from "./billing.service.js";

export const getBillingOverview = asyncHandler(async (req, res) => {
  const payload = await getBillingOverviewService(req.user);
  return successResponse(res, payload, "Billing overview fetched successfully");
});

export const updateBillingAccount = asyncHandler(async (req, res) => {
  const payload = await updateBillingAccountService(req.user, req.body);
  return successResponse(res, payload, "Billing configuration updated successfully");
});

export const createBillingPortalSession = asyncHandler(async (req, res) => {
  const payload = await createBillingPortalSessionService(req.user);
  return successResponse(res, payload, "Billing portal session created successfully");
});
