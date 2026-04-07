import { BillingAccount, Tenant } from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { isSuperAdminRole } from "../../utils/role.js";

const BILLING_PROVIDERS = new Set(["stripe", "razorpay", "manual", "none"]);
const BILLING_STATUSES = new Set(["active", "trialing", "past_due", "canceled", "incomplete"]);
const PLAN_TYPES = new Set(["free", "pro", "enterprise"]);
const TENANT_SUBSCRIPTION_STATUSES = new Set(["active", "past_due", "canceled", "incomplete"]);

const normalizeString = (value) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
};

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} must be a valid date`, 400);
  }

  return parsed;
};

const sanitizeBillingPayload = (payload = {}) => {
  const normalized = {};

  if (payload.provider !== undefined) {
    const provider = String(payload.provider).trim().toLowerCase();
    if (!BILLING_PROVIDERS.has(provider)) {
      throw new AppError("Invalid billing provider", 400);
    }
    normalized.provider = provider;
  }

  if (payload.status !== undefined) {
    const status = String(payload.status).trim().toLowerCase();
    if (!BILLING_STATUSES.has(status)) {
      throw new AppError("Invalid billing status", 400);
    }
    normalized.status = status;
  }

  if (payload.customer_ref !== undefined) {
    normalized.customer_ref = normalizeString(payload.customer_ref);
  }

  if (payload.subscription_ref !== undefined) {
    normalized.subscription_ref = normalizeString(payload.subscription_ref);
  }

  if (payload.current_period_start !== undefined) {
    normalized.current_period_start = parseOptionalDate(payload.current_period_start, "current_period_start");
  }

  if (payload.current_period_end !== undefined) {
    normalized.current_period_end = parseOptionalDate(payload.current_period_end, "current_period_end");
  }

  if (payload.cancel_at_period_end !== undefined) {
    normalized.cancel_at_period_end = Boolean(payload.cancel_at_period_end);
  }

  if (payload.metadata !== undefined) {
    if (!payload.metadata || typeof payload.metadata !== "object" || Array.isArray(payload.metadata)) {
      throw new AppError("metadata must be an object", 400);
    }
    normalized.metadata = payload.metadata;
  }

  return normalized;
};

const ensureTenantBillingAccount = async (tenantId) => {
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  let billingAccount = await BillingAccount.findOne({
    where: { tenant_id: tenant.id }
  });

  if (!billingAccount) {
    billingAccount = await BillingAccount.create({
      tenant_id: tenant.id,
      provider: "manual",
      status: "active"
    });
  }

  return { tenant, billingAccount };
};

const buildBillingOverview = ({ tenant, billingAccount }) => ({
  tenant: {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    subscription_status: tenant.subscription_status,
    is_active: tenant.is_active
  },
  billingAccount: {
    id: billingAccount.id,
    provider: billingAccount.provider,
    status: billingAccount.status,
    customer_ref: billingAccount.customer_ref,
    subscription_ref: billingAccount.subscription_ref,
    current_period_start: billingAccount.current_period_start,
    current_period_end: billingAccount.current_period_end,
    cancel_at_period_end: billingAccount.cancel_at_period_end,
    metadata: billingAccount.metadata || {}
  },
  integrationReady: {
    portalEnabled: true,
    webhookEnabled: true,
    supportedProviders: ["stripe", "razorpay", "manual"],
    webhookEvents: [
      "subscription.created",
      "subscription.updated",
      "subscription.canceled",
      "invoice.payment_succeeded",
      "invoice.payment_failed"
    ]
  }
});

export const getBillingOverviewService = async (user) => {
  if (!user?.tenant_id) {
    return {
      tenant: null,
      billingAccount: null,
      integrationReady: {
        portalEnabled: false,
        webhookEnabled: true,
        supportedProviders: ["stripe", "razorpay", "manual"],
        webhookEvents: [
          "subscription.created",
          "subscription.updated",
          "subscription.canceled",
          "invoice.payment_succeeded",
          "invoice.payment_failed"
        ]
      }
    };
  }

  const payload = await ensureTenantBillingAccount(user.tenant_id);
  return buildBillingOverview(payload);
};

export const updateBillingAccountService = async (user, payload = {}) => {
  if (!isSuperAdminRole(user?.role)) {
    throw new AppError("Only superadmin can manage billing settings", 403);
  }

  if (!user?.tenant_id) {
    throw new AppError("Billing settings require an assigned tenant", 400);
  }

  const { tenant, billingAccount } = await ensureTenantBillingAccount(user.tenant_id);
  const billingUpdate = sanitizeBillingPayload(payload);

  await billingAccount.update(billingUpdate);

  const tenantUpdate = {};
  if (payload.plan !== undefined) {
    const nextPlan = String(payload.plan).trim().toLowerCase();
    if (!PLAN_TYPES.has(nextPlan)) {
      throw new AppError("Invalid tenant plan", 400);
    }
    tenantUpdate.plan = nextPlan;
  }

  if (payload.subscription_status !== undefined) {
    const nextStatus = String(payload.subscription_status).trim().toLowerCase();
    if (!TENANT_SUBSCRIPTION_STATUSES.has(nextStatus)) {
      throw new AppError("Invalid tenant subscription_status", 400);
    }
    tenantUpdate.subscription_status = nextStatus;
  }

  if (Object.keys(tenantUpdate).length) {
    await tenant.update(tenantUpdate);
  }

  return getBillingOverviewService(user);
};

export const createBillingPortalSessionService = async (user) => {
  if (!user?.tenant_id) {
    throw new AppError("Billing portal requires an assigned tenant", 400);
  }

  const { tenant, billingAccount } = await ensureTenantBillingAccount(user.tenant_id);
  const token = Buffer.from(`${tenant.id}:${Date.now()}`).toString("base64");
  const appUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
  const returnPath = user?.role === "superadmin"
    ? "/platform/dashboard"
    : user?.role === "recruiter"
      ? "/recruiter/dashboard"
      : "/login";
  const returnTo = encodeURIComponent(returnPath);

  return {
    provider: billingAccount.provider,
    url: `${appUrl}/billing/portal?tenant=${tenant.slug}&token=${encodeURIComponent(token)}&returnTo=${returnTo}`,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    simulated: true
  };
};
