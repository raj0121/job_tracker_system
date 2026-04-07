export default (sequelize, DataTypes) => {
  const Specialization = sequelize.define("Specialization", {
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
    tableName: "specializations",
    timestamps: true
  });

  return Specialization;
};
