export default (sequelize, DataTypes) => {
  const Permission = sequelize.define("Permission", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    module: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    action: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    scope: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active"
    }
  }, {
    tableName: "permissions",
    timestamps: true,
    indexes: [
      { fields: ["key"], unique: true },
      { fields: ["module"] },
      { fields: ["status"] }
    ]
  });

  return Permission;
};
