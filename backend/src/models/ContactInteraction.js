export default (sequelize, DataTypes) => {
  const ContactInteraction = sequelize.define("ContactInteraction", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    contact_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    interaction_type: {
      type: DataTypes.ENUM("email", "call", "meeting", "message", "note"),
      allowNull: false,
      defaultValue: "email"
    },
    summary: {
      type: DataTypes.STRING,
      allowNull: false
    },
    detail: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    outcome: {
      type: DataTypes.STRING,
      allowNull: true
    },
    interacted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    next_follow_up_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    follow_up_notified_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: "contact_interactions",
    timestamps: true,
    indexes: [
      { fields: ["company_id"] },
      { fields: ["contact_id"] },
      { fields: ["user_id"] },
      { fields: ["interacted_at"] },
      { fields: ["next_follow_up_at"] },
      { fields: ["company_id", "interacted_at"] }
    ]
  });

  return ContactInteraction;
};
