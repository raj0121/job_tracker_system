"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("job_applications", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      company_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      job_title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM("Applied", "Interview", "Rejected", "Offer"),
        defaultValue: "Applied"
      },
      location: {
        type: Sequelize.STRING
      },
      notes: {
        type: Sequelize.TEXT
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
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

    // await queryInterface.addIndex(
    //   "job_applications",
    //   ["user_id", "status", "createdAt"]
    // );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("job_applications");
  }
};
