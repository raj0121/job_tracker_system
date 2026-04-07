export default (sequelize, DataTypes) => {
  const WorkspaceMember = sequelize.define("WorkspaceMember", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    workspace_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM("owner", "member", "viewer"),
      defaultValue: "member"
    }
  }, {
    tableName: "workspace_members",
    timestamps: true,
    uniqueKeys: {
      unique_workspace_user: {
        fields: ["workspace_id", "user_id"]
      }
    }
  });

  return WorkspaceMember;
};
