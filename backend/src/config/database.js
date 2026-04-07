import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import { metrics } from "../utils/metrics.js";
import logger from "../utils/logger.js";
import { extractQuerySource } from "../utils/querySource.js";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    benchmark: true,
    logging: (sql, timing) => {
      const duration = Number(timing || 0);
      const threshold = Number(process.env.DB_SLOW_QUERY_MS || 700);

      if (duration >= threshold) {
        const source = extractQuerySource(sql);
        metrics.recordSlowQuery(sql, duration, source);
        logger.warn({
          type: "SLOW_QUERY",
          source: source || "unknown",
          durationMs: duration,
          sql: typeof sql === "string" ? sql.slice(0, 400) : ""
        });
      }
    },

    pool: {
      max: 3,        // max concurrent connections
      min: 0,         // keep minimum warm connections
      acquire: 30000, // max time (ms) to get connection
      idle: 10000,    // time (ms) before releasing idle connection
      evict: 15000    // time (ms) to evict idle connections  
    },

    dialectOptions: {
      connectTimeout: 10000
    }
  }

);

export default sequelize;
