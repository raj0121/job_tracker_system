import { Tenant } from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { isSuperAdminRole } from "../../utils/role.js";

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ensureUniqueSlug = async (baseSlug) => {
  if (!baseSlug) {
    return `tenant-${Date.now()}`;
  }

  let candidate = baseSlug;
  let counter = 1;

  while (await Tenant.findOne({ where: { slug: candidate } })) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return candidate;
};

const normalizePlan = (plan) => String(plan || "free").trim().toLowerCase();
const normalizeSubscription = (status) => String(status || "active").trim().toLowerCase();

export const createPlatformWorkspaceService = async (actor, payload = {}) => {
  if (!isSuperAdminRole(actor?.role)) {
    throw new AppError("Superadmin access required", 403);
  }

  const name = String(payload.name || "").trim();
  if (!name) {
    throw new AppError("Workspace name is required", 400);
  }

  const plan = normalizePlan(payload.plan);
  if (!["free", "pro", "enterprise"].includes(plan)) {
    throw new AppError("Invalid plan", 400);
  }

  const subscription_status = normalizeSubscription(payload.subscription_status);
  if (!["active", "past_due", "canceled", "incomplete"].includes(subscription_status)) {
    throw new AppError("Invalid subscription status", 400);
  }

  const slugBase = slugify(payload.slug || name);
  const slug = await ensureUniqueSlug(slugBase);

  return Tenant.create({
    name,
    slug,
    plan,
    subscription_status,
    is_active: true
  });
};

export const deletePlatformWorkspaceService = async (actor, workspaceId) => {
  if (!isSuperAdminRole(actor?.role)) {
    throw new AppError("Superadmin access required", 403);
  }

  const tenant = await Tenant.findByPk(workspaceId);
  if (!tenant) {
    throw new AppError("Workspace not found", 404);
  }

  await tenant.destroy();
  return { deleted: true };
};
