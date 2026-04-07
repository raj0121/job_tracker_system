export default (sequelize, DataTypes) => {
  const EducationGroup = sequelize.define("EducationGroup", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    tableName: "education_groups",
    timestamps: true
  });

  return EducationGroup;
};
