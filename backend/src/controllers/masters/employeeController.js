import { Department, Designation, Employee, Role } from "../../models/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { successResponse } from "../../utils/apiResponse.js";
import { Op } from "sequelize";
import { buildPageResult, resolvePagePagination } from "../../utils/pagination.js";

const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const parseOptionalId = (value, label) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${label} must be a positive integer`, 400);
  }
  return parsed;
};

const assertDepartment = async (departmentId) => {
  if (!departmentId) {
    return null;
  }
  const department = await Department.findByPk(departmentId);
  if (!department) {
    throw new AppError("Department not found", 404);
  }
  return department;
};

const assertDesignation = async (designationId) => {
  if (!designationId) {
    return null;
  }
  const designation = await Designation.findByPk(designationId);
  if (!designation) {
    throw new AppError("Designation not found", 404);
  }
  return designation;
};

export const getEmployees = asyncHandler(async (req, res) => {
  const pagination = resolvePagePagination(req.query, {
    defaultLimit: 20,
    maxLimit: 100
  });
  const search = String(req.query.search || "").trim();
  const where = search
    ? {
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { role: { [Op.like]: `%${search}%` } }
      ]
    }
    : undefined;

  const baseQuery = {
    where,
    attributes: { exclude: ["password"] },
    include: [
      { model: Department, attributes: ["id", "name"] },
      { model: Designation, attributes: ["id", "name"] }
    ],
    order: [["createdAt", "DESC"]]
  };

  if (pagination.enabled) {
    const { rows, count } = await Employee.findAndCountAll({
      ...baseQuery,
      distinct: true,
      limit: pagination.limit,
      offset: pagination.offset
    });

    return successResponse(
      res,
      buildPageResult(rows, count, pagination),
      "Employees fetched successfully"
    );
  }

  const employees = await Employee.findAll(baseQuery);

  return successResponse(res, employees, "Employees fetched successfully");
});

export const createEmployee = asyncHandler(async (req, res) => {
  const name = normalizeString(req.body?.name);
  const email = normalizeString(req.body?.email)?.toLowerCase();
  const phone = normalizeString(req.body?.phone);
  const password = normalizeString(req.body?.password);
  const role = normalizeString(req.body?.role) || "recruiter";

  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", 400);
  }

  const roleRecord = await Role.findOne({ where: { key: role, status: "active" } });
  if (!roleRecord) {
    throw new AppError("Invalid role provided", 400);
  }

  const existing = await Employee.findOne({ where: { email } });
  if (existing) {
    throw new AppError("Employee email already exists", 400);
  }

  const departmentId = parseOptionalId(req.body?.department_id, "department_id");
  const designationId = parseOptionalId(req.body?.designation_id, "designation_id");

  await assertDepartment(departmentId);
  await assertDesignation(designationId);

  const employee = await Employee.create({
    name,
    email,
    phone,
    password,
      role: roleRecord.key,
    department_id: departmentId,
    designation_id: designationId
  });

  const sanitized = employee.toJSON();
  delete sanitized.password;

  return successResponse(res, sanitized, "Employee created successfully", 201);
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findByPk(req.params.employeeId);
  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
    employee.name = normalizeString(req.body.name) || employee.name;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "email")) {
    const email = normalizeString(req.body.email)?.toLowerCase();
    if (!email) {
      throw new AppError("Email is required", 400);
    }

    if (email !== employee.email) {
      const existing = await Employee.findOne({ where: { email } });
      if (existing && existing.id !== employee.id) {
        throw new AppError("Employee email already exists", 400);
      }
      employee.email = email;
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "phone")) {
    employee.phone = normalizeString(req.body.phone);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "role")) {
    const roleInput = normalizeString(req.body.role);
    const roleRecord = roleInput
      ? await Role.findOne({ where: { key: roleInput, status: "active" } })
      : null;
    if (roleInput && !roleRecord) {
      throw new AppError("Invalid role provided", 400);
    }
    if (roleRecord) {
      employee.role = roleRecord.key;
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "password")) {
    const password = normalizeString(req.body.password);
    if (password) {
      employee.password = password;
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "department_id")) {
    const departmentId = parseOptionalId(req.body.department_id, "department_id");
    await assertDepartment(departmentId);
    employee.department_id = departmentId;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "designation_id")) {
    const designationId = parseOptionalId(req.body.designation_id, "designation_id");
    await assertDesignation(designationId);
    employee.designation_id = designationId;
  }

  await employee.save();

  const sanitized = employee.toJSON();
  delete sanitized.password;

  return successResponse(res, sanitized, "Employee updated successfully");
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findByPk(req.params.employeeId);
  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  await employee.destroy();
  return successResponse(res, { deleted: true }, "Employee deleted successfully");
});
