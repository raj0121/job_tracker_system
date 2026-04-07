import { Department, Designation } from "../../models/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { successResponse } from "../../utils/apiResponse.js";
import { Op } from "sequelize";
import { buildPageResult, resolvePagePagination } from "../../utils/pagination.js";

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getDesignations = asyncHandler(async (req, res) => {
  const pagination = resolvePagePagination(req.query, {
    defaultLimit: 20,
    maxLimit: 100
  });
  const departmentId = normalizeId(req.query.department_id ?? req.query.departmentId);
  const search = String(req.query.search || "").trim();
  const where = {};

  if (departmentId) {
    where.department_id = departmentId;
  }

  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }

  const baseQuery = {
    where,
    include: [
      {
        model: Department,
        attributes: ["id", "name"]
      }
    ],
    order: [["name", "ASC"]]
  };

  if (pagination.enabled) {
    const { rows, count } = await Designation.findAndCountAll({
      ...baseQuery,
      distinct: true,
      limit: pagination.limit,
      offset: pagination.offset
    });

    return successResponse(
      res,
      buildPageResult(rows, count, pagination),
      "Designations fetched successfully"
    );
  }

  const designations = await Designation.findAll(baseQuery);

  return successResponse(res, designations, "Designations fetched successfully");
});

export const createDesignation = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const departmentId = normalizeId(req.body?.department_id ?? req.body?.departmentId);

  if (!name) {
    throw new AppError("Designation name is required", 400);
  }

  if (departmentId) {
    const department = await Department.findByPk(departmentId);
    if (!department) {
      throw new AppError("Department not found", 404);
    }
  }

  const designation = await Designation.create({
    name,
    department_id: departmentId
  });

  return successResponse(res, designation, "Designation created successfully", 201);
});

export const updateDesignation = asyncHandler(async (req, res) => {
  const designation = await Designation.findByPk(req.params.designationId);
  if (!designation) {
    throw new AppError("Designation not found", 404);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
    const name = String(req.body.name || "").trim();
    if (!name) {
      throw new AppError("Designation name is required", 400);
    }
    designation.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "department_id")
    || Object.prototype.hasOwnProperty.call(req.body, "departmentId")) {
    const departmentId = normalizeId(req.body.department_id ?? req.body.departmentId);
    if (departmentId) {
      const department = await Department.findByPk(departmentId);
      if (!department) {
        throw new AppError("Department not found", 404);
      }
    }
    designation.department_id = departmentId;
  }

  await designation.save();
  return successResponse(res, designation, "Designation updated successfully");
});

export const deleteDesignation = asyncHandler(async (req, res) => {
  const designation = await Designation.findByPk(req.params.designationId);
  if (!designation) {
    throw new AppError("Designation not found", 404);
  }

  await designation.destroy();
  return successResponse(res, { deleted: true }, "Designation deleted successfully");
});
