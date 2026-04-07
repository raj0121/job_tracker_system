"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let table;

    try {
      table = await queryInterface.describeTable("requirements");
    } catch {
      return;
    }

    if (!table.priority) {
      return;
    }

    await queryInterface.changeColumn("requirements", "priority", {
      type: Sequelize.ENUM("low", "medium", "high", "urgent"),
      allowNull: false,
      defaultValue: "medium"
    });
  },

  async down(queryInterface, Sequelize) {
    let table;

    try {
      table = await queryInterface.describeTable("requirements");
    } catch {
      return;
    }

    if (!table.priority) {
      return;
    }

    await queryInterface.changeColumn("requirements", "priority", {
      type: Sequelize.ENUM("low", "medium", "high"),
      allowNull: false,
      defaultValue: "medium"
    });
  }
};
