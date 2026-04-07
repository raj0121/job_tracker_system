import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import { getSuggestionsService } from "./suggestion.service.js";

export const getSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await getSuggestionsService(req.user, req.query);
  return successResponse(res, suggestions, "Suggestions fetched successfully");
});
