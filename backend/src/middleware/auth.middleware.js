import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/index.js";
import { normalizeRole } from "../utils/role.js";
import { authCookieNames } from "../utils/authCookies.js";

const resolveAccessToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    return req.headers.authorization.split(" ")[1];
  }

  return req.cookies?.[authCookieNames.accessToken] || null;
};

export const protect = asyncHandler(async (req, res, next) => {
  const token = resolveAccessToken(req);

  if (!token) {
    throw new AppError("Not authorized. No token provided.", 401);
  }

  try {
    const decoded = verifyAccessToken(token);

    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "name", "email", "role", "tenant_id", "isActive"]
    });

    if (!user || !user.isActive) {
      throw new AppError("User is inactive or does not exist", 401);
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      tenant_id: user.tenant_id
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError("Token expired. Please login again.", 401);
    }

    if (error.name === "JsonWebTokenError") {
      throw new AppError("Invalid token.", 401);
    }

    throw error;
  }
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = resolveAccessToken(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);

    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "name", "email", "role", "tenant_id", "isActive"]
    });

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        tenant_id: user.tenant_id
      };
    }
  } catch {
    // Optional auth ignores invalid tokens to allow refresh-token-only logout.
  }

  return next();
});
