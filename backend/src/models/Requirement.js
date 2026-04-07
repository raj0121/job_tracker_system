export default (sequelize, DataTypes) => {
  const Requirement = sequelize.define("Requirement", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    client_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    end_client_name: {
      type: DataTypes.STRING
    },
    position: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "title"
    },
    industry: {
      type: DataTypes.STRING
    },
    department: {
      type: DataTypes.STRING
    },
    company_id: {
      type: DataTypes.INTEGER
    },
    client_job_id: {
      type: DataTypes.STRING
    },
    min_exp_year: {
      type: DataTypes.INTEGER
    },
    min_exp_month: {
      type: DataTypes.INTEGER
    },
    max_exp_year: {
      type: DataTypes.INTEGER
    },
    max_exp_month: {
      type: DataTypes.INTEGER
    },
    no_of_positions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "openings"
    },
    assign_date: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "due_date"
    },
    assigned_to: {
      type: DataTypes.INTEGER
    },
    email_subject: {
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
    job_type: {
      type: DataTypes.STRING
    },
    workplace_type: {
      type: DataTypes.STRING
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "urgent"),
      defaultValue: "medium"
    },
    status: {
      type: DataTypes.ENUM("open", "on_hold", "closed"),
      defaultValue: "open"
    },
    duration_year: {
      type: DataTypes.INTEGER
    },
    duration_months: {
      type: DataTypes.INTEGER
    },
    keywords: {
      type: DataTypes.TEXT
    },
    description: {
      type: DataTypes.TEXT,
      field: "notes"
    },
    remarks: {
      type: DataTypes.TEXT
    },
    education: {
      type: DataTypes.JSON
    },
    file_url: {
      type: DataTypes.STRING
    },
    file_original_name: {
      type: DataTypes.STRING
    },
    file_mime_type: {
      type: DataTypes.STRING
    },
    file_size: {
      type: DataTypes.INTEGER
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: "requirements",
    timestamps: true,
    indexes: [
      { fields: ["client_job_id"], unique: true, name: "requirements_client_job_id_unique" },
      { fields: ["status"] },
      { fields: ["priority"] },
      { fields: ["company_id"] },
      { fields: ["assigned_to"], name: "requirements_assigned_to" },
      { fields: ["created_by"] }
    ]
  });

  return Requirement;
};
