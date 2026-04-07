import bcrypt from "bcrypt";

export default (sequelize, DataTypes) => {
  const Employee = sequelize.define("Employee", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING
    },
    role: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "recruiter"
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    designation_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: "employees",
    timestamps: true,
    indexes: [
      { fields: ["email"] },
      { fields: ["department_id"] },
      { fields: ["designation_id"] }
    ],
    hooks: {
      beforeCreate: async (employee) => {
        if (employee.password) {
          employee.password = await bcrypt.hash(employee.password, 10);
        }
      },
      beforeUpdate: async (employee) => {
        if (employee.changed("password")) {
          employee.password = await bcrypt.hash(employee.password, 10);
        }
      }
    }
  });

  return Employee;
};
