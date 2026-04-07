"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("queue_jobs");

    if (!table.scheduled_for) {
      await queryInterface.addColumn("queue_jobs", "scheduled_for", {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    const indexes = await queryInterface.showIndex("queue_jobs");
    const hasScheduledIndex = indexes.some((index) =>
      (index.fields || []).some((field) =>
        field.attribute === "scheduled_for" || field.name === "scheduled_for"
      )
    );

    if (!hasScheduledIndex) {
      await queryInterface.addIndex("queue_jobs", ["scheduled_for"], {
        name: "queue_jobs_scheduled_for_idx"
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("queue_jobs");
    const indexes = await queryInterface.showIndex("queue_jobs");
    const scheduledIndex = indexes.find((index) =>
      (index.fields || []).some((field) =>
        field.attribute === "scheduled_for" || field.name === "scheduled_for"
      )
    );

    if (scheduledIndex) {
      await queryInterface.removeIndex("queue_jobs", scheduledIndex.name);
    }

    if (table.scheduled_for) {
      await queryInterface.removeColumn("queue_jobs", "scheduled_for");
    }
  }
};
