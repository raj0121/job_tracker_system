export default (sequelize, DataTypes) => {
  const ScheduledReport = sequelize.define("ScheduledReport", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(140),
      allowNull: false
    },
    frequency: {
      type: DataTypes.ENUM("daily", "weekly", "monthly"),
      defaultValue: "weekly"
    },
    recipients: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    filter_definition: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    include_all_users: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    next_run_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    last_run_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: "scheduled_reports",
    timestamps: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["is_active"] },
      { fields: ["next_run_at"] },
      { fields: ["user_id", "is_active"] }
    ]
  });

  return ScheduledReport;
};
