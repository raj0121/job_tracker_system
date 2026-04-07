class Metrics {
  constructor() {
    this.startTime = Date.now();
    this.reset();
  }

  reset() {
    this.requests = 0;
    this.errors = 0;
    this.totalResponseTime = 0;
    this.rateLimited = 0;

    this.routes = {};

    this.queue = {
      processed: 0,
      failed: 0,
      deadLetter: 0,
      totalProcessingTime: 0
    };

    this.system = {
      dbLatencyMs: null,
      cacheProvider: "memory",
      cacheEntries: 0,
      lastUpdatedAt: null
    };

    this.slowQueries = {
      count: 0,
      maxDurationMs: 0,
      recent: []
    };
  }

  recordRequest(path, method, statusCode, duration) {
    this.requests += 1;
    this.totalResponseTime += duration;

    if (statusCode >= 400) {
      this.errors += 1;
    }

    const key = `${method} ${path}`;
    if (!this.routes[key]) {
      this.routes[key] = {
        count: 0,
        errors: 0,
        totalDuration: 0,
        avgDuration: 0
      };
    }

    this.routes[key].count += 1;
    this.routes[key].totalDuration += duration;
    this.routes[key].avgDuration = Number(
      (this.routes[key].totalDuration / this.routes[key].count).toFixed(2)
    );

    if (statusCode >= 400) {
      this.routes[key].errors += 1;
    }
  }

  recordRateLimitHit() {
    this.rateLimited += 1;
  }

  recordQueue(duration, { failed = false, deadLetter = false } = {}) {
    this.queue.processed += 1;
    this.queue.totalProcessingTime += duration;

    if (failed) {
      this.queue.failed += 1;
    }

    if (deadLetter) {
      this.queue.deadLetter += 1;
    }
  }

  recordSlowQuery(query, durationMs, source = null) {
    const duration = Number(durationMs || 0);
    this.slowQueries.count += 1;
    this.slowQueries.maxDurationMs = Math.max(this.slowQueries.maxDurationMs, duration);

    this.slowQueries.recent.unshift({
      query: typeof query === "string" ? query.slice(0, 300) : "",
      source: source || null,
      durationMs: duration,
      recordedAt: new Date().toISOString()
    });

    if (this.slowQueries.recent.length > 50) {
      this.slowQueries.recent = this.slowQueries.recent.slice(0, 50);
    }
  }

  updateSystem(systemPayload = {}) {
    this.system = {
      ...this.system,
      ...systemPayload,
      lastUpdatedAt: new Date().toISOString()
    };
  }

  getMetrics() {
    const avgResponseTime =
      this.requests === 0 ? 0 : Number((this.totalResponseTime / this.requests).toFixed(2));

    const avgQueueTime =
      this.queue.processed === 0
        ? 0
        : Number((this.queue.totalProcessingTime / this.queue.processed).toFixed(2));

    return {
      requests: {
        total: this.requests,
        errors: this.errors,
        errorRate: this.requests === 0 ? 0 : Number(((this.errors / this.requests) * 100).toFixed(2)),
        avgResponseTime,
        rateLimited: this.rateLimited
      },
      routes: this.routes,
      queue: {
        processed: this.queue.processed,
        failed: this.queue.failed,
        deadLetter: this.queue.deadLetter,
        avgProcessingTime: avgQueueTime
      },
      slowQueries: this.slowQueries,
      system: {
        ...this.system,
        uptimeSeconds: Number(((Date.now() - this.startTime) / 1000).toFixed(0)),
        memoryHeapUsed: process.memoryUsage().heapUsed
      }
    };
  }
}

export const metrics = new Metrics();
