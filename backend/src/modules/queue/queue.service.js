import { Op } from "sequelize";
import { QueueJob } from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { getCachedData, setCachedData } from "../../utils/cache.js";

const calculateScheduledFor = (scheduledFor, delayMs) => {
  if (scheduledFor) {
    return new Date(scheduledFor);
  }

  if (Number.isFinite(Number(delayMs)) && Number(delayMs) > 0) {
    return new Date(Date.now() + Number(delayMs));
  }

  return null;
};

const normalizePayload = (payload) => {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed) {
      throw new AppError("Queue payload must be a non-empty JSON object", 400);
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }

      if (typeof parsed === "string") {
        const nested = JSON.parse(parsed);
        if (nested && typeof nested === "object" && !Array.isArray(nested)) {
          return nested;
        }
      }
    } catch {
      throw new AppError("Queue payload must be a valid JSON object", 400);
    }
  }

  throw new AppError("Queue payload must be an object", 400);
};

export const addToQueue = async ({
  userId,
  type,
  payload,
  scheduledFor = null,
  delayMs = null,
  maxAttempts = 3,
  transaction = null
}) => {
  if (userId === undefined || userId === null) {
    throw new AppError("Queue userId is required", 400);
  }

  if (!type) {
    throw new AppError("Queue type is required", 400);
  }

  if (payload === undefined || payload === null) {
    throw new AppError("Queue payload is required", 400);
  }

  const targetSchedule = calculateScheduledFor(scheduledFor, delayMs);
  const normalizedPayload = normalizePayload(payload);

  return QueueJob.create({
    user_id: userId,
    type,
    status: "PENDING",
    attempts: 0,
    max_attempts: maxAttempts,
    scheduled_for: targetSchedule,
    payload: normalizedPayload
  }, transaction ? { transaction } : undefined);
};

export const getQueueHealthService = async () => {
  const cacheKey = "queue:health";
  const cached = await getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const [pending, processing, failed, deadLetter] = await Promise.all([
    QueueJob.count({ where: { status: "PENDING" } }),
    QueueJob.count({ where: { status: "PROCESSING" } }),
    QueueJob.count({ where: { status: "FAILED" } }),
    QueueJob.count({ where: { status: "DEAD_LETTER" } })
  ]);

  const payload = {
    pending,
    processing,
    failed,
    deadLetter
  };

  await setCachedData(cacheKey, payload, 30, ["queue:health"]);
  return payload;
};

export const listDeadLetterJobsService = async (options = {}) => {
  const limit = Math.max(10, Math.min(200, Number(options.limit) || 50));
  return QueueJob.findAll({
    attributes: [
      "id",
      "user_id",
      "type",
      "status",
      "attempts",
      "max_attempts",
      "scheduled_for",
      "error_message",
      "payload",
      "updatedAt",
      "createdAt"
    ],
    where: { status: "DEAD_LETTER" },
    order: [["updatedAt", "DESC"]],
    limit
  });
};

export const retryDeadLetterJobService = async (jobId, actorId = null) => {
  const queueJob = await QueueJob.findByPk(jobId);
  if (!queueJob) {
    throw new AppError("Queue job not found", 404);
  }

  if (queueJob.status !== "DEAD_LETTER") {
    throw new AppError("Only dead-letter jobs can be retried", 409);
  }

  const normalizedPayload = normalizePayload(queueJob.payload || {});
  const metadata = {
    ...(normalizedPayload.metadata || {}),
    retriedBy: actorId,
    retriedAt: new Date().toISOString()
  };

  await queueJob.update({
    status: "PENDING",
    attempts: 0,
    scheduled_for: new Date(),
    error_message: null,
    payload: {
      ...normalizedPayload,
      metadata
    }
  });

  return queueJob;
};

const QUEUE_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "DEAD_LETTER"];

const normalizeStatusFilter = (statusInput) => {
  if (!statusInput) {
    return [];
  }

  if (Array.isArray(statusInput)) {
    return statusInput.map((item) => String(item).trim().toUpperCase()).filter((item) => QUEUE_STATUSES.includes(item));
  }

  const raw = String(statusInput);
  return raw
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => QUEUE_STATUSES.includes(item));
};

export const listQueueJobsService = async (options = {}) => {
  const pagination = {
    page: Math.max(1, Number(options.page) || 1),
    limit: Math.max(10, Math.min(200, Number(options.limit) || 50))
  };

  const statuses = normalizeStatusFilter(options.status);
  const where = {};

  if (statuses.length) {
    where.status = { [Op.in]: statuses };
  }

  const [rows, count] = await Promise.all([
    QueueJob.findAll({
      where,
      attributes: [
        "id",
        "user_id",
        "type",
        "status",
        "attempts",
        "max_attempts",
        "scheduled_for",
        "error_message",
        "createdAt",
        "updatedAt"
      ],
      order: [["updatedAt", "DESC"]],
      limit: pagination.limit,
      offset: (pagination.page - 1) * pagination.limit
    }),
    QueueJob.count({ where })
  ]);

  const totalPages = count ? Math.ceil(count / pagination.limit) : 0;

  return {
    data: rows,
    pagination: {
      currentPage: pagination.page,
      totalPages,
      totalItems: count,
      limit: pagination.limit,
      hasNextPage: pagination.page < totalPages
    }
  };
};
