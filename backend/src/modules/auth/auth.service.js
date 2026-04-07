import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import { AuditLog, LoginHistory, Tenant, User, UserSession } from "../../models/index.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../../utils/jwt.js";
import { AppError } from "../../utils/AppError.js";
import { normalizeRole } from "../../utils/role.js";
import { permissionsForRole } from "../../middleware/role.middleware.js";
import { getCachedData, invalidateTags, setCachedData } from "../../utils/cache.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 2 * 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_SUPERADMIN_INVITE_CODE = process.env.NODE_ENV === "production" ? null : "SUPERADMIN123";

const sanitizeEmail = (email) => (email || "").trim().toLowerCase();
const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(String(token || "")).digest("hex");
const getRefreshExpiry = () => new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const normalizeProfileValue = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
};

const resolveUniqueTenantSlug = async (source) => {
  const base = slugify(source) || `tenant-${Date.now()}`;
  let next = base;
  let index = 1;

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await Tenant.findOne({ where: { slug: next } });
    if (!existing) {
      return next;
    }

    next = `${base}-${index}`;
    index += 1;
  }
};

const resolveTenantIdForRegistration = async ({
  requestedRole,
  tenant_id,
  tenant_slug,
  tenant_name,
  sanitizedName,
  sanitizedEmail
}) => {
  if (requestedRole === "superadmin") {
    return null;
  }

  if (tenant_id) {
    const existingById = await Tenant.findOne({
      where: { id: Number(tenant_id), is_active: true }
    });

    if (!existingById) {
      throw new AppError("Tenant not found", 404);
    }

    return existingById.id;
  }

  if (tenant_slug) {
    const existingBySlug = await Tenant.findOne({
      where: { slug: slugify(tenant_slug), is_active: true }
    });

    if (!existingBySlug) {
      throw new AppError("Tenant not found", 404);
    }

    return existingBySlug.id;
  }

  const finalTenantName = String(tenant_name || `${sanitizedName} Workspace`).trim() || "Workspace";
  const finalTenantSlug = await resolveUniqueTenantSlug(
    tenant_name || sanitizedEmail.split("@")[0] || sanitizedName
  );

  const tenant = await Tenant.create({
    name: finalTenantName,
    slug: finalTenantSlug,
    plan: "free",
    subscription_status: "active",
    is_active: true
  });

  return tenant.id;
};

