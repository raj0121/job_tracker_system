"use strict";

const safeDescribe = async (queryInterface, tableName) => {
  try {
    return await queryInterface.describeTable(tableName);
  } catch {
    return null;
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const users = await safeDescribe(queryInterface, "users");

    if (users) {
      if (!users.tenant_id) {
        await queryInterface.addColumn("users", "tenant_id", {
          type: Sequelize.INTEGER,
          allowNull: true
        });
      }

      if (!users.headline) {
        await queryInterface.addColumn("users", "headline", {
          type: Sequelize.STRING(160),
          allowNull: true
        });
      }

      if (!users.bio) {
        await queryInterface.addColumn("users", "bio", {
          type: Sequelize.TEXT,
          allowNull: true
        });
      }

      if (!users.location) {
        await queryInterface.addColumn("users", "location", {
          type: Sequelize.STRING(160),
          allowNull: true
        });
      }

      if (!users.phone) {
        await queryInterface.addColumn("users", "phone", {
          type: Sequelize.STRING(40),
          allowNull: true
        });
      }

      if (!users.linkedin_url) {
        await queryInterface.addColumn("users", "linkedin_url", {
          type: Sequelize.STRING,
          allowNull: true
        });
      }

      if (!users.website_url) {
        await queryInterface.addColumn("users", "website_url", {
          type: Sequelize.STRING,
          allowNull: true
        });
      }

      if (!users.avatar_url) {
        await queryInterface.addColumn("users", "avatar_url", {
          type: Sequelize.STRING(255),
          allowNull: true
        });
      }

      if (!users.failedLoginAttempts) {
        await queryInterface.addColumn("users", "failedLoginAttempts", {
          type: Sequelize.INTEGER,
          defaultValue: 0
        });
      }

      if (!users.lockUntil) {
        await queryInterface.addColumn("users", "lockUntil", {
          type: Sequelize.DATE,
          allowNull: true
        });
      }

      if (!users.lastLoginAt) {
        await queryInterface.addColumn("users", "lastLoginAt", {
          type: Sequelize.DATE,
          allowNull: true
        });
      }

      if (!users.isActive) {
        await queryInterface.addColumn("users", "isActive", {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        });
      }

      if (users.role) {
        await queryInterface.changeColumn("users", "role", {
          type: Sequelize.ENUM("admin", "recruiter", "user", "superadmin"),
          allowNull: false,
          defaultValue: "user"
        });
      }
    }

    const jobs = await safeDescribe(queryInterface, "job_applications");

    if (jobs) {
      if (!jobs.company_id) {
        await queryInterface.addColumn("job_applications", "company_id", {
          type: Sequelize.INTEGER,
          allowNull: true
        });
      }

      if (!jobs.workspace_id) {
        await queryInterface.addColumn("job_applications", "workspace_id", {
          type: Sequelize.INTEGER,
          allowNull: true
        });
      }

      if (!jobs.application_source) {
        await queryInterface.addColumn("job_applications", "application_source", {
          type: Sequelize.ENUM(
            "LinkedIn",
            "Company Website",
            "Referral",
            "Job Board",
            "Agency",
            "Networking",
            "Other"
          ),
          allowNull: false,
          defaultValue: "Other"
        });
      }

      if (!jobs.priority) {
        await queryInterface.addColumn("job_applications", "priority", {
          type: Sequelize.ENUM("Low", "Medium", "High", "Critical"),
          allowNull: false,
          defaultValue: "Medium"
        });
      }

      if (!jobs.duplicate_of_job_id) {
        await queryInterface.addColumn("job_applications", "duplicate_of_job_id", {
          type: Sequelize.INTEGER,
          allowNull: true
        });
      }

      if (!jobs.is_duplicate) {
        await queryInterface.addColumn("job_applications", "is_duplicate", {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        });
      }

      if (!jobs.job_type) {
        await queryInterface.addColumn("job_applications", "job_type", {
          type: Sequelize.ENUM("Full-time", "Part-time", "Contract", "Freelance", "Internship"),
          defaultValue: "Full-time"
        });
      }

      if (!jobs.salary_range) {
        await queryInterface.addColumn("job_applications", "salary_range", {
          type: Sequelize.STRING,
          allowNull: true
        });
      }

      if (!jobs.job_description_url) {
        await queryInterface.addColumn("job_applications", "job_description_url", {
          type: Sequelize.STRING,
          allowNull: true
        });
      }

      if (!jobs.company_website) {
        await queryInterface.addColumn("job_applications", "company_website", {
          type: Sequelize.STRING,
          allowNull: true
        });
      }

      if (!jobs.internal_notes) {
        await queryInterface.addColumn("job_applications", "internal_notes", {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: []
        });
      }

      if (!jobs.activity_feed) {
        await queryInterface.addColumn("job_applications", "activity_feed", {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: []
        });
      }

      if (!jobs.applied_at) {
        await queryInterface.addColumn("job_applications", "applied_at", {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        });
      }

      if (jobs.status) {
        await queryInterface.sequelize.query(
          "UPDATE job_applications SET status = 'Interviewing' WHERE status = 'Interview'"
        );
        await queryInterface.changeColumn("job_applications", "status", {
          type: Sequelize.ENUM(
            "Applied",
            "Screening",
            "Interviewing",
            "Technical Test",
            "Final Round",
            "Rejected",
            "Offer",
            "Hired"
          ),
          allowNull: false,
          defaultValue: "Applied"
        });
      }
    }

    const contactInteractions = await safeDescribe(queryInterface, "contact_interactions");

    if (contactInteractions && !contactInteractions.follow_up_notified_at) {
      await queryInterface.addColumn("contact_interactions", "follow_up_notified_at", {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const users = await safeDescribe(queryInterface, "users");
    if (users?.avatar_url) {
      await queryInterface.removeColumn("users", "avatar_url");
    }
    if (users?.website_url) {
      await queryInterface.removeColumn("users", "website_url");
    }
    if (users?.linkedin_url) {
      await queryInterface.removeColumn("users", "linkedin_url");
    }
    if (users?.phone) {
      await queryInterface.removeColumn("users", "phone");
    }
    if (users?.location) {
      await queryInterface.removeColumn("users", "location");
    }
    if (users?.bio) {
      await queryInterface.removeColumn("users", "bio");
    }
    if (users?.headline) {
      await queryInterface.removeColumn("users", "headline");
    }
    if (users?.tenant_id) {
      await queryInterface.removeColumn("users", "tenant_id");
    }
    if (users?.failedLoginAttempts) {
      await queryInterface.removeColumn("users", "failedLoginAttempts");
    }
    if (users?.lockUntil) {
      await queryInterface.removeColumn("users", "lockUntil");
    }
    if (users?.lastLoginAt) {
      await queryInterface.removeColumn("users", "lastLoginAt");
    }
    if (users?.isActive) {
      await queryInterface.removeColumn("users", "isActive");
    }

    if (users?.role) {
      await queryInterface.changeColumn("users", "role", {
        type: Sequelize.ENUM("user", "admin"),
        allowNull: false,
        defaultValue: "user"
      });
    }

    const jobs = await safeDescribe(queryInterface, "job_applications");

    if (jobs?.applied_at) {
      await queryInterface.removeColumn("job_applications", "applied_at");
    }
    if (jobs?.activity_feed) {
      await queryInterface.removeColumn("job_applications", "activity_feed");
    }
    if (jobs?.internal_notes) {
      await queryInterface.removeColumn("job_applications", "internal_notes");
    }
    if (jobs?.company_website) {
      await queryInterface.removeColumn("job_applications", "company_website");
    }
    if (jobs?.job_description_url) {
      await queryInterface.removeColumn("job_applications", "job_description_url");
    }
    if (jobs?.salary_range) {
      await queryInterface.removeColumn("job_applications", "salary_range");
    }
    if (jobs?.job_type) {
      await queryInterface.removeColumn("job_applications", "job_type");
    }
    if (jobs?.is_duplicate) {
      await queryInterface.removeColumn("job_applications", "is_duplicate");
    }
    if (jobs?.duplicate_of_job_id) {
      await queryInterface.removeColumn("job_applications", "duplicate_of_job_id");
    }
    if (jobs?.priority) {
      await queryInterface.removeColumn("job_applications", "priority");
    }
    if (jobs?.application_source) {
      await queryInterface.removeColumn("job_applications", "application_source");
    }
    if (jobs?.workspace_id) {
      await queryInterface.removeColumn("job_applications", "workspace_id");
    }
    if (jobs?.company_id) {
      await queryInterface.removeColumn("job_applications", "company_id");
    }

    if (jobs?.status) {
      await queryInterface.sequelize.query(
        "UPDATE job_applications SET status = 'Interview' WHERE status = 'Interviewing'"
      );
      await queryInterface.changeColumn("job_applications", "status", {
        type: Sequelize.ENUM("Applied", "Interview", "Rejected", "Offer"),
        defaultValue: "Applied"
      });
    }

    const contactInteractions = await safeDescribe(queryInterface, "contact_interactions");
    if (contactInteractions?.follow_up_notified_at) {
      await queryInterface.removeColumn("contact_interactions", "follow_up_notified_at");
    }
  }
};
