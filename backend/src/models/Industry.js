export default (sequelize, DataTypes) => {
  const Industry = sequelize.define("Industry", {
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
      type: DataTypes.TEXT
    }
  }, {
    tableName: "industries",
    timestamps: true
  });

  return Industry;
};
