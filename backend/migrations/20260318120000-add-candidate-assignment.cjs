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

    await addColumnIfMissing("assigned_to", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing("assignment_role", {
      type: Sequelize.STRING,
      allowNull: true
    });

    try {
      const indexes = await queryInterface.showIndex("candidates");
      const hasAssignedIndex = indexes.some((index) =>
        (index.fields || []).some((field) =>
          field.attribute === "assigned_to" || field.name === "assigned_to"
        )
      );

      if (!hasAssignedIndex) {
        await queryInterface.addIndex("candidates", ["assigned_to"], {
          name: "candidates_assigned_to"
        });
      }
    } catch {
      // Ignore index errors to keep migration idempotent across environments.
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
      const hasAssignedIndex = indexes.some((index) => index.name === "candidates_assigned_to");
      if (hasAssignedIndex) {
        await queryInterface.removeIndex("candidates", "candidates_assigned_to");
      }
    } catch {
      // Ignore index errors during rollback.
    }

    const removeColumnIfExists = async (name) => {
      if (table[name]) {
        await queryInterface.removeColumn("candidates", name);
      }
    };

    await removeColumnIfExists("assignment_role");
    await removeColumnIfExists("assigned_to");
  }
};
