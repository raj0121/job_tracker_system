"use strict";

const normalizeTableName = (entry) => {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  return entry.tableName || entry.name || String(entry);
};

const loadExistingTables = async (queryInterface) => {
  const tables = await queryInterface.showAllTables();
  return new Set(tables.map((entry) => normalizeTableName(entry).toLowerCase()));
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await loadExistingTables(queryInterface);
    const hasTable = (name) => existing.has(name.toLowerCase());

    const createBasicMaster = async (tableName) => {
      if (!hasTable(tableName)) {
        await queryInterface.createTable(tableName, {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
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
    };

    // Essential Master Tables for Hybrid Inputs
    await createBasicMaster("industries");
    await createBasicMaster("education_groups");
    await createBasicMaster("education_types");
    await createBasicMaster("specializations");
    await createBasicMaster("keywords");

    // Source Master Tables
    await createBasicMaster("master_enquiry_sources");
    await createBasicMaster("master_reference_sources");
    await createBasicMaster("master_candidate_sources");

    // Industry and Keywords might benefit from extra fields eventually,
    // but for now they follow the standard pattern.
    // Let's add description to industries if it's missing but table exists.
    if (hasTable("industries")) {
        try {
            const table = await queryInterface.describeTable("industries");
            if (!table.description) {
                await queryInterface.addColumn("industries", "description", {
                    type: Sequelize.TEXT,
                    allowNull: true
                });
            }
        } catch (e) {
            // Table might have just been created, describeTable might fail in some sync scenarios
        }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("industries");
    await queryInterface.dropTable("education_groups");
    await queryInterface.dropTable("education_types");
    await queryInterface.dropTable("specializations");
    await queryInterface.dropTable("keywords");
    await queryInterface.dropTable("master_enquiry_sources");
    await queryInterface.dropTable("master_reference_sources");
    await queryInterface.dropTable("master_candidate_sources");
  }
};
