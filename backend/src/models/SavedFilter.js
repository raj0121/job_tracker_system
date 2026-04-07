export default (sequelize, DataTypes) => {
  const SavedFilter = sequelize.define("SavedFilter", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    scope: {
      type: DataTypes.ENUM("jobs", "companies", "interviews", "documents"),
      defaultValue: "jobs"
    },
    definition: {
      type: DataTypes.JSON,
      allowNull: false
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: "saved_filters",
    timestamps: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["scope"] },
      { fields: ["user_id", "scope"] },
      { fields: ["user_id", "is_default"] }
    ]
  });

  return SavedFilter;
};
