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

    await addColumnIfMissing("max_exp_year", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing("max_exp_month", {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down(queryInterface) {
    let table;

    try {
      table = await queryInterface.describeTable("requirements");
    } catch {
      return;
    }

    const removeColumnIfExists = async (name) => {
      if (table[name]) {
        await queryInterface.removeColumn("requirements", name);
      }
    };

    await removeColumnIfExists("max_exp_month");
    await removeColumnIfExists("max_exp_year");
  }
};