export const registerService = async ({
  name,
  email,
  password,
  role,
  invite_code,
  tenant_id,
  tenant_slug,
  tenant_name
}) => {
  const sanitizedName = (name || "").trim();
  const sanitizedEmail = sanitizeEmail(email);
  const requestedRole = normalizeRole(role || "recruiter");

  if (!sanitizedName || !sanitizedEmail || !password) {
    throw new AppError("All fields are required", 400);
  }

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const existing = await User.findOne({ where: { email: sanitizedEmail } });
  if (existing) {
    throw new AppError("Email already registered", 400);
  }

  if (!["recruiter", "superadmin"].includes(requestedRole)) {
    throw new AppError("Invalid role selected", 400);
  }

  if (requestedRole === "superadmin") {
    const superadminInviteCode = process.env.SUPERADMIN_INVITE_CODE || DEFAULT_SUPERADMIN_INVITE_CODE;
    if (!superadminInviteCode || invite_code !== superadminInviteCode) {
      throw new AppError("Invalid superadmin invite code", 403);
    }
  }

  const resolvedTenantId = await resolveTenantIdForRegistration({
    requestedRole,
    tenant_id,
    tenant_slug,
    tenant_name,
    sanitizedName,
    sanitizedEmail
  });

  const user = await User.create({
    name: sanitizedName,
    email: sanitizedEmail,
    password,
    role: requestedRole,
    tenant_id: resolvedTenantId
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenant_id: user.tenant_id
  };
};

export const loginService = async ({ email, password, ip, userAgent, deviceFingerprint }) => {
  const sanitizedEmail = sanitizeEmail(email);
  const plainPassword = (password || "").trim();

  if (!sanitizedEmail || !plainPassword) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await User.findOne({
    where: { email: sanitizedEmail },
    attributes: {
      include: [
        "password",
        "failedLoginAttempts",
        "lockUntil",
        "refreshToken",
        "isActive"
      ]
    }
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account is inactive", 403);
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    await LoginHistory.create({
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      device_fingerprint: deviceFingerprint,
      status: "failed",
      failure_reason: "Account locked"
    });

    throw new AppError("Account locked due to failed attempts. Try again later.", 403);
  }

  const isMatch = await bcrypt.compare(plainPassword, user.password);

  if (!isMatch) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
    }

    await user.save();

    await LoginHistory.create({
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      device_fingerprint: deviceFingerprint,
      status: "failed",
      failure_reason: "Invalid password"
    });

    throw new AppError("Invalid credentials", 401);
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  user.role = normalizeRole(user.role);

  const accessToken = signAccessToken({
    id: user.id,
    role: user.role,
    tenant_id: user.tenant_id
  });

  const session = await LoginHistory.create({
    user_id: user.id,
    ip_address: ip,
    user_agent: userAgent,
    device_fingerprint: deviceFingerprint,
    status: "success"
  });

  const userSession = await UserSession.create({
    user_id: user.id,
    refresh_token_hash: hashRefreshToken(`bootstrap:${user.id}:${Date.now()}`),
    ip_address: ip,
    user_agent: userAgent,
    device_fingerprint: deviceFingerprint || null,
    is_active: true,
    revoked_at: null,
    expires_at: getRefreshExpiry(),
    last_seen_at: new Date()
  });

  const refreshToken = signRefreshToken({ id: user.id, sid: userSession.id });
  await userSession.update({
    refresh_token_hash: hashRefreshToken(refreshToken),
    expires_at: getRefreshExpiry(),
    last_seen_at: new Date()
  });

  // Keep legacy refresh column for backward compatibility.
  user.refreshToken = refreshToken;
  await user.save();
  await invalidateTags([`sessions:user:${user.id}`]);

  return {
    accessToken,
    refreshToken,
    session: {
      id: userSession.id,
      loginHistoryId: session.id,
      loggedInAt: session.createdAt,
      lastSeenAt: userSession.last_seen_at,
      expiresAt: userSession.expires_at
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id
    }
  };
};

export const refreshTokenService = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError("Refresh token is required", 401);
  }

  const decoded = verifyRefreshToken(refreshToken);
  const user = await User.findByPk(decoded.id);

  if (!user) {
    throw new AppError("Invalid or expired refresh token", 403);
  }

  const sessionId = Number(decoded.sid);
  const hasSessionId = Number.isInteger(sessionId) && sessionId > 0;
  let userSession = null;

  if (hasSessionId) {
    userSession = await UserSession.findOne({
      where: {
        id: sessionId,
        user_id: user.id,
        is_active: true,
        revoked_at: null,
        expires_at: { [Op.gt]: new Date() }
      }
    });

    if (!userSession || userSession.refresh_token_hash !== hashRefreshToken(refreshToken)) {
      throw new AppError("Invalid or expired refresh token", 403);
    }
  } else if (user.refreshToken !== refreshToken) {
    throw new AppError("Invalid or expired refresh token", 403);
  }

  const normalizedRole = normalizeRole(user.role);

  const nextAccessToken = signAccessToken({
    id: user.id,
    role: normalizedRole,
    tenant_id: user.tenant_id
  });
  const refreshPayload = hasSessionId ? { id: user.id, sid: sessionId } : { id: user.id };
  const nextRefreshToken = signRefreshToken(refreshPayload);

  if (userSession) {
    await userSession.update({
      refresh_token_hash: hashRefreshToken(nextRefreshToken),
      last_seen_at: new Date(),
      expires_at: getRefreshExpiry(),
      is_active: true,
      revoked_at: null
    });
  }

  user.refreshToken = nextRefreshToken;
  await user.save();

  return {
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
    session: userSession
      ? {
        id: userSession.id,
        lastSeenAt: userSession.last_seen_at,
        expiresAt: userSession.expires_at
      }
      : null
  };
};

export const logoutService = async ({ refreshToken, userId }) => {
  if (!refreshToken && !userId) {
    return;
  }

  let resolvedUserId = userId || null;
  let shouldClearLegacyRefresh = !refreshToken;

  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      resolvedUserId = decoded.id;

      const sessionId = Number(decoded.sid);
      if (Number.isInteger(sessionId) && sessionId > 0) {
        await UserSession.update(
          {
            is_active: false,
            revoked_at: new Date()
          },
          {
            where: {
              id: sessionId,
              user_id: decoded.id,
              is_active: true
            }
          }
        );
      } else {
        shouldClearLegacyRefresh = true;
      }
    } catch {
      // Ignore invalid refresh token parsing for logout.
    }
  }

  if (!resolvedUserId) {
    return;
  }

  // Optional global logout path.
  if (userId && !refreshToken) {
    await UserSession.update(
      {
        is_active: false,
        revoked_at: new Date()
      },
      {
        where: {
          user_id: resolvedUserId,
          is_active: true
        }
      }
    );
  }

  const user = await User.findByPk(resolvedUserId);
  if (!user) {
    return;
  }

  if (shouldClearLegacyRefresh || !refreshToken || user.refreshToken === refreshToken) {
    user.refreshToken = null;
    await user.save();
  }

  await invalidateTags([`sessions:user:${resolvedUserId}`]);
};

