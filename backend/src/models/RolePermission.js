export default (sequelize, DataTypes) => {
  const RolePermission = sequelize.define("RolePermission", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    permission_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: "role_permissions",
    timestamps: true,
    indexes: [
      { fields: ["role_id"] },
      { fields: ["permission_id"] },
      { fields: ["role_id", "permission_id"], unique: true }
    ]
  });

  return RolePermission;
};
