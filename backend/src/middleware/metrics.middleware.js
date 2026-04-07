import { metrics } from "../utils/metrics.js";

export const requestMetrics = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    metrics.recordRequest(req.route?.path || req.path, req.method, res.statusCode, duration);
  });

  next();
};
