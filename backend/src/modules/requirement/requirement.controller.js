import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import * as requirementService from "./requirement.service.js";

export const getRequirements = asyncHandler(async (req, res) => {
  const requirements = await requirementService.listRequirementsService(req.query);
  return successResponse(res, requirements, "Requirements fetched successfully");
});

export const getRequirementById = asyncHandler(async (req, res) => {
  const requirement = await requirementService.getRequirementByIdService(req.params.id);
  return successResponse(res, requirement, "Requirement fetched successfully");
});

export const createRequirement = asyncHandler(async (req, res) => {
  const requirement = await requirementService.createRequirementService(req.body, req.user, req.file);
  return successResponse(res, requirement, "Requirement created successfully", 201);
});

export const updateRequirement = asyncHandler(async (req, res) => {
  const requirement = await requirementService.updateRequirementService(req.params.id, req.body, req.file);
  return successResponse(res, requirement, "Requirement updated successfully");
});

export const deleteRequirement = asyncHandler(async (req, res) => {
  const result = await requirementService.deleteRequirementService(req.params.id);
  return successResponse(res, result, "Requirement deleted successfully");
});
