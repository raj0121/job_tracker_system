export default (sequelize, DataTypes) => {
  const EnquiryAttachment = sequelize.define("EnquiryAttachment", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    enquiry_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    original_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mime_type: {
      type: DataTypes.STRING
    },
    file_size: {
      type: DataTypes.INTEGER
    }
  }, {
    tableName: "enquiry_attachments",
    timestamps: true,
    indexes: [
      { fields: ["enquiry_id"] }
    ]
  });

  return EnquiryAttachment;
};
