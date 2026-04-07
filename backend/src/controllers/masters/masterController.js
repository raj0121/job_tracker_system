import { 
  Industry, 
  EducationGroup, 
  EducationType, 
  Specialization, 
  Keyword,
  Department,
  Designation,
  EnquirySource,
  ReferenceSource,
  CandidateSource,
  Location,
  Skill
} from "../../models/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { successResponse } from "../../utils/apiResponse.js";
import { Op } from "sequelize";
import { buildPageResult, resolvePagePagination } from "../../utils/pagination.js";

const models = {
  industries: Industry,
  "education-groups": EducationGroup,
  "education-types": EducationType,
  specializations: Specialization,
  keywords: Keyword,
  departments: Department,
  designations: Designation,
  locations: Location,
  skills: Skill,
  sources: CandidateSource,
  "enquiry-sources": EnquirySource,
  "reference-sources": ReferenceSource,
  "candidate-sources": CandidateSource
};

export const getMasterData = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const Model = models[type];

  if (!Model) {
    throw new AppError(`Invalid master type: ${type}`, 400);
  }

  const where = {};
  if (req.query.status) {
    where.status = req.query.status;
  }
  if (req.query.search) {
    where.name = { [Op.like]: `%${String(req.query.search).trim()}%` };
  }

  const pagination = resolvePagePagination(req.query, {
    defaultLimit: 20,
    maxLimit: 100
  });
  const queryOptions = {
    where: Object.keys(where).length ? where : undefined,
    order: [["name", "ASC"]]
  };

  if (pagination.enabled) {
    const { rows, count } = await Model.findAndCountAll({
      ...queryOptions,
      limit: pagination.limit,
      offset: pagination.offset
    });

    return successResponse(
      res,
      buildPageResult(rows, count, pagination),
      `${type} fetched successfully`
    );
  }

  const data = await Model.findAll(queryOptions);

  return successResponse(res, data, `${type} fetched successfully`);
});

export const createMasterData = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const Model = models[type];

  if (!Model) {
    throw new AppError(`Invalid master type: ${type}`, 400);
  }

  const name = String(req.body?.name || "").trim();
  if (!name) {
    throw new AppError("Name is required", 400);
  }

  // Find or create manually to be safer and avoid edge cases with findOrCreate
  let record = await Model.findOne({ where: { name } });
  let created = false;

  if (!record) {
    record = await Model.create({
      name,
      description: req.body?.description || null,
      status: req.body?.status || "active"
    });
    created = true;
  }

  return successResponse(
    res, 
    record, 
    `${type} ${created ? "created" : "already exists"}`, 
    created ? 201 : 200
  );
});

export const updateMasterData = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const Model = models[type];

  if (!Model) {
    throw new AppError(`Invalid master type: ${type}`, 400);
  }

  const record = await Model.findByPk(id);
  if (!record) {
    throw new AppError(`${type} not found`, 404);
  }

  if (req.body.name) {
    req.body.name = String(req.body.name).trim();
  }

  await record.update(req.body);
  return successResponse(res, record, `${type} updated successfully`);
});

export const deleteMasterData = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const Model = models[type];

  if (!Model) {
    throw new AppError(`Invalid master type: ${type}`, 400);
  }

  const record = await Model.findByPk(id);
  if (!record) {
    throw new AppError(`${type} not found`, 404);
  }

  await record.destroy();
  return successResponse(res, { deleted: true }, `${type} deleted successfully`);
});
