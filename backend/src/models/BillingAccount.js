export default (sequelize, DataTypes) => {
  const BillingAccount = sequelize.define(
    "BillingAccount",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      provider: {
        type: DataTypes.ENUM("stripe", "razorpay", "manual", "none"),
        allowNull: false,
        defaultValue: "manual"
      },
      customer_ref: {
        type: DataTypes.STRING(191),
        allowNull: true
      },
      subscription_ref: {
        type: DataTypes.STRING(191),
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM("active", "trialing", "past_due", "canceled", "incomplete"),
        allowNull: false,
        defaultValue: "active"
      },
      current_period_start: {
        type: DataTypes.DATE,
        allowNull: true
      },
      current_period_end: {
        type: DataTypes.DATE,
        allowNull: true
      },
      cancel_at_period_end: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {}
      }
    },
    {
      tableName: "billing_accounts",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["tenant_id"] },
        { fields: ["provider"] },
        { fields: ["status"] }
      ]
    }
  );

  return BillingAccount;
};
