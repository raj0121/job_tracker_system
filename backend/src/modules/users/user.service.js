import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { AppError } from "../../utils/AppError.js";
import { findTenantById, findUserById, updateUserById } from "./user.repository.js";

const sanitizeUrl = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

export const getMeService = async (userId) => {
  const user = await findUserById(userId, {
    attributes: { exclude: ["password", "refreshToken"] }
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const tenant = await findTenantById(user.tenant_id);

  return {
    ...user.toJSON(),
    tenant: tenant ? tenant.toJSON() : null
  };
};

export const updateMeService = async (userId, payload = {}) => {
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(payload, "name")) {
    const name = String(payload.name || "").trim();
    if (!name) {
      throw new AppError("Full name is required", 400);
    }
    updates.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "phone")) {
    updates.phone = String(payload.phone || "").trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "linkedin_url")) {
    updates.linkedin_url = sanitizeUrl(payload.linkedin_url);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "location")) {
    updates.location = String(payload.location || "").trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "bio")) {
    updates.bio = String(payload.bio || "").trim() || null;
  }

  const user = await updateUserById(userId, updates);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return getMeService(userId);
};

export const updateAvatarService = async (userId, file) => {
  if (!file) {
    throw new AppError("Profile image is required", 400);
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const previousUrl = user.avatar_url;
  const nextUrl = `/uploads/${file.filename}`;

  await user.update({ avatar_url: nextUrl });

  if (previousUrl && previousUrl.startsWith("/uploads/")) {
    const previousPath = path.resolve(previousUrl.replace(/^\/+/, ""));
    const nextPath = path.resolve("uploads", file.filename);
    if (previousPath !== nextPath) {
      fs.promises.unlink(previousPath).catch(() => {});
    }
  }

  return getMeService(userId);
};

export const changePasswordService = async (userId, payload = {}) => {
  const currentPassword = String(payload.current_password || "").trim();
  const newPassword = String(payload.new_password || "").trim();
  const confirmPassword = String(payload.confirm_password || "").trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new AppError("All password fields are required", 400);
  }

  if (newPassword.length < 8) {
    throw new AppError("New password must be at least 8 characters", 400);
  }

  if (newPassword !== confirmPassword) {
    throw new AppError("Password confirmation does not match", 400);
  }

  const user = await findUserById(userId, { attributes: ["id", "password"] });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    throw new AppError("Current password is incorrect", 401);
  }

  await user.update({ password: newPassword });
  return { changed: true };
};
