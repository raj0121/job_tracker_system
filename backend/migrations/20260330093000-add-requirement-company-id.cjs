"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let table;

    try {
      table = await queryInterface.describeTable("requirements");
    } catch {
      return;
    }

    if (!table.company_id) {
      await queryInterface.addColumn("requirements", "company_id", {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    try {
      const indexes = await queryInterface.showIndex("requirements");
      const hasCompanyIndex = indexes.some((index) => index.name === "requirements_company_id");
      if (!hasCompanyIndex) {
        await queryInterface.addIndex("requirements", ["company_id"], {
          name: "requirements_company_id"
        });
      }
    } catch {
      // Keep migration idempotent if index inspection fails.
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
      const hasCompanyIndex = indexes.some((index) => index.name === "requirements_company_id");
      if (hasCompanyIndex) {
        await queryInterface.removeIndex("requirements", "requirements_company_id");
      }
    } catch {
      // Ignore rollback index errors.
    }

    if (table.company_id) {
      await queryInterface.removeColumn("requirements", "company_id");
    }
  }
};
