export default (sequelize, DataTypes) => {
  const Goal = sequelize.define(
    "Goal",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      workspace_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      title: {
        type: DataTypes.STRING(180),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      metric_type: {
        type: DataTypes.ENUM("applications", "interviews", "offers", "hires", "responses"),
        allowNull: false
      },
      target_value: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      current_value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_auto_track: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      period_start: {
        type: DataTypes.DATE,
        allowNull: true
      },
      period_end: {
        type: DataTypes.DATE,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM("active", "completed", "paused", "archived"),
        allowNull: false,
        defaultValue: "active"
      }
    },
    {
      tableName: "goals",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["workspace_id"] },
        { fields: ["metric_type"] },
        { fields: ["status"] },
        { fields: ["period_start", "period_end"] }
      ]
    }
  );

  return Goal;
};
