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

    await addColumnIfMissing("department_id", {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing("designation_id", {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down(queryInterface) {
    let table;

    try {
      table = await queryInterface.describeTable("candidates");
    } catch {
      return;
    }

    const removeColumnIfExists = async (name) => {
      if (table[name]) {
        await queryInterface.removeColumn("candidates", name);
      }
    };

    await removeColumnIfExists("designation_id");
    await removeColumnIfExists("department_id");
  }
};
