import pino from "pino";

const isProd = process.env.NODE_ENV === "production";
const isSilent = process.env.LOG_SILENT === "true";

const logger = pino({
  level: isProd ? "info" : "warn", // dev → only warnings/errors
  enabled: !isSilent, // completely disable if needed
  transport: !isProd
    ? {
        target: "pino-pretty",
        options: { colorize: true }
      }
    : undefined
});

export default logger;
