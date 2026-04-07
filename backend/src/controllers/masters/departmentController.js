import { Department } from "../../models/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { successResponse } from "../../utils/apiResponse.js";
import { Op } from "sequelize";
import { buildPageResult, resolvePagePagination } from "../../utils/pagination.js";

export const getDepartments = asyncHandler(async (req, res) => {
  const pagination = resolvePagePagination(req.query, {
    defaultLimit: 20,
    maxLimit: 100
  });
  const search = String(req.query.search || "").trim();
  const where = search
    ? { name: { [Op.like]: `%${search}%` } }
    : undefined;

  if (pagination.enabled) {
    const { rows, count } = await Department.findAndCountAll({
      where,
      order: [["name", "ASC"]],
      limit: pagination.limit,
      offset: pagination.offset
    });

    return successResponse(
      res,
      buildPageResult(rows, count, pagination),
      "Departments fetched successfully"
    );
  }

  const departments = await Department.findAll({
    where,
    order: [["name", "ASC"]]
  });

  return successResponse(res, departments, "Departments fetched successfully");
});

export const createDepartment = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = req.body?.description ? String(req.body.description).trim() : null;

  if (!name) {
    throw new AppError("Department name is required", 400);
  }

  const department = await Department.create({ name, description });
  return successResponse(res, department, "Department created successfully", 201);
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findByPk(req.params.departmentId);
  if (!department) {
    throw new AppError("Department not found", 404);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
    const name = String(req.body.name || "").trim();
    if (!name) {
      throw new AppError("Department name is required", 400);
    }
    department.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
    department.description = req.body.description
      ? String(req.body.description).trim()
      : null;
  }

  await department.save();
  return successResponse(res, department, "Department updated successfully");
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findByPk(req.params.departmentId);
  if (!department) {
    throw new AppError("Department not found", 404);
  }

  await department.destroy();
  return successResponse(res, { deleted: true }, "Department deleted successfully");
});
