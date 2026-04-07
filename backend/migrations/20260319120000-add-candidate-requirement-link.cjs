"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let table;

    try {
      table = await queryInterface.describeTable("candidates");
    } catch {
      return;
    }

    const addColumnIfMissing = async (name, definition) => {
      if (!table[name]) {
        await queryInterface.addColumn("candidates", name, definition);
      }
    };

    await addColumnIfMissing("requirement_id", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing("client_job_id", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await addColumnIfMissing("assignment_remarks", {
      type: Sequelize.TEXT,
      allowNull: true
    });

    try {
      const indexes = await queryInterface.showIndex("candidates");
      const hasRequirementIndex = indexes.some((index) =>
        (index.fields || []).some((field) =>
          field.attribute === "requirement_id" || field.name === "requirement_id"
        )
      );

      if (!hasRequirementIndex) {
        await queryInterface.addIndex("candidates", ["requirement_id"], {
          name: "candidates_requirement_id"
        });
      }

      const hasClientJobIndex = indexes.some((index) =>
        (index.fields || []).some((field) =>
          field.attribute === "client_job_id" || field.name === "client_job_id"
        )
      );

      if (!hasClientJobIndex) {
        await queryInterface.addIndex("candidates", ["client_job_id"], {
          name: "candidates_client_job_id"
        });
      }
    } catch {
      // Ignore index errors to keep migration idempotent.
    }
  },

  async down(queryInterface) {
    let table;

    try {
      table = await queryInterface.describeTable("candidates");
    } catch {
      return;
    }

    try {
      const indexes = await queryInterface.showIndex("candidates");
      const hasRequirementIndex = indexes.some((index) => index.name === "candidates_requirement_id");
      if (hasRequirementIndex) {
        await queryInterface.removeIndex("candidates", "candidates_requirement_id");
      }
      const hasClientJobIndex = indexes.some((index) => index.name === "candidates_client_job_id");
      if (hasClientJobIndex) {
        await queryInterface.removeIndex("candidates", "candidates_client_job_id");
      }
    } catch {
      // Ignore rollback index errors.
    }

    const removeColumnIfExists = async (name) => {
      if (table[name]) {
        await queryInterface.removeColumn("candidates", name);
      }
    };

    await removeColumnIfExists("assignment_remarks");
    await removeColumnIfExists("client_job_id");
    await removeColumnIfExists("requirement_id");
  }
};
