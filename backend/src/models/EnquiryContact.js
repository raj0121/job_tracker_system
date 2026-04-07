export default (sequelize, DataTypes) => {
  const EnquiryContact = sequelize.define("EnquiryContact", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    enquiry_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mobile: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    designation: {
      type: DataTypes.STRING
    }
  }, {
    tableName: "enquiry_contacts",
    timestamps: true,
    indexes: [
      { fields: ["enquiry_id"] }
    ]
  });

  return EnquiryContact;
};
