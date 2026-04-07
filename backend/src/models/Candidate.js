export default (sequelize, DataTypes) => {
  const Candidate = sequelize.define("Candidate", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resume_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    applied_position: {
      type: DataTypes.STRING,
      allowNull: true
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    designation_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    compensation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    current_salary: {
      type: DataTypes.STRING,
      allowNull: true
    },
    expected_salary: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tax_terms: {
      type: DataTypes.STRING,
      allowNull: true
    },
    experience_years: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    experience_months: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    work_authorization: {
      type: DataTypes.STRING,
      allowNull: true
    },
    availability_days: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    native_place: {
      type: DataTypes.STRING,
      allowNull: true
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    zip_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    relocate: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true
    },
    education_group: {
      type: DataTypes.STRING,
      allowNull: true
    },
    education_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    university: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cgpa: {
      type: DataTypes.STRING,
      allowNull: true
    },
    education_year: {
      type: DataTypes.STRING,
      allowNull: true
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: true
    },
    educations: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    experiences: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM("New", "Screening", "Interview", "Rejected", "Hired"),
      defaultValue: "New"
    },
    requirement_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    client_job_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    assignment_role: {
      type: DataTypes.STRING,
      allowNull: true
    },
    assignment_remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: "candidates",
    timestamps: true,
    indexes: [
      { fields: ["created_by"] }
    ]
  });

  return Candidate;
};
