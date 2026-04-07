import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { avatarUpload } from "../../utils/upload.js";
import {
  changePassword,
  getMe,
  updateAvatar,
  updateMe
} from "./user.controller.js";

const router = express.Router();

router.use(protect);

router.get("/me", getMe);
router.patch("/me", updateMe);
router.patch("/me/avatar", avatarUpload.single("avatar"), updateAvatar);
router.patch("/change-password", changePassword);

export default router;
