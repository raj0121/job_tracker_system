export default (sequelize, DataTypes) => {
  const EducationType = sequelize.define("EducationType", {
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
    tableName: "education_types",
    timestamps: true
  });

  return EducationType;
};
