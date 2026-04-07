import path from "path";
import { createRequire } from "module";
import { Sequelize } from "sequelize";
import { fileURLToPath } from "url";
import { Umzug, SequelizeStorage } from "umzug";
import sequelize from "../config/database.js";
import logger from "./logger.js";

export const runMigrations = async () => {
  const require = createRequire(import.meta.url);
  const migrationsDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../migrations"
  );

  const umzug = new Umzug({
    migrations: {
      glob: ["*.cjs", { cwd: migrationsDir }],
      resolve: ({ name, path: migrationPath, context }) => {
        const migration = require(migrationPath);
        return {
          name,
          up: async () => migration.up(context, Sequelize),
          down: async () => migration.down(context, Sequelize)
        };
      }
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize, tableName: "sequelize_meta" }),
    logger: {
      info: (message) => logger.info({ message }),
      warn: (message) => logger.warn({ message }),
      error: (message) => logger.error({ message })
    }
  });

  const pending = await umzug.pending();
  if (pending.length) {
    await umzug.up();
  }

  return pending.length;
};
