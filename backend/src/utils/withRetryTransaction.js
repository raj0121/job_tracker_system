import { sequelize } from "../models/index.js";

const MAX_RETRIES = 3;

export const withRetryTransaction = async (callback) => {

  let attempt = 0;

  while (attempt < MAX_RETRIES) {

    const transaction = await sequelize.transaction();

    try {
      const result = await callback(transaction);

      await transaction.commit();

      return result;

    } catch (error) {

      await transaction.rollback();

      // 🔥 Deadlock detection
      if (
        error.original &&
        error.original.code === "ER_LOCK_DEADLOCK"
      ) {
        attempt++;
        console.warn(`Deadlock detected. Retrying... (${attempt})`);
        continue;
      }

      throw error;
    }
  }

  throw new Error("Transaction failed after maximum retries.");
};
