"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let tableExists = true;

    try {
      await queryInterface.describeTable("employees");
    } catch {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("employees", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },

        name: {
          type: Sequelize.STRING,
          allowNull: false
        },

        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },

        phone: {
          type: Sequelize.STRING
        },

        role: {
          type: Sequelize.ENUM("superadmin", "admin", "recruiter"),
          allowNull: false,
          defaultValue: "recruiter"
        },

        password: {
          type: Sequelize.STRING,
          allowNull: false
        },

        department_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },

        designation_id: {
          type: Sequelize.INTEGER,
          allowNull: true
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

    // INDEXES
    const indexes = await queryInterface.showIndex("employees");

    const hasEmailIndex = indexes.some((i) =>
      (i.fields || []).some((f) => f.name === "email")
    );

    if (!hasEmailIndex) {
      await queryInterface.addIndex("employees", ["email"], {
        name: "employees_email_unique",
        unique: true
      });
    }

    await queryInterface.addIndex("employees", ["department_id"], {
      name: "employees_department_id"
    });

    await queryInterface.addIndex("employees", ["designation_id"], {
      name: "employees_designation_id"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("employees");
  }
};