export default (sequelize, DataTypes) => {
  const Enquiry = sequelize.define("Enquiry", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    client_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    contact_number: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    client_type: {
      type: DataTypes.STRING
    },
    country: {
      type: DataTypes.STRING
    },
    state: {
      type: DataTypes.STRING
    },
    city: {
      type: DataTypes.STRING
    },
    zip_code: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.TEXT
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    company_name: {
      type: DataTypes.STRING
    },
    industry: {
      type: DataTypes.STRING
    },
    reference_source: {
      type: DataTypes.STRING
    },
    enquiry_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    enquiry_source: {
      type: DataTypes.STRING
    },
    resource_profile_link: {
      type: DataTypes.STRING,
      validate: {
        isUrl: true
      }
    },
    remarks: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.ENUM("open", "assigned", "closed"),
      defaultValue: "open"
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: "enquiries",
    timestamps: true,
    indexes: [
      { fields: ["company_id"] },
      { fields: ["created_by"] },
      { fields: ["status"] },
      { fields: ["enquiry_date"] }
    ]
  });

  return Enquiry;
};
