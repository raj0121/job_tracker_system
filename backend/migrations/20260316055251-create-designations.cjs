"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let tableExists = true;

    try {
      await queryInterface.describeTable("designations");
    } catch {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("designations", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        department_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
    }

    const indexes = await queryInterface.showIndex("designations");
    const hasDepartmentIndex = indexes.some((index) =>
      (index.fields || []).some((field) =>
        field.attribute === "department_id" || field.name === "department_id"
      )
    );

    if (!hasDepartmentIndex) {
      await queryInterface.addIndex("designations", ["department_id"], {
        name: "designations_department_id"
      });
    }
  },

  async down(queryInterface) {
    let tableExists = true;

    try {
      await queryInterface.describeTable("designations");
    } catch {
      tableExists = false;
    }

    if (tableExists) {
      await queryInterface.dropTable("designations");
    }
  }
};
