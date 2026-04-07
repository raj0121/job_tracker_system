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

    await addColumnIfMissing("client_name", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("end_client_name", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("industry", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("client_job_id", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("min_exp_year", { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing("min_exp_month", { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing("email_subject", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("country", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("state", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("city", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("zip_code", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("job_type", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("workplace_type", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("duration_year", { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing("keywords", { type: Sequelize.TEXT, allowNull: true });
    await addColumnIfMissing("education", { type: Sequelize.JSON, allowNull: true });
    await addColumnIfMissing("file_url", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("file_original_name", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("file_mime_type", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("file_size", { type: Sequelize.INTEGER, allowNull: true });
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

    await removeColumnIfExists("file_size");
    await removeColumnIfExists("file_mime_type");
    await removeColumnIfExists("file_original_name");
    await removeColumnIfExists("file_url");
    await removeColumnIfExists("education");
    await removeColumnIfExists("keywords");
    await removeColumnIfExists("duration_year");
    await removeColumnIfExists("workplace_type");
    await removeColumnIfExists("job_type");
    await removeColumnIfExists("zip_code");
    await removeColumnIfExists("city");
    await removeColumnIfExists("state");
    await removeColumnIfExists("country");
    await removeColumnIfExists("email_subject");
    await removeColumnIfExists("min_exp_month");
    await removeColumnIfExists("min_exp_year");
    await removeColumnIfExists("client_job_id");
    await removeColumnIfExists("industry");
    await removeColumnIfExists("end_client_name");
    await removeColumnIfExists("client_name");
  }
};
