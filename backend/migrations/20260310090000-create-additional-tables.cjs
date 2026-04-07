"use strict";

const normalizeTableName = (entry) => {
  if (!entry) {
    return "";
  }
  if (typeof entry === "string") {
    return entry;
  }
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

    if (!hasTable("tenants")) {
      await queryInterface.createTable("tenants", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        slug: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        plan: {
          type: Sequelize.ENUM("free", "pro", "enterprise"),
          defaultValue: "free"
        },
        subscription_status: {
          type: Sequelize.ENUM("active", "past_due", "canceled", "incomplete"),
          defaultValue: "active"
        },
        settings: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
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
    }

    if (!hasTable("workspaces")) {
      await queryInterface.createTable("workspaces", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        tenant_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        is_private: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        settings: {
          type: Sequelize.JSON,
          defaultValue: {}
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
    }

    if (!hasTable("workspace_members")) {
      await queryInterface.createTable("workspace_members", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        workspace_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        role: {
          type: Sequelize.ENUM("owner", "admin", "member", "viewer"),
          defaultValue: "member"
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

      await queryInterface.addConstraint("workspace_members", {
        type: "unique",
        fields: ["workspace_id", "user_id"],
        name: "unique_workspace_user"
      });
    }

    if (!hasTable("companies")) {
      await queryInterface.createTable("companies", {
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
        industry: {
          type: Sequelize.STRING,
          allowNull: true
        },
        website: {
          type: Sequelize.STRING,
          allowNull: true
        },
        location: {
          type: Sequelize.STRING,
          allowNull: true
        },
        rating: {
          type: Sequelize.FLOAT,
          defaultValue: 0
        },
        is_blacklisted: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        blacklist_reason: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
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
    }

    if (!hasTable("contacts")) {
      await queryInterface.createTable("contacts", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        company_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        role: {
          type: Sequelize.STRING,
          allowNull: true
        },
        email: {
          type: Sequelize.STRING,
          allowNull: true
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: true
        },
        linkedin_url: {
          type: Sequelize.STRING,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        last_interaction_at: {
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
    }

    if (!hasTable("contact_interactions")) {
      await queryInterface.createTable("contact_interactions", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        company_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        contact_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        interaction_type: {
          type: Sequelize.ENUM("email", "call", "meeting", "message", "note"),
          allowNull: false,
          defaultValue: "email"
        },
        summary: {
          type: Sequelize.STRING,
          allowNull: false
        },
        detail: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        outcome: {
          type: Sequelize.STRING,
          allowNull: true
        },
        interacted_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        next_follow_up_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        follow_up_notified_at: {
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

      await queryInterface.addIndex("contact_interactions", ["company_id"]);
      await queryInterface.addIndex("contact_interactions", ["contact_id"]);
      await queryInterface.addIndex("contact_interactions", ["user_id"]);
      await queryInterface.addIndex("contact_interactions", ["interacted_at"]);
      await queryInterface.addIndex("contact_interactions", ["next_follow_up_at"]);
      await queryInterface.addIndex("contact_interactions", ["company_id", "interacted_at"]);
    }

    if (!hasTable("interviews")) {
      await queryInterface.createTable("interviews", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        job_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        scheduled_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        duration_minutes: {
          type: Sequelize.INTEGER,
          defaultValue: 60
        },
        location_type: {
          type: Sequelize.ENUM("online", "in-person", "phone"),
          defaultValue: "online"
        },
        location_url: {
          type: Sequelize.STRING,
          allowNull: true
        },
        interviewer_names: {
          type: Sequelize.STRING,
          allowNull: true
        },
        panel_details: {
          type: Sequelize.JSON,
          allowNull: true
        },
        calendar_event_ref: {
          type: Sequelize.STRING,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM("scheduled", "completed", "cancelled", "rescheduled"),
          defaultValue: "scheduled"
        },
        feedback: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        outcome: {
          type: Sequelize.ENUM("pending", "passed", "failed", "no_show"),
          defaultValue: "pending"
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

    if (!hasTable("documents")) {
      await queryInterface.createTable("documents", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        job_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        file_name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        original_name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        file_path: {
          type: Sequelize.STRING,
          allowNull: false
        },
        file_type: {
          type: Sequelize.ENUM("resume", "cover_letter", "portfolio", "other"),
          defaultValue: "resume"
        },
        mime_type: {
          type: Sequelize.STRING,
          allowNull: true
        },
        file_size: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        version: {
          type: Sequelize.INTEGER,
          defaultValue: 1
        },
        access_level: {
          type: Sequelize.ENUM("private", "workspace"),
          defaultValue: "private"
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
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

      await queryInterface.addIndex("documents", ["user_id"]);
      await queryInterface.addIndex("documents", ["job_id"]);
      await queryInterface.addIndex("documents", ["file_type", "version"]);
    }

    if (!hasTable("goals")) {
      await queryInterface.createTable("goals", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        workspace_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        title: {
          type: Sequelize.STRING(180),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        metric_type: {
          type: Sequelize.ENUM("applications", "interviews", "offers", "hires", "responses"),
          allowNull: false
        },
        target_value: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        current_value: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        is_auto_track: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        period_start: {
          type: Sequelize.DATE,
          allowNull: true
        },
        period_end: {
          type: Sequelize.DATE,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM("active", "completed", "paused", "archived"),
          allowNull: false,
          defaultValue: "active"
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

      await queryInterface.addIndex("goals", ["user_id"]);
      await queryInterface.addIndex("goals", ["workspace_id"]);
      await queryInterface.addIndex("goals", ["metric_type"]);
      await queryInterface.addIndex("goals", ["status"]);
      await queryInterface.addIndex("goals", ["period_start", "period_end"]);
    }

    if (!hasTable("login_histories")) {
      await queryInterface.createTable("login_histories", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        ip_address: {
          type: Sequelize.STRING,
          allowNull: true
        },
        user_agent: {
          type: Sequelize.STRING,
          allowNull: true
        },
        device_fingerprint: {
          type: Sequelize.STRING,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM("success", "failed"),
          defaultValue: "success"
        },
        failure_reason: {
          type: Sequelize.STRING,
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
    }

    if (!hasTable("user_sessions")) {
      await queryInterface.createTable("user_sessions", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        refresh_token_hash: {
          type: Sequelize.STRING(128),
          allowNull: false
        },
        ip_address: {
          type: Sequelize.STRING(64),
          allowNull: true
        },
        user_agent: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        device_fingerprint: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        revoked_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        last_seen_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
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

      await queryInterface.addIndex("user_sessions", ["user_id"]);
      await queryInterface.addIndex("user_sessions", ["is_active"]);
      await queryInterface.addIndex("user_sessions", ["expires_at"]);
      await queryInterface.addIndex("user_sessions", ["refresh_token_hash"], {
        unique: true
      });
    }

    if (!hasTable("saved_filters")) {
      await queryInterface.createTable("saved_filters", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(120),
          allowNull: false
        },
        scope: {
          type: Sequelize.ENUM("jobs", "companies", "interviews", "documents"),
          defaultValue: "jobs"
        },
        definition: {
          type: Sequelize.JSON,
          allowNull: false
        },
        is_default: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
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

      await queryInterface.addIndex("saved_filters", ["user_id"]);
      await queryInterface.addIndex("saved_filters", ["scope"]);
      await queryInterface.addIndex("saved_filters", ["user_id", "scope"]);
      await queryInterface.addIndex("saved_filters", ["user_id", "is_default"]);
    }

    if (!hasTable("scheduled_reports")) {
      await queryInterface.createTable("scheduled_reports", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(140),
          allowNull: false
        },
        frequency: {
          type: Sequelize.ENUM("daily", "weekly", "monthly"),
          defaultValue: "weekly"
        },
        recipients: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: []
        },
        filter_definition: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: {}
        },
        include_all_users: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        next_run_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        last_run_at: {
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

      await queryInterface.addIndex("scheduled_reports", ["user_id"]);
      await queryInterface.addIndex("scheduled_reports", ["is_active"]);
      await queryInterface.addIndex("scheduled_reports", ["next_run_at"]);
      await queryInterface.addIndex("scheduled_reports", ["user_id", "is_active"]);
    }

    if (!hasTable("billing_accounts")) {
      await queryInterface.createTable("billing_accounts", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        tenant_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        provider: {
          type: Sequelize.ENUM("stripe", "razorpay", "manual", "none"),
          allowNull: false,
          defaultValue: "manual"
        },
        customer_ref: {
          type: Sequelize.STRING(191),
          allowNull: true
        },
        subscription_ref: {
          type: Sequelize.STRING(191),
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM("active", "trialing", "past_due", "canceled", "incomplete"),
          allowNull: false,
          defaultValue: "active"
        },
        current_period_start: {
          type: Sequelize.DATE,
          allowNull: true
        },
        current_period_end: {
          type: Sequelize.DATE,
          allowNull: true
        },
        cancel_at_period_end: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: {}
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

      await queryInterface.addIndex("billing_accounts", ["tenant_id"], { unique: true });
      await queryInterface.addIndex("billing_accounts", ["provider"]);
      await queryInterface.addIndex("billing_accounts", ["status"]);
    }
  },

  async down(queryInterface) {
    const existing = await loadExistingTables(queryInterface);
    const dropIfExists = async (name) => {
      if (existing.has(name.toLowerCase())) {
        await queryInterface.dropTable(name);
      }
    };

    await dropIfExists("billing_accounts");
    await dropIfExists("scheduled_reports");
    await dropIfExists("saved_filters");
    await dropIfExists("user_sessions");
    await dropIfExists("login_histories");
    await dropIfExists("goals");
    await dropIfExists("documents");
    await dropIfExists("interviews");
    await dropIfExists("contact_interactions");
    await dropIfExists("contacts");
    await dropIfExists("companies");
    await dropIfExists("workspace_members");
    await dropIfExists("workspaces");
    await dropIfExists("tenants");
  }
};
