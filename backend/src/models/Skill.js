export default (sequelize, DataTypes) => {
  const Skill = sequelize.define("Skill", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
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
    tableName: "skills",
    timestamps: true,
    indexes: [
      { fields: ["name"], unique: true },
      { fields: ["status"] }
    ]
  });

  return Skill;
};
