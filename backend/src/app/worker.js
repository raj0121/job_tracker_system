import { sequelize } from "../models/index.js";
import { startQueueWorker } from "../workers/queue.worker.js";
import logger from "../utils/logger.js";
import { addToQueue } from "../modules/queue/queue.service.js";
import { enqueueDueScheduledReportsService } from "../modules/report/export.service.js";

const enqueueAutomationTick = async () => {
  await addToQueue({
    userId: 0,
    type: "RUN_AUTOMATION_RULES",
    payload: { source: "worker-scheduler", queuedAt: new Date().toISOString() },
    maxAttempts: 5
  });
};

const startWorker = async () => {
  try {
    await sequelize.authenticate();
    logger.info({ message: "Worker DB connection established" });

    startQueueWorker();

    setInterval(() => {
      enqueueAutomationTick().catch((error) => {
        logger.error({ message: "Worker failed to enqueue automation tick", error: error.message });
      });
    }, 6 * 60 * 60 * 1000);

    setInterval(() => {
      enqueueDueScheduledReportsService().catch((error) => {
        logger.error({ message: "Worker failed to enqueue scheduled reports", error: error.message });
      });
    }, 10 * 60 * 1000);

    logger.info({ message: "Dedicated queue worker started" });

    const shutdown = async (signal) => {
      logger.warn({ message: `${signal} received in worker. Shutting down...` });
      await sequelize.close();
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    logger.error({
      message: "Failed to start dedicated worker",
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

startWorker();
