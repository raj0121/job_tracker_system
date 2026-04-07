export default (sequelize, DataTypes) => {
  const UserSession = sequelize.define(
    "UserSession",
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
      refresh_token_hash: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      ip_address: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      user_agent: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      device_fingerprint: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      last_seen_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: "user_sessions",
      timestamps: true,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["is_active"] },
        { fields: ["expires_at"] },
        { unique: true, fields: ["refresh_token_hash"] }
      ]
    }
  );

  return UserSession;
};
