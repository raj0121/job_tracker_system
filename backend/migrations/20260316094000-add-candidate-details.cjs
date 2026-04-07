"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let table;

    try {
      table = await queryInterface.describeTable("candidates");
    } catch {
      return;
    }

    const addColumnIfMissing = async (name, definition) => {
      if (!table[name]) {
        await queryInterface.addColumn("candidates", name, definition);
      }
    };

    await addColumnIfMissing("department", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("compensation", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("current_salary", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("expected_salary", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("tax_terms", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("experience_years", { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing("experience_months", { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing("work_authorization", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("availability_days", { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing("native_place", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("country", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("state", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("city", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("zip_code", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("relocate", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false
    });
    await addColumnIfMissing("source", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("education_group", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("education_type", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("university", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("cgpa", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("education_year", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing("specialization", { type: Sequelize.STRING, allowNull: true });
  },

  async down(queryInterface) {
    let table;

    try {
      table = await queryInterface.describeTable("candidates");
    } catch {
      return;
    }

    const removeColumnIfExists = async (name) => {
      if (table[name]) {
        await queryInterface.removeColumn("candidates", name);
      }
    };

    await removeColumnIfExists("specialization");
    await removeColumnIfExists("education_year");
    await removeColumnIfExists("cgpa");
    await removeColumnIfExists("university");
    await removeColumnIfExists("education_type");
    await removeColumnIfExists("education_group");
    await removeColumnIfExists("source");
    await removeColumnIfExists("relocate");
    await removeColumnIfExists("zip_code");
    await removeColumnIfExists("city");
    await removeColumnIfExists("state");
    await removeColumnIfExists("country");
    await removeColumnIfExists("native_place");
    await removeColumnIfExists("availability_days");
    await removeColumnIfExists("work_authorization");
    await removeColumnIfExists("experience_months");
    await removeColumnIfExists("experience_years");
    await removeColumnIfExists("tax_terms");
    await removeColumnIfExists("expected_salary");
    await removeColumnIfExists("current_salary");
    await removeColumnIfExists("compensation");
    await removeColumnIfExists("department");
  }
};
