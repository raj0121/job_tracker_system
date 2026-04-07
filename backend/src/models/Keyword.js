export default (sequelize, DataTypes) => {
  const Keyword = sequelize.define("Keyword", {
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
    tableName: "keywords",
    timestamps: true
  });

  return Keyword;
};
