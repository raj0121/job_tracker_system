"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("queue_jobs", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "PENDING"
      },
      attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      max_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 3
      },
      payload: {
        type: Sequelize.JSON
      },
      result: {
        type: Sequelize.JSON
      },
      error_message: {
        type: Sequelize.TEXT
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable("queue_jobs");
  }
};
