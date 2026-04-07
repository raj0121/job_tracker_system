import { Workspace, WorkspaceMember, User, sequelize } from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { buildPageResult, resolvePagePagination } from "../../utils/pagination.js";
import { isSuperAdminRole, normalizeRole } from "../../utils/role.js";

export const WORKSPACE_ROLES = ["owner", "member", "viewer"];
const MANAGE_ROLES = ["owner"];
const buildVirtualSuperAdminMembership = (workspaceId, userId) => ({
  id: `superadmin:${workspaceId}:${userId}`,
  workspace_id: Number(workspaceId),
  user_id: userId,
  role: "owner",
  is_virtual: true
});

const normalizeActor = (actor) => {
  if (!actor) {
    return { id: null, tenant_id: null, role: null };
  }

  if (typeof actor === "number") {
    return { id: actor, tenant_id: null, role: null };
  }

  return {
    id: actor.id,
    tenant_id: actor.tenant_id ?? null,
    role: actor.role ? normalizeRole(actor.role) : null
  };
};

const assertWorkspaceTenant = async (workspaceId, actor) => {
  const normalized = normalizeActor(actor);
  const workspace = await Workspace.findByPk(workspaceId, {
    attributes: ["id", "tenant_id", "name"]
  });

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  if (normalized.tenant_id && !isSuperAdminRole(normalized.role)) {
    if (workspace.tenant_id && workspace.tenant_id !== normalized.tenant_id) {
      throw new AppError("Access denied to workspace", 403);
    }
  }

  return workspace;
};

export const createWorkspaceService = async (actor, data) => {
  if (!data?.name?.trim()) {
    throw new AppError("Workspace name is required", 400);
  }

  const normalized = normalizeActor(actor);
  if (!normalized.id) {
    throw new AppError("Unauthorized access.", 401);
  }

  let targetTenantId = normalized.tenant_id || null;
  if (isSuperAdminRole(normalized.role) && data?.tenant_id) {
    const parsedTenant = Number(data.tenant_id);
    if (Number.isInteger(parsedTenant) && parsedTenant > 0) {
      targetTenantId = parsedTenant;
    }
  }

  return sequelize.transaction(async (transaction) => {
    const workspace = await Workspace.create(
      {
        ...data,
        tenant_id: targetTenantId,
        name: data.name.trim()
      },
      { transaction }
    );

    await WorkspaceMember.create(
      {
        workspace_id: workspace.id,
        user_id: normalized.id,
        role: "owner"
      },
      { transaction }
    );

    return workspace;
  });
};

