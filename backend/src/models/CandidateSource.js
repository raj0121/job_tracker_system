export default (sequelize, DataTypes) => {
  const CandidateSource = sequelize.define("CandidateSource", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    tableName: "master_candidate_sources",
    timestamps: true
  });

  return CandidateSource;
};
