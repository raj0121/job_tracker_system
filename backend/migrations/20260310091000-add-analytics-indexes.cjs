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
    const existing = normalizeFieldList(index.fields || []);
    return existing === target;
  });
};

module.exports = {
  async up(queryInterface) {
    const jobIndexes = await safeShowIndex(queryInterface, "job_applications");
    if (jobIndexes) {
      if (!hasIndex(jobIndexes, "idx_job_user_workspace_created", ["user_id", "workspace_id", "createdAt"])) {
        await queryInterface.addIndex("job_applications", ["user_id", "workspace_id", "createdAt"], {
          name: "idx_job_user_workspace_created"
        });
      }
      if (!hasIndex(jobIndexes, "idx_job_user_status_created", ["user_id", "status", "createdAt"])) {
        await queryInterface.addIndex("job_applications", ["user_id", "status", "createdAt"], {
          name: "idx_job_user_status_created"
        });
      }
      if (!hasIndex(jobIndexes, "idx_job_user_company", ["user_id", "company_name"])) {
        await queryInterface.addIndex("job_applications", ["user_id", "company_name"], {
          name: "idx_job_user_company"
        });
      }
      if (!hasIndex(jobIndexes, "idx_job_user_location", ["user_id", "location"])) {
        await queryInterface.addIndex("job_applications", ["user_id", "location"], {
          name: "idx_job_user_location"
        });
      }
      if (!hasIndex(jobIndexes, "idx_job_user_source", ["user_id", "application_source"])) {
        await queryInterface.addIndex("job_applications", ["user_id", "application_source"], {
          name: "idx_job_user_source"
        });
      }
    }

    const historyIndexes = await safeShowIndex(queryInterface, "job_status_histories");
    if (historyIndexes) {
      if (!hasIndex(historyIndexes, "idx_jsh_user_changed", ["user_id", "changed_at"])) {
        await queryInterface.addIndex("job_status_histories", ["user_id", "changed_at"], {
          name: "idx_jsh_user_changed"
        });
      }
      if (!hasIndex(historyIndexes, "idx_jsh_job_status_changed", ["job_id", "to_status", "changed_at"])) {
        await queryInterface.addIndex("job_status_histories", ["job_id", "to_status", "changed_at"], {
          name: "idx_jsh_job_status_changed"
        });
      }
    }

    const interviewIndexes = await safeShowIndex(queryInterface, "interviews");
    if (interviewIndexes && !hasIndex(interviewIndexes, "idx_interviews_job_scheduled", ["job_id", "scheduled_at"])) {
      await queryInterface.addIndex("interviews", ["job_id", "scheduled_at"], {
        name: "idx_interviews_job_scheduled"
      });
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

    await safeRemove("interviews", "idx_interviews_job_scheduled");
    await safeRemove("job_status_histories", "idx_jsh_job_status_changed");
    await safeRemove("job_status_histories", "idx_jsh_user_changed");
    await safeRemove("job_applications", "idx_job_user_source");
    await safeRemove("job_applications", "idx_job_user_location");
    await safeRemove("job_applications", "idx_job_user_company");
    await safeRemove("job_applications", "idx_job_user_status_created");
    await safeRemove("job_applications", "idx_job_user_workspace_created");
  }
};
