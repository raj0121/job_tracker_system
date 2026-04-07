import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import cors from "cors";

import authRoutes from "../modules/auth/auth.routes.js";
import jobRoutes from "../modules/job/job.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import platformRoutes from "../modules/platform/platform.routes.js";
import companyRoutes from "../modules/company/company.routes.js";
import interviewRoutes from "../modules/interview/interview.routes.js";
import documentRoutes from "../modules/document/document.routes.js";
import workspaceRoutes from "../modules/workspace/workspace.routes.js";
import workspaceAdminRoutes from "../modules/workspace/workspace.admin.routes.js";
import reportRoutes from "../modules/report/report.routes.js";
import monitorRoutes from "../modules/monitor/monitor.routes.js";
import billingRoutes from "../modules/billing/billing.routes.js";
import goalRoutes from "../modules/goal/goal.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import suggestionRoutes from "../modules/suggestion/suggestion.routes.js";
import enquiryRoutes from "../modules/enquiry/enquiry.routes.js";
import requirementRoutes from "../modules/requirement/requirement.routes.js";
import departmentRoutes from "../routes/masters/departmentRoutes.js";
import masterRoutes from "../routes/masters/masterRoutes.js";
import accessRoutes from "../modules/access/access.routes.js";

import { requestMetrics } from "../middleware/metrics.middleware.js";
import { errorHandler } from "../middleware/error.middleware.js";
import { requestIdMiddleware } from "../middleware/requestId.middleware.js";
import { requestLogger } from "../middleware/requestLogger.middleware.js";
import { requestTimeout } from "../middleware/timeout.middleware.js";
import { metrics } from "../utils/metrics.js";
import { sequelize } from "../models/index.js";
import { parseCookieHeader } from "../utils/authCookies.js";

const app = express();

app.use(helmet({
  // Frontend runs on a different origin during development, so uploaded assets
  // must be embeddable cross-origin (for example profile avatars in <img> tags).
  crossOriginResourcePolicy: false
}));
app.use(compression());
app.use(hpp());

app.use(
  cors({
    origin: [
      "https://bespoke-biscotti-9b96ab.netlify.app",
      "http://localhost:5173",
      "http://localhost:3000",
      // "https://Rovexapex.com"
    ],
    credentials: true, // if using cookies/auth
  })
);

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
// const allowedOrigins = (process.env.CORS_ORIGINS || "https://Rovexapex.com,https://localhost:5173")
.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes("*")) {
    return true;
  }

  return allowedOrigins.includes(origin);
};

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Id"
    );
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }

  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) {
      return res.status(403).json({
        success: false,
        message: "CORS origin not allowed"
      });
    }

    return res.sendStatus(204);
  }

  return next();
});

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    metrics.recordRateLimitHit();
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP. Please retry later."
    });
  }
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    metrics.recordRateLimitHit();
    res.status(429).json({
      success: false,
      message: "Too many authentication attempts. Please retry after 15 minutes."
    });
  }
});

const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    metrics.recordRateLimitHit();
    res.status(429).json({
      success: false,
      message: "Too many admin operations. Please retry later."
    });
  }
});

const reportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    metrics.recordRateLimitHit();
    res.status(429).json({
      success: false,
      message: "Too many report requests. Please retry later."
    });
  }
});

const documentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    metrics.recordRateLimitHit();
    res.status(429).json({
      success: false,
      message: "Too many document requests. Please retry later."
    });
  }
});

const isAuthLimitedEndpoint = (req) => {
  if (req.method !== "POST") {
    return false;
  }

  return ["/login", "/register", "/refresh-token"].includes(req.path);
};

const authEndpointRateLimiter = (req, res, next) => {
  if (!isAuthLimitedEndpoint(req)) {
    return next();
  }

  return authRateLimiter(req, res, next);
};

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use((req, res, next) => {
  req.cookies = parseCookieHeader(req.headers.cookie);
  next();
});
app.use(
  "/uploads",
  express.static(path.resolve("uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    }
  })
);

app.use(requestMetrics);
app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(requestTimeout(Number(process.env.REQUEST_TIMEOUT_MS) || 30000));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Job Tracker API running"
  });
});

app.get("/health", async (req, res) => {
  try {
    const start = Date.now();
    await sequelize.authenticate();
    const dbLatencyMs = Date.now() - start;

    metrics.updateSystem({ dbLatencyMs });

    res.json({
      success: true,
      status: "OK",
      dbLatencyMs,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: "DOWN",
      error: error.message
    });
  }
});

app.use("/api", apiRateLimiter);
app.use("/api/v1/auth", authEndpointRateLimiter, authRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/admin", adminRateLimiter, adminRoutes);
app.use("/api/v1/platform", adminRateLimiter, platformRoutes);
app.use("/api/v1/platform", departmentRoutes);
app.use("/api/v1/platform/enquiries", adminRateLimiter, enquiryRoutes);
  app.use("/api/v1/platform/requirements", adminRateLimiter, requirementRoutes);
  app.use("/api/v1/platform", accessRoutes);
  app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1/interviews", interviewRoutes);
app.use("/api/v1/documents", documentRateLimiter, documentRoutes);
app.use("/api/v1/workspaces", workspaceRoutes);
app.use("/api/v1/workspace", workspaceAdminRoutes);
app.use("/api/v1/reports", reportRateLimiter, reportRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/monitor", monitorRoutes);
app.use("/api/v1/goals", goalRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/suggestions", suggestionRoutes);
app.use("/api/v1/masters", masterRoutes);

app.use(errorHandler);

export default app;
