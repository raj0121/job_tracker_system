import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import {
  createCandidateService,
  listCandidatesService,
  updateCandidateService
} from "./candidate.service.js";

export const getCandidates = asyncHandler(async (req, res) => {
  const candidates = await listCandidatesService(req.query);
  return successResponse(res, candidates, "Candidates fetched successfully");
});

export const createCandidate = asyncHandler(async (req, res) => {
  const candidate = await createCandidateService(req.body, req.user);
  return successResponse(res, candidate, "Candidate created successfully", 201);
});

export const updateCandidate = asyncHandler(async (req, res) => {
  const candidate = await updateCandidateService(req.params.id, req.body);
  return successResponse(res, candidate, "Candidate updated successfully");
});
