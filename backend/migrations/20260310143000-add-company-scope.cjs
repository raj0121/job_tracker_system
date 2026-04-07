"use strict";

const safeDescribeTable = async (queryInterface, tableName) => {
  try {
    return await queryInterface.describeTable(tableName);
  } catch {
    return null;
  }
};

const safeShowIndex = async (queryInterface, tableName) => {
  try {
    return await queryInterface.showIndex(tableName);
  } catch {
    return null;
  }
};

const normalizeFieldList = (fields = []) =>
  fields
    .map((field) => {
      if (typeof field === "string") {
        return field;
      }
      return field.attribute || field.name;
    })
    .join("|");

const hasIndex = (indexes, name, fields = []) => {
  if (!Array.isArray(indexes)) {
    return false;
  }

  const target = fields.length ? normalizeFieldList(fields) : null;

  return indexes.some((index) => {
    if (index.name === name) {
      return true;
    }
    if (!target) {
      return false;
    }
    const existing = normalizeFieldList(index.fields || []);
    return existing === target;
  });
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await safeDescribeTable(queryInterface, "companies");
    if (table && !table.user_id) {
      await queryInterface.addColumn("companies", "user_id", {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    if (table && !table.workspace_id) {
      await queryInterface.addColumn("companies", "workspace_id", {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    const indexes = await safeShowIndex(queryInterface, "companies");
    if (Array.isArray(indexes)) {
      const nameIndex = indexes.find((index) => index.unique && normalizeFieldList(index.fields || []) === "name");
      if (nameIndex) {
        await queryInterface.removeIndex("companies", nameIndex.name);
      }

      if (!hasIndex(indexes, "idx_company_user", ["user_id"])) {
        await queryInterface.addIndex("companies", ["user_id"], { name: "idx_company_user" });
      }
      if (!hasIndex(indexes, "idx_company_workspace", ["workspace_id"])) {
        await queryInterface.addIndex("companies", ["workspace_id"], { name: "idx_company_workspace" });
      }
      if (!hasIndex(indexes, "idx_company_name", ["name"])) {
        await queryInterface.addIndex("companies", ["name"], { name: "idx_company_name" });
      }
      if (!hasIndex(indexes, "idx_company_workspace_name", ["workspace_id", "name"])) {
        await queryInterface.addIndex("companies", ["workspace_id", "name"], { name: "idx_company_workspace_name" });
      }
      if (!hasIndex(indexes, "idx_company_user_name", ["user_id", "name"])) {
        await queryInterface.addIndex("companies", ["user_id", "name"], { name: "idx_company_user_name" });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const safeRemoveIndex = async (name) => {
      try {
        await queryInterface.removeIndex("companies", name);
      } catch {
        // Ignore missing index.
      }
    };

    await safeRemoveIndex("idx_company_user_name");
    await safeRemoveIndex("idx_company_workspace_name");
    await safeRemoveIndex("idx_company_name");
    await safeRemoveIndex("idx_company_workspace");
    await safeRemoveIndex("idx_company_user");

    const table = await safeDescribeTable(queryInterface, "companies");
    if (table?.workspace_id) {
      await queryInterface.removeColumn("companies", "workspace_id");
    }
    if (table?.user_id) {
      await queryInterface.removeColumn("companies", "user_id");
    }

    if (table?.name) {
      try {
        await queryInterface.addIndex("companies", ["name"], {
          unique: true,
          name: "companies_name_unique"
        });
      } catch {
        // Ignore recreate failures.
      }
    }
  }
};
