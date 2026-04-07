import { Op } from "sequelize";
import {
  QueueJob,
  ScheduledReport,
  Tenant,
  User,
  Workspace,
  WorkspaceMember
} from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";

const PLAN_LIMITS = {
  free: {
    workspaces: 1,
    workspaceMembers: 5,
    scheduledReports: 1,
    dailyExports: 10
  },
  pro: {
    workspaces: 10,
    workspaceMembers: 50,
    scheduledReports: 10,
    dailyExports: 100
  },
  enterprise: {
    workspaces: null,
    workspaceMembers: null,
    scheduledReports: null,
    dailyExports: null
  }
};

const isUnlimited = (value) => value === null || value === undefined;

const getStartOfDay = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const resolveTenantPlan = async (tenantId) => {
  if (!tenantId) {
    return {
      tenant: null,
      plan: "enterprise",
      limits: PLAN_LIMITS.enterprise
    };
  }

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    throw new AppError("Tenant not found for current user", 404);
  }

  const plan = PLAN_LIMITS[tenant.plan] ? tenant.plan : "free";
  return {
    tenant,
    plan,
    limits: PLAN_LIMITS[plan]
  };
};

const getTenantUserIds = async (tenantId, fallbackUserId = null) => {
  if (!tenantId) {
    return fallbackUserId ? [fallbackUserId] : [];
  }

  const users = await User.findAll({
    where: { tenant_id: tenantId },
    attributes: ["id"],
    raw: true
  });

  return users.map((user) => user.id);
};

const countOwnedWorkspaces = async (tenantId, userId) => {
  if (tenantId) {
    return Workspace.count({
      where: { tenant_id: tenantId }
    });
  }

  return WorkspaceMember.count({
    where: {
      user_id: userId,
      role: "owner"
    }
  });
};

const countScheduledReports = async (tenantUserIds, userId) => {
  const where = tenantUserIds.length
    ? { user_id: { [Op.in]: tenantUserIds }, is_active: true }
    : { user_id: userId, is_active: true };

  return ScheduledReport.count({ where });
};

const countDailyExports = async (tenantUserIds, userId) => {
  const where = {
    type: { [Op.in]: ["EXPORT_CSV", "EXPORT_CSV_ADMIN", "GENERATE_SCHEDULED_REPORT"] },
    createdAt: { [Op.gte]: getStartOfDay() }
  };

  if (tenantUserIds.length) {
    where.user_id = { [Op.in]: tenantUserIds };
  } else {
    where.user_id = userId;
  }

  return QueueJob.count({ where });
};

export const getPlanOverviewService = async (user) => {
  const { tenant, plan, limits } = await resolveTenantPlan(user?.tenant_id || null);
  const tenantUserIds = await getTenantUserIds(user?.tenant_id || null, user?.id || null);

  const [workspaceCount, scheduledReports, dailyExports] = await Promise.all([
    countOwnedWorkspaces(user?.tenant_id || null, user?.id),
    countScheduledReports(tenantUserIds, user?.id),
    countDailyExports(tenantUserIds, user?.id)
  ]);

  return {
    tenant: tenant
      ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        subscription_status: tenant.subscription_status
      }
      : null,
    plan,
    limits,
    usage: {
      workspaces: workspaceCount,
      scheduledReports,
      dailyExports
    }
  };
};

export const assertPlanLimitService = async (user, feature, options = {}) => {
  const tenantId = user?.tenant_id || null;
  const userId = user?.id;

  const { limits } = await resolveTenantPlan(tenantId);
  const tenantUserIds = await getTenantUserIds(tenantId, userId);

  if (feature === "workspaces") {
    if (isUnlimited(limits.workspaces)) {
      return;
    }

    const count = await countOwnedWorkspaces(tenantId, userId);
    if (count >= limits.workspaces) {
      throw new AppError(`Workspace limit reached for current plan (${limits.workspaces})`, 403);
    }
    return;
  }

  if (feature === "scheduledReports") {
    if (isUnlimited(limits.scheduledReports)) {
      return;
    }

    const count = await countScheduledReports(tenantUserIds, userId);
    if (count >= limits.scheduledReports) {
      throw new AppError(`Scheduled report limit reached for current plan (${limits.scheduledReports})`, 403);
    }
    return;
  }

  if (feature === "dailyExports") {
    if (isUnlimited(limits.dailyExports)) {
      return;
    }

    const count = await countDailyExports(tenantUserIds, userId);
    if (count >= limits.dailyExports) {
      throw new AppError(`Daily export limit reached for current plan (${limits.dailyExports})`, 403);
    }
    return;
  }

  if (feature === "workspaceMembers") {
    if (isUnlimited(limits.workspaceMembers)) {
      return;
    }

    const workspaceId = Number(options.workspaceId);
    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
      throw new AppError("workspaceId is required for workspace member limit checks", 400);
    }

    const memberCount = await WorkspaceMember.count({
      where: { workspace_id: workspaceId }
    });

    if (memberCount >= limits.workspaceMembers) {
      throw new AppError(`Workspace member limit reached for current plan (${limits.workspaceMembers})`, 403);
    }
    return;
  }

  throw new AppError(`Unsupported plan feature check: ${feature}`, 400);
};
