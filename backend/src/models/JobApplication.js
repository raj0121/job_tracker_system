export default (sequelize, DataTypes) => {
  const JobApplication = sequelize.define(
    "JobApplication",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      company_name: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      workspace_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      job_title: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      application_source: {
        type: DataTypes.ENUM(
          "LinkedIn",
          "Company Website",
          "Referral",
          "Job Board",
          "Agency",
          "Networking",
          "Other"
        ),
        allowNull: false,
        defaultValue: "Other"
      },
      priority: {
        type: DataTypes.ENUM("Low", "Medium", "High", "Critical"),
        allowNull: false,
        defaultValue: "Medium"
      },
      duplicate_of_job_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      is_duplicate: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      status: {
        type: DataTypes.ENUM(
          "Applied",
          "Screening",
          "Interviewing",
          "Technical Test",
          "Final Round",
          "Rejected",
          "Offer",
          "Hired"
        ),
        allowNull: false,
        defaultValue: "Applied"
      },
      location: {
        type: DataTypes.STRING(150),
        allowNull: true
      },
      job_type: {
        type: DataTypes.ENUM("Full-time", "Part-time", "Contract", "Freelance", "Internship"),
        defaultValue: "Full-time"
      },
      salary_range: {
        type: DataTypes.STRING,
        allowNull: true
      },
      job_description_url: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isUrl: true }
      },
      company_website: {
        type: DataTypes.STRING,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      internal_notes: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      activity_feed: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      applied_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: "job_applications",
      timestamps: true,
      paranoid: true,
      hooks: {
        afterCreate: async (job, options) => {
          const { JobStatusHistory } = sequelize.models;
          await JobStatusHistory.create({
            job_id: job.id,
            user_id: options?.actorId || job.user_id,
            from_status: "None",
            to_status: job.status,
            changed_at: new Date()
          }, {
            transaction: options?.transaction
          });
        },
        afterUpdate: async (job, options) => {
          if (job.changed("status")) {
            const { JobStatusHistory } = sequelize.models;
            await JobStatusHistory.create({
              job_id: job.id,
              user_id: options?.actorId || job.user_id,
              from_status: job._previousDataValues.status,
              to_status: job.status,
              changed_at: new Date()
            }, {
              transaction: options?.transaction
            });
          }
        }
      },
      indexes: [
        { fields: ["user_id"] },
        { fields: ["workspace_id"] },
        { fields: ["status"] },
        { fields: ["company_name"] },
        { fields: ["job_title"] },
        { fields: ["location"] },
        { fields: ["createdAt"] },
        { fields: ["user_id", "status"] },
        { fields: ["user_id", "createdAt"] },
        { fields: ["company_name", "job_title"] }
      ]
    }
  );

  return JobApplication;
};
