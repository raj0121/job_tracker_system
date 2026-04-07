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

    await addColumnIfMissing("educations", {
      type: Sequelize.JSON,
      allowNull: true
    });

    await addColumnIfMissing("experiences", {
      type: Sequelize.JSON,
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

    await removeColumnIfExists("experiences");
    await removeColumnIfExists("educations");
  }
};
