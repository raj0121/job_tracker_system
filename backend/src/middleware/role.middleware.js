import { AppError } from "../utils/AppError.js";
import { normalizeRole } from "../utils/role.js";
import { Permission, Role } from "../models/index.js";

const FALLBACK_ROLE_PERMISSIONS = {
  superadmin: ["*"],
  admin: [
    "masters:read:any",
    "masters:write:any",
    "candidates:read:any",
    "candidates:write:any",
    "requirements:read:any",
    "requirements:write:any",
    "enquiries:read:any",
    "enquiries:write:any",
    "reports:read:any",
    "reports:export:own",
    "users:read:any",
    "users:write:any",
    "analytics:read:any"
  ],
  hr: [
    "masters:read:any",
    "candidates:read:any",
    "candidates:write:any",
    "requirements:read:any",
    "requirements:write:any",
    "enquiries:read:any",
    "enquiries:write:any",
    "reports:read:any",
    "reports:export:own"
  ],
  recruiter: [
    "jobs:read:any",
    "jobs:write:any",
    "candidates:read:any",
    "candidates:write:any",
    "requirements:read:any",
    "requirements:write:any",
    "enquiries:read:any",
    "enquiries:write:any",
    "masters:read:any",
    "users:read:any",
    "analytics:read:any",
    "companies:read:any",
    "companies:write:any",
    "workspaces:read:own",
    "workspaces:write:own",
    "documents:read:any",
    "documents:write:any",
    "interviews:read:any",
    "interviews:write:any",
    "reports:read:any",
    "reports:export:own",
    "sessions:read:own",
    "sessions:write:own",
    "audit:read:own",
    "billing:read:own"
  ]
};

const resolveAnyPermission = (permission) => {
  const parts = permission.split(":");
  if (parts.length !== 3 || parts[2] !== "own") {
    return null;
  }

  return `${parts[0]}:${parts[1]}:any`;
};

const rolePermissionCache = new Map();

const loadRolePermissionsFromDb = async (roleKey) => {
  try {
    const role = await Role.findOne({
      where: { key: roleKey, status: "active" },
      include: [{
        model: Permission,
        where: { status: "active" },
        required: false,
        attributes: ["key"],
        through: { attributes: [] }
      }]
    });

    if (!role) {
      return null;
    }

    const permissionKeys = (role.Permissions || []).map((permission) => permission.key).filter(Boolean);
    return permissionKeys;
  } catch {
    return null;
  }
};

export const permissionsForRole = async (role) => {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole || normalizedRole === "unknown") {
    return [];
  }

  if (normalizedRole === "superadmin") {
    return ["*"];
  }

  if (rolePermissionCache.has(normalizedRole)) {
    return rolePermissionCache.get(normalizedRole);
  }

  const dbPermissions = await loadRolePermissionsFromDb(normalizedRole);
  const permissions = dbPermissions && dbPermissions.length
    ? dbPermissions
    : (FALLBACK_ROLE_PERMISSIONS[normalizedRole] || []);

  rolePermissionCache.set(normalizedRole, permissions);
  return permissions;
};

export const clearPermissionCache = (role) => {
  if (role) {
    rolePermissionCache.delete(normalizeRole(role));
    return;
  }

  rolePermissionCache.clear();
};

export const authorize = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map((role) => normalizeRole(role));

  return (req, _res, next) => {
    if (!req.user) {
      throw new AppError("Unauthorized access.", 401);
    }

    const userRole = normalizeRole(req.user.role);

    if (!normalizedAllowed.includes(userRole)) {
      throw new AppError("Access denied. Insufficient role permissions.", 403);
    }

    next();
  };
};

export const authorizePermission = (requiredPermission) => {
  return async (req, _res, next) => {
    if (!req.user) {
      throw new AppError("Unauthorized access.", 401);
    }

    if (normalizeRole(req.user.role) === "superadmin") {
      return next();
    }

    const rolePermissions = await permissionsForRole(req.user.role);

    if (rolePermissions.includes("*") || rolePermissions.includes(requiredPermission)) {
      return next();
    }

    const anyPermission = resolveAnyPermission(requiredPermission);
    if (anyPermission && rolePermissions.includes(anyPermission)) {
      return next();
    }

    throw new AppError("Access denied. Missing required permission.", 403);
  };
};
