import express from "express";
import { Op } from "sequelize";
import { QueueJob, sequelize } from "../../models/index.js";
import { metrics } from "../../utils/metrics.js";
import { getCacheHealth } from "../../utils/cache.js";

const router = express.Router();

router.get("/metrics", (req, res) => {
  return res.json({
    success: true,
    data: metrics.getMetrics()
  });
});

router.get("/stats", async (req, res) => {
  const [queueStats, delayedJobs, retryPending] = await Promise.all([
    QueueJob.findAll({
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["status"],
      raw: true
    }),
    QueueJob.count({
      where: {
        status: "PENDING",
        scheduled_for: { [Op.gt]: new Date() }
      }
    }),
    QueueJob.count({
      where: {
        status: "PENDING",
        attempts: { [Op.gt]: 0 }
      }
    })
  ]);

  const runtimeMetrics = metrics.getMetrics();
  const queueSummary = queueStats.reduce((acc, item) => {
    acc[item.status] = Number(item.count || 0);
    return acc;
  }, {});
  const routePerformance = Object.entries(runtimeMetrics.routes || {})
    .map(([route, value]) => ({
      route,
      count: Number(value.count || 0),
      errors: Number(value.errors || 0),
      avgDuration: Number(value.avgDuration || 0)
    }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 10);
  const alerts = [];

  if (runtimeMetrics.requests.errorRate >= 5) {
    alerts.push({
      severity: runtimeMetrics.requests.errorRate >= 10 ? "critical" : "warning",
      title: "API error rate is elevated",
      description: `${runtimeMetrics.requests.errorRate}% of requests have failed recently.`
    });
  }

  if (Number(queueSummary.PENDING || 0) >= 25) {
    alerts.push({
      severity: Number(queueSummary.PENDING || 0) >= 100 ? "critical" : "warning",
      title: "Queue backlog is growing",
      description: `${Number(queueSummary.PENDING || 0)} pending jobs detected.`
    });
  }

  return res.json({
    success: true,
    data: {
      metrics: runtimeMetrics,
      queue: queueStats,
      delayedJobs,
      retryPending,
      slowQueries: runtimeMetrics.slowQueries,
      cache: getCacheHealth(),
      monitoring: {
        summary: {
          avgResponseTime: runtimeMetrics.requests.avgResponseTime,
          errorRate: runtimeMetrics.requests.errorRate,
          throughput: runtimeMetrics.system.uptimeSeconds
            ? Number((runtimeMetrics.requests.total / runtimeMetrics.system.uptimeSeconds).toFixed(2))
            : 0,
          uptimeSeconds: runtimeMetrics.system.uptimeSeconds,
          queuePending: Number(queueSummary.PENDING || 0),
          queueFailed: Number(queueSummary.FAILED || 0),
          queueCompleted: Number(queueSummary.COMPLETED || 0)
        },
        routePerformance,
        alerts
      }
    }
  });
});

router.get("/slow-queries", (req, res) => {
  const slowQueries = metrics.getMetrics().slowQueries;
  return res.json({
    success: true,
    data: slowQueries
  });
});

router.get("/health", async (req, res) => {
  try {
    const start = Date.now();
    await sequelize.authenticate();

    const dbLatencyMs = Date.now() - start;
    const [queuePending, delayedQueueJobs, deadLetters] = await Promise.all([
      QueueJob.count({ where: { status: "PENDING" } }),
      QueueJob.count({
        where: {
          status: "PENDING",
          scheduled_for: { [Op.gt]: new Date() }
        }
      }),
      QueueJob.count({ where: { status: "DEAD_LETTER" } })
    ]);
    const cacheHealth = getCacheHealth();

    metrics.updateSystem({
      dbLatencyMs,
      cacheProvider: cacheHealth.provider,
      cacheEntries: cacheHealth.entries
    });

    return res.json({
      success: true,
      data: {
        status: "healthy",
        dbLatencyMs,
        slowQueryCount: metrics.getMetrics().slowQueries.count,
        maxSlowQueryMs: metrics.getMetrics().slowQueries.maxDurationMs,
        queuePending,
        delayedQueueJobs,
        deadLetters,
        cache: cacheHealth,
        uptime: process.uptime(),
        memory: process.memoryUsage().heapUsed
      }
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      data: {
        status: "degraded",
        error: error.message,
        cache: getCacheHealth()
      }
    });
  }
});

export default router;
