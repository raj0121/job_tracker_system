import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import * as goalService from "./goal.service.js";
import { logAction } from "../audit/audit.service.js";

export const createGoal = asyncHandler(async (req, res) => {
  const goal = await goalService.createGoalService(req.user, req.body);

  await logAction({
    userId: req.user.id,
    role: req.user.role,
    action: "CREATE_GOAL",
    resource: "Goal",
    resourceId: goal.id
  });

  return successResponse(res, goal, "Goal created successfully", 201);
});

export const getGoals = asyncHandler(async (req, res) => {
  const goals = await goalService.getGoalsService(req.user, req.query);
  return successResponse(res, goals, "Goals fetched successfully");
});

export const getGoalById = asyncHandler(async (req, res) => {
  const goal = await goalService.getGoalByIdService(req.user, req.params.id);
  return successResponse(res, goal, "Goal fetched successfully");
});

export const updateGoal = asyncHandler(async (req, res) => {
  const goal = await goalService.updateGoalService(req.user, req.params.id, req.body);

  await logAction({
    userId: req.user.id,
    role: req.user.role,
    action: "UPDATE_GOAL",
    resource: "Goal",
    resourceId: req.params.id
  });

  return successResponse(res, goal, "Goal updated successfully");
});

export const deleteGoal = asyncHandler(async (req, res) => {
  const result = await goalService.deleteGoalService(req.user, req.params.id);

  await logAction({
    userId: req.user.id,
    role: req.user.role,
    action: "DELETE_GOAL",
    resource: "Goal",
    resourceId: req.params.id
  });

  return successResponse(res, null, result.message);
});

export const getGoalSummary = asyncHandler(async (req, res) => {
  const summary = await goalService.getGoalSummaryService(req.user, req.query);
  return successResponse(res, summary, "Goal summary fetched successfully");
});
