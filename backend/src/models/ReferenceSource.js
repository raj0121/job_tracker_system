export default (sequelize, DataTypes) => {
  const ReferenceSource = sequelize.define("ReferenceSource", {
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
    tableName: "master_reference_sources",
    timestamps: true
  });

  return ReferenceSource;
};
