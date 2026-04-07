import logger from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  if (err?.name === "MulterError") {
    const multerStatus = err.code === "LIMIT_FILE_SIZE" ? 400 : 400;
    const multerMessage = err.code === "LIMIT_FILE_SIZE"
      ? "Uploaded file is too large."
      : err.message || "File upload failed.";

    logger.warn({
      type: "APPLICATION_ERROR",
      requestId: req.requestId,
      message: multerMessage,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.id || null,
      statusCode: multerStatus
    });

    return res.status(multerStatus).json({
      success: false,
      message: multerMessage,
      requestId: req.requestId
    });
  }

  if (err?.name === "SequelizeUniqueConstraintError") {
    const uniqueMessage = err.errors?.[0]?.message || err.message || "Duplicate value violates a unique constraint.";

    logger.warn({
      type: "APPLICATION_ERROR",
      requestId: req.requestId,
      message: uniqueMessage,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.id || null,
      statusCode: 400
    });

    return res.status(400).json({
      success: false,
      message: uniqueMessage,
      requestId: req.requestId
    });
  }

  if (err?.name === "SequelizeValidationError") {
    const validationMessage = err.errors?.[0]?.message || err.message || "Validation failed.";

    logger.warn({
      type: "APPLICATION_ERROR",
      requestId: req.requestId,
      message: validationMessage,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.id || null,
      statusCode: 400
    });

    return res.status(400).json({
      success: false,
      message: validationMessage,
      requestId: req.requestId
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const isLoginFailure = statusCode === 401 && req.originalUrl === "/api/v1/auth/login";
  const logPayload = {
    type: isLoginFailure ? "AUTH_LOGIN_FAILED" : "APPLICATION_ERROR",
    requestId: req.requestId,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.id || null,
    statusCode
  };

  if (statusCode >= 500) {
    logger.error({ ...logPayload, stack: err.stack });
  } else if (isLoginFailure) {
    logger.info(logPayload);
  } else {
    logger.warn(logPayload);
  }

  // Special DB overload handling
  if (err.name === "SequelizeConnectionAcquireTimeoutError") {
    return res.status(503).json({
      success: false,
      message: "Database overloaded. Please try again shortly.",
      requestId: req.requestId
    });
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    requestId: req.requestId
  });
};
