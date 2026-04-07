export default (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false
      },
      resource: {
        type: DataTypes.STRING,
        allowNull: false
      },
      resource_id: {
        type: DataTypes.INTEGER
      }
    },
    {
      tableName: "audit_logs",
      timestamps: true
    }
  );

  return AuditLog;
};
