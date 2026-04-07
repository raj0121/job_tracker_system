export default (sequelize, DataTypes) => {
  const Tenant = sequelize.define("Tenant", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    plan: {
      type: DataTypes.ENUM("free", "pro", "enterprise"),
      defaultValue: "free"
    },
    subscription_status: {
      type: DataTypes.ENUM("active", "past_due", "canceled", "incomplete"),
      defaultValue: "active"
    },
    settings: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: "tenants",
    timestamps: true,
    paranoid: true
  });

  return Tenant;
};
