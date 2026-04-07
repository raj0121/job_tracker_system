import logger from "../utils/logger.js";

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info({
      type: "HTTP_REQUEST",
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || null
    });

    if (duration > 500) {
      logger.warn({
        type: "SLOW_REQUEST",
        requestId: req.requestId,
        duration
      });
    }
  });

  next();
};
