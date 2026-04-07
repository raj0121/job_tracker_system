export default (sequelize, DataTypes) => {
  const Contact = sequelize.define("Contact", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING // Recruiter, Hiring Manager, etc.
    },
    email: {
      type: DataTypes.STRING,
      validate: { isEmail: true }
    },
    phone: {
      type: DataTypes.STRING
    },
    linkedin_url: {
      type: DataTypes.STRING,
      validate: { isUrl: true }
    },
    notes: {
      type: DataTypes.TEXT
    },
    last_interaction_at: {
      type: DataTypes.DATE
    }
  }, {
    tableName: "contacts",
    timestamps: true
  });

  return Contact;
};
