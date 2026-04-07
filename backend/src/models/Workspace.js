export default (sequelize, DataTypes) => {
  const Workspace = sequelize.define(
    "Workspace",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT
      },
      is_private: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      settings: {
        type: DataTypes.JSON,
        defaultValue: {}
      }
    },
    {
      tableName: "workspaces",
      timestamps: true,
      paranoid: true
    }
  );

  return Workspace;
};
