"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let table;

    try {
      table = await queryInterface.describeTable("designations");
    } catch {
      return;
    }

    if (table.department_id && table.department_id.allowNull === false) {
      await queryInterface.changeColumn("designations", "department_id", {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    let table;

    try {
      table = await queryInterface.describeTable("designations");
    } catch {
      return;
    }

    if (table.department_id && table.department_id.allowNull === true) {
      await queryInterface.changeColumn("designations", "department_id", {
        type: Sequelize.INTEGER,
        allowNull: false
      });
    }
  }
};