export const getProfileService = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: {
      exclude: ["password", "refreshToken"]
    }
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const profile = user.toJSON();
  profile.role = normalizeRole(profile.role);
  return profile;
};

export const updateProfileService = async (userId, payload = {}) => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const updates = {};
  const fields = ["name", "headline", "bio", "location", "phone", "linkedin_url", "website_url"];

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      updates[field] = normalizeProfileValue(payload[field]);
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, "name") && !updates.name) {
    throw new AppError("Name is required", 400);
  }

  await user.update(updates);
  return getProfileService(userId);
};

export const updateProfileAvatarService = async (userId, file) => {
  if (!file) {
    throw new AppError("Avatar file is required", 400);
  }

  const user = await User.findByPk(userId);

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

  return getProfileService(userId);
};

export const getLoginHistoryService = async (userId, limit = 20) => {
  const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 20));

  const cacheKey = `sessions:user:${userId}:history:${parsedLimit}`;
  const cached = await getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const rows = await LoginHistory.findAll({
    where: { user_id: userId },
    attributes: [
      "id",
      "ip_address",
      "user_agent",
      "device_fingerprint",
      "status",
      "failure_reason",
      "createdAt"
    ],
    order: [["createdAt", "DESC"]],
    limit: parsedLimit,
    raw: true
  });

  await setCachedData(cacheKey, rows, 300, [`sessions:user:${userId}`]);
  return rows;
};

export const getPermissionsService = async (user) => {
  const normalizedRole = normalizeRole(user?.role);

  return {
    role: normalizedRole,
    permissions: await permissionsForRole(normalizedRole)
  };
};

export const getSecuritySummaryService = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: [
      "id",
      "email",
      "role",
      "failedLoginAttempts",
      "lockUntil",
      "lastLoginAt",
      "isActive"
    ]
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const [loginSuccessCount, loginFailedCount, knownDevicesCount, activeSessionsCount] = await Promise.all([
    LoginHistory.count({
      where: {
        user_id: userId,
        status: "success",
        createdAt: { [Op.gte]: last30Days }
      }
    }),
    LoginHistory.count({
      where: {
        user_id: userId,
        status: "failed",
        createdAt: { [Op.gte]: last30Days }
      }
    }),
    LoginHistory.count({
      where: {
        user_id: userId,
        status: "success",
        device_fingerprint: { [Op.ne]: null }
      },
      distinct: true,
      col: "device_fingerprint"
    }),
    UserSession.count({
      where: {
        user_id: userId,
        is_active: true,
        revoked_at: null,
        expires_at: { [Op.gt]: new Date() }
      }
    })
  ]);

  return {
    id: user.id,
    email: user.email,
    role: normalizeRole(user.role),
    isActive: user.isActive,
    failedLoginAttempts: Number(user.failedLoginAttempts || 0),
    isLocked: Boolean(user.lockUntil && user.lockUntil > new Date()),
    lockUntil: user.lockUntil,
    lastLoginAt: user.lastLoginAt,
    metrics: {
      loginSuccessCount,
      loginFailedCount,
      knownDevicesCount,
      activeSessionsCount
    }
  };
};

export const getActiveSessionsService = async (userId, limit = 20) => {
  const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 20));

  const cacheKey = `sessions:user:${userId}:active:${parsedLimit}`;
  const cached = await getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const rows = await UserSession.findAll({
    where: {
      user_id: userId,
      is_active: true,
      revoked_at: null,
      expires_at: { [Op.gt]: new Date() }
    },
    attributes: [
      "id",
      "ip_address",
      "user_agent",
      "device_fingerprint",
      "last_seen_at",
      "expires_at",
      "createdAt",
      "updatedAt"
    ],
    order: [["last_seen_at", "DESC"]],
    limit: parsedLimit,
    raw: true
  });

  await setCachedData(cacheKey, rows, 120, [`sessions:user:${userId}`]);
  return rows;
};

export const revokeSessionService = async (userId, sessionId) => {
  const parsedSessionId = Number(sessionId);
  if (!Number.isInteger(parsedSessionId) || parsedSessionId <= 0) {
    throw new AppError("Invalid session id", 400);
  }

  const session = await UserSession.findOne({
    where: {
      id: parsedSessionId,
      user_id: userId
    }
  });

  if (!session) {
    throw new AppError("Session not found", 404);
  }

  await session.update({
    is_active: false,
    revoked_at: new Date()
  });

  await invalidateTags([`sessions:user:${userId}`]);

  return session;
};

export const getMyAuditTrailService = async (userId, limit = 30) => {
  const parsedLimit = Math.max(1, Math.min(200, Number(limit) || 30));

  return AuditLog.findAll({
    where: { user_id: userId },
    attributes: ["id", "action", "resource", "resource_id", "role", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: parsedLimit
  });
};
