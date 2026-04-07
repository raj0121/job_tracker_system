export default (sequelize, DataTypes) => {
  const EnquirySource = sequelize.define("EnquirySource", {
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
    tableName: "master_enquiry_sources",
    timestamps: true
  });

  return EnquirySource;
};
