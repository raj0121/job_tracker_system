"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let table;

    try {
      table = await queryInterface.describeTable("employees");
    } catch {
      return;
    }

    const addColumnIfMissing = async (column, definition) => {
      if (!table[column]) {
        await queryInterface.addColumn("employees", column, definition);
        table[column] = definition;
      }
    };

    await addColumnIfMissing("name", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await addColumnIfMissing("email", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await addColumnIfMissing("phone", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await addColumnIfMissing("role", {
      type: Sequelize.ENUM("superadmin", "admin", "recruiter"),
      allowNull: true,
      defaultValue: "recruiter"
    });

    await addColumnIfMissing("password", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await addColumnIfMissing("department_id", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing("designation_id", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing("createdAt", {
      type: Sequelize.DATE,
      allowNull: true
    });

    await addColumnIfMissing("updatedAt", {
      type: Sequelize.DATE,
      allowNull: true
    });

    const indexes = await queryInterface.showIndex("employees");
    const hasIndex = (indexName, column) => indexes.some((i) => (
      i.name === indexName
      || (i.fields || []).some((f) => f.name === column || f.attribute === column)
    ));

    const hasEmailIndex = hasIndex("employees_email_unique", "email");

    if (!hasEmailIndex && table.email) {
      await queryInterface.addIndex("employees", ["email"], {
        name: "employees_email_unique",
        unique: true
      });
    }

    const hasDepartmentIndex = hasIndex("employees_department_id", "department_id");

    if (!hasDepartmentIndex && table.department_id) {
      await queryInterface.addIndex("employees", ["department_id"], {
        name: "employees_department_id"
      });
    }

    const hasDesignationIndex = hasIndex("employees_designation_id", "designation_id");

    if (!hasDesignationIndex && table.designation_id) {
      await queryInterface.addIndex("employees", ["designation_id"], {
        name: "employees_designation_id"
      });
    }
  },

  async down(queryInterface) {
    let table;

    try {
      table = await queryInterface.describeTable("employees");
    } catch {
      return;
    }

    const removeColumnIfExists = async (column) => {
      if (table[column]) {
        await queryInterface.removeColumn("employees", column);
      }
    };

    await removeColumnIfExists("name");
    await removeColumnIfExists("email");
    await removeColumnIfExists("phone");
    await removeColumnIfExists("role");
    await removeColumnIfExists("password");
    await removeColumnIfExists("department_id");
    await removeColumnIfExists("designation_id");
    await removeColumnIfExists("createdAt");
    await removeColumnIfExists("updatedAt");
  }
};
