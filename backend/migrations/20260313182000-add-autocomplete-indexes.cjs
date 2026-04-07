"use strict";

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
    return normalizeFieldList(index.fields || []) === target;
  });
};

module.exports = {
  async up(queryInterface) {
    const companyIndexes = await safeShowIndex(queryInterface, "companies");
    if (companyIndexes) {
      if (!hasIndex(companyIndexes, "idx_company_workspace_location", ["workspace_id", "location"])) {
        await queryInterface.addIndex("companies", ["workspace_id", "location"], {
          name: "idx_company_workspace_location"
        });
      }
      if (!hasIndex(companyIndexes, "idx_company_user_location", ["user_id", "location"])) {
        await queryInterface.addIndex("companies", ["user_id", "location"], {
          name: "idx_company_user_location"
        });
      }
    }

    const contactIndexes = await safeShowIndex(queryInterface, "contacts");
    if (contactIndexes) {
      if (!hasIndex(contactIndexes, "idx_contact_company_name", ["company_id", "name"])) {
        await queryInterface.addIndex("contacts", ["company_id", "name"], {
          name: "idx_contact_company_name"
        });
      }
      if (!hasIndex(contactIndexes, "idx_contact_company_email", ["company_id", "email"])) {
        await queryInterface.addIndex("contacts", ["company_id", "email"], {
          name: "idx_contact_company_email"
        });
      }
    }
  },

  async down(queryInterface) {
    const safeRemove = async (tableName, indexName) => {
      try {
        await queryInterface.removeIndex(tableName, indexName);
      } catch {
        // Ignore missing indexes.
      }
    };

    await safeRemove("contacts", "idx_contact_company_email");
    await safeRemove("contacts", "idx_contact_company_name");
    await safeRemove("companies", "idx_company_user_location");
    await safeRemove("companies", "idx_company_workspace_location");
  }
};
