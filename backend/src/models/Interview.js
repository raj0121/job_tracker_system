export default (sequelize, DataTypes) => {
  const Interview = sequelize.define(
    "Interview",
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
      scheduled_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      duration_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 60
      },
      location_type: {
        type: DataTypes.ENUM("online", "in-person", "phone"),
        defaultValue: "online"
      },
      location_url: {
        type: DataTypes.STRING,
        allowNull: true
      },
      interviewer_names: {
        type: DataTypes.STRING,
        allowNull: true
      },
      panel_details: {
        type: DataTypes.JSON,
        allowNull: true
      },
      calendar_event_ref: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM("scheduled", "completed", "cancelled", "rescheduled"),
        defaultValue: "scheduled"
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      outcome: {
        type: DataTypes.ENUM("pending", "passed", "failed", "no_show"),
        defaultValue: "pending"
      }
    },
    {
      tableName: "interviews",
      timestamps: true
    }
  );

  return Interview;
};
