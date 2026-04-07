import app from "./app.js";
import { Tenant, User, sequelize } from "../models/index.js";
import { config } from "../config/app.config.js";
import { startQueueWorker } from "../workers/queue.worker.js";
import logger from "../utils/logger.js";
import { addToQueue } from "../modules/queue/queue.service.js";
import { enqueueDueScheduledReportsService } from "../modules/report/export.service.js";
import { runMigrations } from "../utils/migrations.js";

const enqueueAutomationTick = async () => {
  await addToQueue({
    userId: 0,
    type: "RUN_AUTOMATION_RULES",
    payload: { source: "scheduler", queuedAt: new Date().toISOString() },
    maxAttempts: 5
  });
};

const isDevelopment = process.env.NODE_ENV !== "production";
const shouldResetBootstrapPassword = process.env.BOOTSTRAP_RESET_PASSWORD === "true";
const runEmbeddedWorker = process.env.EMBED_QUEUE_WORKER === "true";

const ensureBootstrapTenant = async (label) => {
  const slug = `bootstrap-${String(label).toLowerCase()}`;
  let tenant = await Tenant.findOne({ where: { slug } });

  if (!tenant) {
    tenant = await Tenant.create({
      name: `${label} Workspace`,
      slug,
      plan: "enterprise",
      subscription_status: "active",
      is_active: true
    });
  }

  return tenant.id;
};

const ensureBootstrapAccount = async ({ role, email, password, name, label }) => {
  if (!email || !password) {
    logger.warn({
      message: `Skipping ${label} bootstrap: credentials are not configured.`
    });
    return;
  }

  const existing = await User.findOne({ where: { email } });

  const tenantId = role === "superadmin" ? null : await ensureBootstrapTenant(label);

  if (!existing) {
    await User.create({
      name,
      email,
      password,
      role,
      tenant_id: tenantId
    });

    logger.info({
      message: `Bootstrap ${label} created: ${email}`
    });
    return;
  }

  let hasChanges = false;

  if (existing.role !== role) {
    existing.role = role;
    hasChanges = true;
  }

  if (!existing.isActive) {
    existing.isActive = true;
    hasChanges = true;
  }

  if (tenantId && existing.tenant_id !== tenantId) {
    existing.tenant_id = tenantId;
    hasChanges = true;
  }

  if (shouldResetBootstrapPassword) {
    existing.password = password;
    hasChanges = true;
  }

  if (hasChanges) {
    await existing.save();
    logger.info({
      message: `Bootstrap ${label} ensured: ${email}${shouldResetBootstrapPassword ? " (password reset enabled)" : ""}`
    });
  }
};

const ensureBootstrapUsers = async () => {
  const superadminEmail = process.env.BOOTSTRAP_SUPERADMIN_EMAIL || (isDevelopment ? "superadmin@jobtracker.local" : null);
  const superadminPassword = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD || (isDevelopment ? "SuperAdmin@123" : null);
  const superadminName = process.env.BOOTSTRAP_SUPERADMIN_NAME || "Platform SuperAdmin";

  await ensureBootstrapAccount({
    role: "superadmin",
    email: superadminEmail,
    password: superadminPassword,
    name: superadminName,
    label: "superadmin"
  });
};

const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info({ message: "Database connected successfully" });

    const migrated = await runMigrations();
    logger.info({ message: `Database migrations complete (${migrated} pending applied)` });

    await ensureBootstrapUsers();

    const server = app.listen(config.port, () => {
      logger.info({
        message: `Server running on port ${config.port} [${process.env.NODE_ENV || "development"}]`
      });
    });

    if (runEmbeddedWorker) {
      startQueueWorker();

      // Queue automation rules every 6 hours.
      setInterval(() => {
        enqueueAutomationTick().catch((error) => {
          logger.error({ message: "Failed to enqueue automation tick", error: error.message });
        });
      }, 6 * 60 * 60 * 1000);

      // Enqueue due scheduled reports every 10 minutes.
      setInterval(() => {
        enqueueDueScheduledReportsService().catch((error) => {
          logger.error({ message: "Failed to enqueue scheduled reports", error: error.message });
        });
      }, 10 * 60 * 1000);
    } else {
      logger.info({ message: "Embedded queue worker disabled. Run dedicated worker process." });
    }

    const shutdown = async (signal) => {
      logger.warn({ message: `${signal} received. Shutting down gracefully...` });

      server.close(async () => {
        await sequelize.close();
        logger.info({ message: "Server closed. DB connection closed." });
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error({
      message: "Server failed to start",
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

startServer();
