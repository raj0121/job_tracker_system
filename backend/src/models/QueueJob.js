export default (sequelize, DataTypes) => {
  const QueueJob = sequelize.define(
    "QueueJob",
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
      type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM(
          "PENDING",
          "PROCESSING",
          "COMPLETED",
          "FAILED",
          "DEAD_LETTER"
        ),
        defaultValue: "PENDING"
      },
      attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      max_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 3
      },
      scheduled_for: {
        type: DataTypes.DATE,
        allowNull: true
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false
      },
      result: {
        type: DataTypes.JSON,
        allowNull: true
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      tableName: "queue_jobs",
      timestamps: true,
      indexes: [
        { fields: ["status"] },
        { fields: ["user_id"] },
        { fields: ["type"] },
        { fields: ["scheduled_for"] },
        { fields: ["createdAt"] }
      ]
    }
  );

  return QueueJob;
};
