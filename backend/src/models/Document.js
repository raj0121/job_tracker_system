export default (sequelize, DataTypes) => {
  const Document = sequelize.define(
    "Document",
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
      job_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      file_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      original_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      file_path: {
        type: DataTypes.STRING,
        allowNull: false
      },
      file_type: {
        type: DataTypes.ENUM("resume", "cover_letter", "portfolio", "other"),
        defaultValue: "resume"
      },
      mime_type: {
        type: DataTypes.STRING,
        allowNull: true
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },
      access_level: {
        type: DataTypes.ENUM("private", "workspace"),
        defaultValue: "private"
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    },
    {
      tableName: "documents",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["job_id"] },
        { fields: ["file_type", "version"] }
      ]
    }
  );

  return Document;
};
