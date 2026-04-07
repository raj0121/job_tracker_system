import { Op } from "sequelize";
import { QueueJob, sequelize } from "../models/index.js";
import { metrics } from "../utils/metrics.js";
import logger from "../utils/logger.js";
import { processExportJob, processScheduledReportJob } from "../modules/report/export.service.js";
import { detectStaleJobsService, runAutomationRulesService } from "../modules/workflow/workflow.service.js";
import {
  queueNotificationJob,
  renderNotificationTemplate,
  simulateEmailDelivery
} from "../modules/notification/notification.service.js";

const PROCESS_INTERVAL = 5000;

const RETRY_BASE_SECONDS = 30;

const isPermanentError = (error) => {
  const statusCode = Number(error?.statusCode || error?.status);
  return Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500;
};

const nextRetryAt = (attempts) => {
  const exponent = Math.min(6, Math.max(1, attempts));
  const baseDelaySeconds = RETRY_BASE_SECONDS * Math.pow(2, exponent - 1);
  const jitterSeconds = Math.floor(Math.random() * 15);
  return new Date(Date.now() + (baseDelaySeconds + jitterSeconds) * 1000);
};

const executeNotificationJob = async (job) => {
  const payload = job.payload || {};
  const templateKey = payload.template || "GENERIC_NOTIFICATION";
  const data = payload.data || {};
  const metadata = payload.metadata || {};

  const rendered = renderNotificationTemplate(templateKey, data);
  const delivery = await simulateEmailDelivery({
    userId: job.user_id,
    templateKey: rendered.templateKey,
    rendered,
    metadata,
    queueJobId: job.id
  });

  return {
    ...delivery,
    simulated: true,
    rendered
  };
};

const JOB_HANDLERS = {
  EXPORT_CSV: processExportJob,
  EXPORT_CSV_ADMIN: processExportJob,
  GENERATE_SCHEDULED_REPORT: processScheduledReportJob,
  STALE_JOB_CHECK: async () => ({ staleJobs: await detectStaleJobsService() }),
  RUN_AUTOMATION_RULES: async () => runAutomationRulesService(),
  SEND_NOTIFICATION: executeNotificationJob
};

const executeJob = async (job) => {
  const handler = JOB_HANDLERS[job.type];
  if (!handler) {
    throw new Error(`Unknown job type: ${job.type}`);
  }

  return handler(job);
};

const claimJob = async () => {
  return sequelize.transaction(async (transaction) => {
    const job = await QueueJob.findOne({
      where: {
        status: { [Op.in]: ["PENDING", "FAILED"] },
        [Op.or]: [
          { scheduled_for: null },
          { scheduled_for: { [Op.lte]: new Date() } }
        ]
      },
      order: [["createdAt", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!job) {
      return null;
    }

    await job.update({ status: "PROCESSING" }, { transaction });
    return job;
  });
};

const handleFailure = async (job, error, duration) => {
  const attempts = job.attempts + 1;
  const maxAttempts = job.max_attempts || 3;
  const permanent = isPermanentError(error);

  if (attempts >= maxAttempts || permanent) {
    await job.update({
      status: "DEAD_LETTER",
      attempts,
      error_message: error.message,
      result: {
        ...(job.result || {}),
        deadLetteredAt: new Date().toISOString(),
        lastError: error.message,
        attempts,
        permanent
      }
    });

    metrics.recordQueue(duration, { failed: true, deadLetter: true });

    logger.error({
      message: "Job moved to dead-letter queue",
      jobId: job.id,
      attempts,
      permanent,
      error: error.message
    });

    return;
  }

  const nextRunAt = nextRetryAt(attempts);

  await job.update({
    status: "FAILED",
    attempts,
    scheduled_for: nextRunAt,
    error_message: error.message,
    result: {
      ...(job.result || {}),
      lastError: error.message,
      retryScheduledAt: nextRunAt.toISOString(),
      attempts
    }
  });

  metrics.recordQueue(duration, { failed: true });

  logger.warn({
    message: "Job retry scheduled",
    jobId: job.id,
    attempts,
    nextRunAt,
    error: error.message
  });
};

export const startQueueWorker = () => {
  logger.info({ message: "Queue worker started" });

  setInterval(async () => {
    try {
      const job = await claimJob();
      if (!job) {
        return;
      }

      const startedAt = Date.now();

      try {
        const result = await executeJob(job);
        const duration = Date.now() - startedAt;

        await job.update({
          status: "COMPLETED",
          result,
          error_message: null
        });

        if ((job.type === "EXPORT_CSV" || job.type === "EXPORT_CSV_ADMIN" || job.type === "GENERATE_SCHEDULED_REPORT") && result?.fileName) {
          await queueNotificationJob({
            userId: job.user_id,
            template: "EXPORT_REPORT_READY",
            data: {
              fileName: result.fileName,
              rows: result.rows,
              reportName: result.reportName,
              recipients: result.recipients || []
            },
            metadata: {
              source: "queue-worker",
              relatedJobId: job.id,
              type: job.type
            }
          });
        }

        metrics.recordQueue(duration);

        logger.info({
          message: "Queue job completed",
          jobId: job.id,
          type: job.type,
          duration
        });
      } catch (error) {
        const duration = Date.now() - startedAt;
        await handleFailure(job, error, duration);
      }
    } catch (error) {
      logger.error({ message: "Queue worker system error", error: error.message });
    }
  }, PROCESS_INTERVAL);
};
