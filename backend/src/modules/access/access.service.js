import { Op } from "sequelize";
import { Permission, Role, RolePermission } from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { clearPermissionCache } from "../../middleware/role.middleware.js";
import { normalizeRole } from "../../utils/role.js";

const normalizeText = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed || null;
};

const normalizeStatus = (value, fallback = "active") => {
  const normalized = String(value || fallback).trim().toLowerCase();
  return ["active", "inactive"].includes(normalized) ? normalized : fallback;
};

const parsePermissionKey = (key) => {
  const normalized = String(key || "").trim().toLowerCase();
  const parts = normalized.split(":");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new AppError("Permission key must follow module:action:scope format", 400);
  }

  return {
    key: normalized,
    module: parts[0],
    action: parts[1],
    scope: parts[2]
  };
};

export const listRolesService = async () => {
  return Role.findAll({
    include: [{
      model: Permission,
      attributes: ["id", "key", "description", "status"],
      through: { attributes: [] }
    }],
    order: [["name", "ASC"]]
  });
};

export const createRoleService = async (payload = {}) => {
  const key = normalizeRole(payload.key || payload.name);
  const name = normalizeText(payload.name);

  if (!key || key === "unknown" || !name) {
    throw new AppError("Role name is required", 400);
  }

  const existing = await Role.findOne({ where: { [Op.or]: [{ key }, { name }] } });
  if (existing) {
    throw new AppError("Role already exists", 409);
  }

  const role = await Role.create({
    key,
    name,
    description: normalizeText(payload.description),
    status: normalizeStatus(payload.status)
  });

  if (Array.isArray(payload.permission_ids) && payload.permission_ids.length) {
    const permissionIds = [...new Set(payload.permission_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    await role.setPermissions(permissionIds);
  }

  clearPermissionCache(key);
  return Role.findByPk(role.id, {
    include: [{ model: Permission, attributes: ["id", "key", "description", "status"], through: { attributes: [] } }]
  });
};

export const updateRoleService = async (roleId, payload = {}) => {
  const role = await Role.findByPk(roleId);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "name")) {
    const name = normalizeText(payload.name);
    if (!name) {
      throw new AppError("Role name is required", 400);
    }
    role.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "description")) {
    role.description = normalizeText(payload.description);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    role.status = normalizeStatus(payload.status);
  }

  await role.save();

  if (Object.prototype.hasOwnProperty.call(payload, "permission_ids")) {
    const permissionIds = Array.isArray(payload.permission_ids)
      ? [...new Set(payload.permission_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
      : [];
    await role.setPermissions(permissionIds);
  }

  clearPermissionCache(role.key);
  return Role.findByPk(role.id, {
    include: [{ model: Permission, attributes: ["id", "key", "description", "status"], through: { attributes: [] } }]
  });
};

export const deleteRoleService = async (roleId) => {
  const role = await Role.findByPk(roleId);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  await RolePermission.destroy({ where: { role_id: role.id } });
  await role.destroy();
  clearPermissionCache(role.key);
  return { deleted: true };
};

export const listPermissionsService = async (query = {}) => {
  const where = {};
  const search = normalizeText(query.search);
  if (search) {
    where[Op.or] = [
      { key: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { module: { [Op.like]: `%${search}%` } }
    ];
  }

  if (query.status) {
    where.status = normalizeStatus(query.status);
  }

  return Permission.findAll({
    where,
    order: [["module", "ASC"], ["action", "ASC"], ["scope", "ASC"]]
  });
};

export const createPermissionService = async (payload = {}) => {
  const parsed = parsePermissionKey(payload.key);
  const existing = await Permission.findOne({ where: { key: parsed.key } });
  if (existing) {
    throw new AppError("Permission already exists", 409);
  }

  return Permission.create({
    ...parsed,
    description: normalizeText(payload.description),
    status: normalizeStatus(payload.status)
  });
};

export const updatePermissionService = async (permissionId, payload = {}) => {
  const permission = await Permission.findByPk(permissionId);
  if (!permission) {
    throw new AppError("Permission not found", 404);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "key")) {
    const parsed = parsePermissionKey(payload.key);
    permission.key = parsed.key;
    permission.module = parsed.module;
    permission.action = parsed.action;
    permission.scope = parsed.scope;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "description")) {
    permission.description = normalizeText(payload.description);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    permission.status = normalizeStatus(payload.status);
  }

  await permission.save();
  clearPermissionCache();
  return permission;
};

export const deletePermissionService = async (permissionId) => {
  const permission = await Permission.findByPk(permissionId);
  if (!permission) {
    throw new AppError("Permission not found", 404);
  }

  await RolePermission.destroy({ where: { permission_id: permission.id } });
  await permission.destroy();
  clearPermissionCache();
  return { deleted: true };
};
