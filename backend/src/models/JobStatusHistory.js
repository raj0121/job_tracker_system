export default (sequelize, DataTypes) => {

  const JobStatusHistory = sequelize.define(
    "JobStatusHistory",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      job_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      from_status: {
        type: DataTypes.STRING,
        allowNull: false
      },

      to_status: {
        type: DataTypes.STRING,
        allowNull: false
      },

      changed_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: "job_status_histories",
      timestamps: false
    }
  );

  return JobStatusHistory;
};
