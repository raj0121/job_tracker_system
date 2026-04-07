"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let tableExists = true;

    try {
      await queryInterface.describeTable("requirements");
    } catch {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("requirements", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false
        },
        department: {
          type: Sequelize.STRING
        },
        openings: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        priority: {
          type: Sequelize.ENUM("low", "medium", "high"),
          allowNull: false,
          defaultValue: "medium"
        },
        status: {
          type: Sequelize.ENUM("open", "on_hold", "closed"),
          allowNull: false,
          defaultValue: "open"
        },
        owner: {
          type: Sequelize.STRING
        },
        due_date: {
          type: Sequelize.DATE,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: false
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

    const indexes = await queryInterface.showIndex("requirements");
    const hasIndex = (indexName, column) => indexes.some((i) => (
      i.name === indexName
      || (i.fields || []).some((f) => f.name === column || f.attribute === column)
    ));

    const hasStatusIndex = hasIndex("requirements_status", "status");
    const hasPriorityIndex = hasIndex("requirements_priority", "priority");
    const hasCreatedByIndex = hasIndex("requirements_created_by", "created_by");

    if (!hasStatusIndex) {
      await queryInterface.addIndex("requirements", ["status"], {
        name: "requirements_status"
      });
    }
    if (!hasPriorityIndex) {
      await queryInterface.addIndex("requirements", ["priority"], {
        name: "requirements_priority"
      });
    }
    if (!hasCreatedByIndex) {
      await queryInterface.addIndex("requirements", ["created_by"], {
        name: "requirements_created_by"
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("requirements");
  }
};
