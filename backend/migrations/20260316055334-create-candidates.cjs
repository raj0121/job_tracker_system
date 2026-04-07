"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let tableExists = true;

    try {
      await queryInterface.describeTable("candidates");
    } catch {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("candidates", {
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
          allowNull: true
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: true
        },
        resume_url: {
          type: Sequelize.STRING,
          allowNull: true
        },
        applied_position: {
          type: Sequelize.STRING,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM("New", "Screening", "Interview", "Rejected", "Hired"),
          defaultValue: "New"
        },
        created_by: {
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

    const indexes = await queryInterface.showIndex("candidates");
    const hasCreatedByIndex = indexes.some((index) =>
      (index.fields || []).some((field) =>
        field.attribute === "created_by" || field.name === "created_by"
      )
    );

    if (!hasCreatedByIndex) {
      await queryInterface.addIndex("candidates", ["created_by"], {
        name: "candidates_created_by"
      });
    }
  },

  async down(queryInterface) {
    let tableExists = true;

    try {
      await queryInterface.describeTable("candidates");
    } catch {
      tableExists = false;
    }

    if (tableExists) {
      await queryInterface.dropTable("candidates");
    }
  }
};
