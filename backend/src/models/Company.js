export default (sequelize, DataTypes) => {
  const Company = sequelize.define("Company", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    workspace_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    industry: {
      type: DataTypes.STRING
    },
    website: {
      type: DataTypes.STRING,
      validate: { isUrl: true }
    },
    location: {
      type: DataTypes.STRING
    },
    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    is_blacklisted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    blacklist_reason: {
      type: DataTypes.TEXT
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: "companies",
    timestamps: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["workspace_id"] },
      { fields: ["name"] },
      { fields: ["workspace_id", "name"] },
      { fields: ["user_id", "name"] }
    ]
  });

  return Company;
};
