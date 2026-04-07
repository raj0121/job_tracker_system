"use strict";

const permissionSeeds = [
  ["masters:read:any", "masters", "read", "any", "Read master data"],
  ["masters:write:any", "masters", "write", "any", "Manage master data"],
  ["candidates:read:any", "candidates", "read", "any", "Read candidates"],
  ["candidates:write:any", "candidates", "write", "any", "Manage candidates"],
  ["requirements:read:any", "requirements", "read", "any", "Read requirements"],
  ["requirements:write:any", "requirements", "write", "any", "Manage requirements"],
  ["enquiries:read:any", "enquiries", "read", "any", "Read enquiries"],
  ["enquiries:write:any", "enquiries", "write", "any", "Manage enquiries"],
  ["reports:read:any", "reports", "read", "any", "Read reports"],
  ["reports:export:own", "reports", "export", "own", "Export own reports"],
  ["reports:export:any", "reports", "export", "any", "Export any reports"],
  ["users:read:any", "users", "read", "any", "Read users"],
  ["users:write:any", "users", "write", "any", "Manage users"],
  ["analytics:read:any", "analytics", "read", "any", "Read analytics"]
];

const roleSeeds = [
  {
    key: "superadmin",
    name: "SuperAdmin",
    description: "Full platform access",
    permissions: ["*"]
  },
  {
    key: "admin",
    name: "Admin",
    description: "Administrative access to platform modules",
    permissions: permissionSeeds.map(([key]) => key).filter((key) => key !== "reports:export:any")
  },
  {
    key: "hr",
    name: "HR",
    description: "Hiring operations and candidate management",
    permissions: [
      "masters:read:any",
      "candidates:read:any",
      "candidates:write:any",
      "requirements:read:any",
      "requirements:write:any",
      "enquiries:read:any",
      "enquiries:write:any",
      "reports:read:any",
      "reports:export:own"
    ]
  },
  {
    key: "recruiter",
    name: "Recruiter",
    description: "Recruitment workflow access",
    permissions: [
      "masters:read:any",
      "candidates:read:any",
      "candidates:write:any",
      "requirements:read:any",
      "requirements:write:any",
      "enquiries:read:any",
      "enquiries:write:any",
      "reports:read:any",
      "reports:export:own"
    ]
  }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((entry) => (entry.tableName || entry.name || entry).toString().toLowerCase()));
    const hasTable = (name) => existing.has(name.toLowerCase());

    if (!hasTable("roles")) {
      await queryInterface.createTable("roles", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        key: { type: Sequelize.STRING(100), allowNull: false, unique: true },
        name: { type: Sequelize.STRING(150), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.ENUM("active", "inactive"), allowNull: false, defaultValue: "active" },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }

    if (!hasTable("permissions")) {
      await queryInterface.createTable("permissions", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        key: { type: Sequelize.STRING(150), allowNull: false, unique: true },
        module: { type: Sequelize.STRING(80), allowNull: false },
        action: { type: Sequelize.STRING(80), allowNull: false },
        scope: { type: Sequelize.STRING(80), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.ENUM("active", "inactive"), allowNull: false, defaultValue: "active" },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }

    if (!hasTable("role_permissions")) {
      await queryInterface.createTable("role_permissions", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        role_id: { type: Sequelize.INTEGER, allowNull: false },
        permission_id: { type: Sequelize.INTEGER, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
      await queryInterface.addIndex("role_permissions", ["role_id", "permission_id"], {
        unique: true,
        name: "role_permissions_role_permission_unique"
      });
    }

    if (!hasTable("locations")) {
      await queryInterface.createTable("locations", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: Sequelize.STRING, allowNull: false, unique: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.ENUM("active", "inactive"), allowNull: false, defaultValue: "active" },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }

    if (!hasTable("skills")) {
      await queryInterface.createTable("skills", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: Sequelize.STRING, allowNull: false, unique: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.ENUM("active", "inactive"), allowNull: false, defaultValue: "active" },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }

    try {
      await queryInterface.changeColumn("users", "role", {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "recruiter"
      });
    } catch {}

    try {
      await queryInterface.changeColumn("employees", "role", {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "recruiter"
      });
    } catch {}

    const now = new Date();
    const [roleRows] = await queryInterface.sequelize.query("SELECT id, `key` FROM roles");
    const roleMap = new Map(roleRows.map((row) => [row.key, row.id]));

    const [permissionRows] = await queryInterface.sequelize.query("SELECT id, `key` FROM permissions");
    const permissionMap = new Map(permissionRows.map((row) => [row.key, row.id]));

    for (const [key, module, action, scope, description] of permissionSeeds) {
      if (!permissionMap.has(key)) {
        await queryInterface.bulkInsert("permissions", [{
          key,
          module,
          action,
          scope,
          description,
          status: "active",
          createdAt: now,
          updatedAt: now
        }]);
      }
    }

    const [freshPermissionRows] = await queryInterface.sequelize.query("SELECT id, `key` FROM permissions");
    const freshPermissionMap = new Map(freshPermissionRows.map((row) => [row.key, row.id]));

    for (const role of roleSeeds) {
      if (!roleMap.has(role.key)) {
        await queryInterface.bulkInsert("roles", [{
          key: role.key,
          name: role.name,
          description: role.description,
          status: "active",
          createdAt: now,
          updatedAt: now
        }]);
      }
    }

    const [freshRoleRows] = await queryInterface.sequelize.query("SELECT id, `key` FROM roles");
    const freshRoleMap = new Map(freshRoleRows.map((row) => [row.key, row.id]));
    const [rolePermissionRows] = await queryInterface.sequelize.query("SELECT role_id, permission_id FROM role_permissions");
    const existingPairs = new Set(rolePermissionRows.map((row) => `${row.role_id}:${row.permission_id}`));

    for (const role of roleSeeds) {
      if (role.permissions.includes("*")) {
        continue;
      }

      const roleId = freshRoleMap.get(role.key);
      if (!roleId) {
        continue;
      }

      for (const permissionKey of role.permissions) {
        const permissionId = freshPermissionMap.get(permissionKey);
        if (!permissionId) {
          continue;
        }

        const pairKey = `${roleId}:${permissionId}`;
        if (!existingPairs.has(pairKey)) {
          await queryInterface.bulkInsert("role_permissions", [{
            role_id: roleId,
            permission_id: permissionId,
            createdAt: now,
            updatedAt: now
          }]);
          existingPairs.add(pairKey);
        }
      }
    }
  },

  async down(queryInterface) {
    for (const tableName of ["role_permissions", "permissions", "roles", "skills", "locations"]) {
      try {
        await queryInterface.dropTable(tableName);
      } catch {}
    }
  }
};
