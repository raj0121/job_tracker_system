export default (sequelize, DataTypes) => {
  const LoginHistory = sequelize.define("LoginHistory", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ip_address: {
      type: DataTypes.STRING
    },
    user_agent: {
      type: DataTypes.STRING
    },
    device_fingerprint: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.ENUM("success", "failed"),
      defaultValue: "success"
    },
    failure_reason: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: "login_histories",
    timestamps: true
  });

  return LoginHistory;
};
