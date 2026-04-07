import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import * as interviewService from "./interview.service.js";

export const scheduleInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.scheduleInterviewService(req.user, req.body);
  return successResponse(res, interview, "Interview scheduled successfully", 201);
});

export const getInterviews = asyncHandler(async (req, res) => {
  const interviews = await interviewService.getInterviewsService(req.user, req.query);
  return successResponse(res, interviews, "Interviews fetched successfully");
});

export const getInterviewWorkspaceBoard = asyncHandler(async (req, res) => {
  const board = await interviewService.getInterviewWorkspaceBoardService(req.user, req.query);
  return successResponse(res, board, "Interview workspace board fetched successfully");
});

export const updateInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.updateInterviewService(req.user, req.params.id, req.body);
  return successResponse(res, interview, "Interview updated successfully");
});

export const recordOutcome = asyncHandler(async (req, res) => {
  const { outcome, feedback } = req.body;
  const interview = await interviewService.recordInterviewOutcomeService(
    req.user,
    req.params.id,
    outcome,
    feedback
  );

  return successResponse(res, interview, "Interview outcome recorded successfully");
});
