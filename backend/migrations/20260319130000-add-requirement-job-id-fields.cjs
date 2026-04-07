"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let table;

    try {
      table = await queryInterface.describeTable("requirements");
    } catch {
      return;
    }

    const addColumnIfMissing = async (name, definition) => {
      if (!table[name]) {
        await queryInterface.addColumn("requirements", name, definition);
      }
    };

    await addColumnIfMissing("assigned_to", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing("remarks", {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await addColumnIfMissing("duration_months", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    try {
      await queryInterface.sequelize.query(`
        UPDATE requirements
        SET client_job_id = CONCAT('JOB-', LPAD(id, 3, '0'))
        WHERE client_job_id IS NULL OR client_job_id = ''
      `);

      await queryInterface.sequelize.query(`
        UPDATE requirements r
        JOIN (
          SELECT client_job_id
          FROM requirements
          WHERE client_job_id IS NOT NULL AND client_job_id <> ''
          GROUP BY client_job_id
          HAVING COUNT(*) > 1
        ) dup ON r.client_job_id = dup.client_job_id
        SET r.client_job_id = CONCAT('JOB-', LPAD(r.id, 3, '0'))
      `);
    } catch {
      // Ignore data backfill errors to keep migration idempotent.
    }

    try {
      const indexes = await queryInterface.showIndex("requirements");

      const hasJobIdIndex = indexes.some((index) => index.name === "requirements_client_job_id_unique");
      if (!hasJobIdIndex) {
        await queryInterface.addIndex("requirements", ["client_job_id"], {
          name: "requirements_client_job_id_unique",
          unique: true
        });
      }

      const hasAssignedIndex = indexes.some((index) => index.name === "requirements_assigned_to");
      if (!hasAssignedIndex) {
        await queryInterface.addIndex("requirements", ["assigned_to"], {
          name: "requirements_assigned_to"
        });
      }
    } catch {
      // Ignore index errors to keep migration idempotent.
    }
  },

  async down(queryInterface) {
    let table;

    try {
      table = await queryInterface.describeTable("requirements");
    } catch {
      return;
    }

    try {
      const indexes = await queryInterface.showIndex("requirements");
      const hasJobIdIndex = indexes.some((index) => index.name === "requirements_client_job_id_unique");
      if (hasJobIdIndex) {
        await queryInterface.removeIndex("requirements", "requirements_client_job_id_unique");
      }

      const hasAssignedIndex = indexes.some((index) => index.name === "requirements_assigned_to");
      if (hasAssignedIndex) {
        await queryInterface.removeIndex("requirements", "requirements_assigned_to");
      }
    } catch {
      // Ignore index errors during rollback.
    }

    const removeColumnIfExists = async (name) => {
      if (table[name]) {
        await queryInterface.removeColumn("requirements", name);
      }
    };

    await removeColumnIfExists("duration_months");
    await removeColumnIfExists("remarks");
    await removeColumnIfExists("assigned_to");
  }
};
