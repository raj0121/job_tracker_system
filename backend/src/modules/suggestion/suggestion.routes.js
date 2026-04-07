import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { getSuggestions } from "./suggestion.controller.js";

const router = express.Router();

router.use(protect);
router.get("/", getSuggestions);

export default router;