export const getUserWorkspacesService = async (actor) => {
  const normalized = normalizeActor(actor);

  if (!normalized.id) {
    return [];
  }

  const where = {};
  if (normalized.tenant_id && !isSuperAdminRole(normalized.role)) {
    where.tenant_id = normalized.tenant_id;
  }

  if (isSuperAdminRole(normalized.role)) {
    const workspaces = await Workspace.findAll({
      where,
      order: [["createdAt", "DESC"]]
    });

    return workspaces.map((workspace) => ({
      ...workspace.toJSON(),
      WorkspaceMembers: [
        buildVirtualSuperAdminMembership(workspace.id, normalized.id)
      ]
    }));
  }

  const workspaces = await Workspace.findAll({
    where,
    include: [
      {
        model: WorkspaceMember,
        where: { user_id: normalized.id },
        attributes: ["role"]
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  return workspaces.map((workspace) => workspace.toJSON());
};

const assertWorkspaceManagePermission = async (workspaceId, actor) => {
  const member = await getWorkspaceMembership(workspaceId, actor);

  if (!member || !MANAGE_ROLES.includes(member.role)) {
    throw new AppError("Only workspace owner can manage members", 403);
  }
};

export const inviteToWorkspaceService = async (
  workspaceId,
  inviteeEmail,
  role = "member",
  actor
) => {
  const normalizedRole = (role || "member").toString().toLowerCase();
  if (!WORKSPACE_ROLES.includes(normalizedRole)) {
    throw new AppError("Invalid workspace member role", 400);
  }

  const normalizedActor = normalizeActor(actor);
  if (!normalizedActor.id) {
    throw new AppError("Unauthorized access.", 401);
  }

  const workspace = await assertWorkspaceTenant(workspaceId, normalizedActor);
  await assertWorkspaceManagePermission(workspaceId, normalizedActor);

  return sequelize.transaction(async (transaction) => {
    const user = await User.findOne({
      where: { email: inviteeEmail.trim().toLowerCase() },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (workspace.tenant_id && user.tenant_id !== workspace.tenant_id) {
      const existingMemberships = await WorkspaceMember.count({
        where: { user_id: user.id },
        transaction
      });

      if (user.tenant_id && existingMemberships > 0) {
        throw new AppError(
          "User belongs to a different tenant and already has workspace access there",
          403
        );
      }

      await user.update(
        { tenant_id: workspace.tenant_id },
        { transaction }
      );
    }

    const existingMember = await WorkspaceMember.findOne({
      where: { workspace_id: workspaceId, user_id: user.id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (existingMember) {
      throw new AppError("User is already a member", 400);
    }

    return WorkspaceMember.create({
      workspace_id: workspaceId,
      user_id: user.id,
      role: normalizedRole
    }, {
      transaction
    });
  });
};

export const getWorkspaceMembersService = async (workspaceId, actor, query = {}) => {
  const member = await getWorkspaceMembership(workspaceId, actor);

  if (!member) {
    throw new AppError("Access denied to workspace", 403);
  }

  const pagination = resolvePagePagination(query, {
    defaultLimit: 100,
    maxLimit: 500
  });
  const memberQuery = {
    where: { workspace_id: workspaceId },
    include: [
      {
        model: User,
        attributes: ["id", "name", "email", "role"]
      }
    ],
    order: [["createdAt", "ASC"]]
  };

  if (pagination.enabled) {
    const result = await WorkspaceMember.findAndCountAll({
      ...memberQuery,
      limit: pagination.limit,
      offset: pagination.offset
    });

    return buildPageResult(result.rows, result.count, pagination);
  }

  return WorkspaceMember.findAll(memberQuery);
};

export const isWorkspaceMember = async (workspaceId, userId) => {
  const member = await getWorkspaceMembership(workspaceId, userId);

  return Boolean(member);
};

export const getWorkspaceMembership = async (workspaceId, actor) => {
  const normalized = normalizeActor(actor);
  if (!normalized.id) {
    return null;
  }

  const workspace = await Workspace.findByPk(workspaceId, {
    attributes: ["id", "tenant_id"]
  });

  if (!workspace) {
    return null;
  }

  if (isSuperAdminRole(normalized.role)) {
    return buildVirtualSuperAdminMembership(workspaceId, normalized.id);
  }

  if (normalized.tenant_id && !isSuperAdminRole(normalized.role)) {
    if (workspace.tenant_id && workspace.tenant_id !== normalized.tenant_id) {
      return null;
    }
  }

  return WorkspaceMember.findOne({
    where: { workspace_id: workspaceId, user_id: normalized.id }
  });
};

export const canWriteToWorkspace = async (workspaceId, actor) => {
  const member = await getWorkspaceMembership(workspaceId, actor);
  if (!member) {
    return false;
  }

  return member.role !== "viewer";
};

export const updateWorkspaceMemberRoleService = async (workspaceId, memberId, role, actor) => {
  const normalizedRole = (role || "").toString().toLowerCase();
  if (!WORKSPACE_ROLES.includes(normalizedRole)) {
    throw new AppError("Invalid workspace member role", 400);
  }

  const actorMembership = await getWorkspaceMembership(workspaceId, actor);
  if (!actorMembership || !MANAGE_ROLES.includes(actorMembership.role)) {
    throw new AppError("Only workspace owner can update roles", 403);
  }

  const member = await WorkspaceMember.findOne({
    where: { id: memberId, workspace_id: workspaceId }
  });

  if (!member) {
    throw new AppError("Workspace member not found", 404);
  }

  if (member.role === "owner" && actorMembership.role !== "owner") {
    throw new AppError("Only owner can modify owner role", 403);
  }

  if (normalizedRole === "owner" && actorMembership.role !== "owner") {
    throw new AppError("Only owner can assign owner role", 403);
  }

  await member.update({ role: normalizedRole });
  return member;
};

export const assertWorkspaceAccess = async (workspaceId, actor) => {
  if (!workspaceId) {
    return null;
  }

  await assertWorkspaceTenant(workspaceId, actor);
  return workspaceId;
};
