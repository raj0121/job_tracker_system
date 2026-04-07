"use strict";

const normalizeFields = (fields = []) =>
  fields
    .map((field) => field.attribute || field.name || field)
    .join("|");

const findIndexNames = (indexes, predicate) =>
  (Array.isArray(indexes) ? indexes : [])
    .filter(predicate)
    .map((index) => index.name)
    .filter(Boolean);

module.exports = {
  async up(queryInterface) {
    const indexes = await queryInterface.showIndex("companies");

    const strayUniqueNameIndexes = findIndexNames(
      indexes,
      (index) => index.unique && normalizeFields(index.fields || []) === "name" && index.name !== "PRIMARY"
    );

    for (const indexName of strayUniqueNameIndexes) {
      await queryInterface.removeIndex("companies", indexName);
    }

    const refreshedIndexes = await queryInterface.showIndex("companies");
    const hasCompanyNameIndex = refreshedIndexes.some((index) => index.name === "idx_company_name");

    if (!hasCompanyNameIndex) {
      await queryInterface.addIndex("companies", ["name"], {
        name: "idx_company_name"
      });
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex("companies", "idx_company_name");
    } catch {
      // Ignore missing index.
    }

    const indexes = await queryInterface.showIndex("companies");
    const hasUniqueNameIndex = indexes.some(
      (index) => index.unique && normalizeFields(index.fields || []) === "name"
    );

    if (!hasUniqueNameIndex) {
      await queryInterface.addIndex("companies", ["name"], {
        unique: true,
        name: "companies_name_unique"
      });
    }
  }
};
