import { body } from "express-validator";

const STATUS_VALUES = ["open", "on_hold", "closed"];
const PRIORITY_VALUES = ["low", "medium", "high", "urgent"];

const hasOwn = (payload, key) => Object.prototype.hasOwnProperty.call(payload || {}, key);
const resolveValue = (payload, ...keys) => {
  for (const key of keys) {
    if (hasOwn(payload, key)) {
      return payload[key];
    }
  }
  return undefined;
};

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";
const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const isNonNegativeInteger = (value) => Number.isInteger(Number(value)) && Number(value) >= 0;
const isValidDate = (value) => !Number.isNaN(new Date(value).getTime());

const validateOptionalPositiveInteger = (...keys) => body().custom((_, { req }) => {
  const value = resolveValue(req.body, ...keys);
  if (isBlank(value)) {
    return true;
  }
  if (!isPositiveInteger(value)) {
    throw new Error(`${keys[0]} must be a positive integer`);
  }
  return true;
});

const validateOptionalNonNegativeInteger = (...keys) => body().custom((_, { req }) => {
  const value = resolveValue(req.body, ...keys);
  if (isBlank(value)) {
    return true;
  }
  if (!isNonNegativeInteger(value)) {
    throw new Error(`${keys[0]} must be zero or greater`);
  }
  return true;
});

const validateOptionalDate = (...keys) => body().custom((_, { req }) => {
  const value = resolveValue(req.body, ...keys);
  if (isBlank(value)) {
    return true;
  }
  if (!isValidDate(value)) {
    throw new Error(`Invalid ${keys[0]}`);
  }
  return true;
});

export const createRequirementValidator = [
  body().custom((_, { req }) => {
    if (isBlank(resolveValue(req.body, "client_name"))) {
      throw new Error("Client name is required");
    }
    if (isBlank(resolveValue(req.body, "position", "title"))) {
      throw new Error("Position is required");
    }
    if (!isPositiveInteger(resolveValue(req.body, "company_id"))) {
      throw new Error("company_id must be a positive integer");
    }
    return true;
  }),
  body().custom((_, { req }) => {
    const status = resolveValue(req.body, "status");
    if (!isBlank(status) && !STATUS_VALUES.includes(String(status).trim().toLowerCase())) {
      throw new Error("Invalid status");
    }
    const priority = resolveValue(req.body, "priority");
    if (!isBlank(priority) && !PRIORITY_VALUES.includes(String(priority).trim().toLowerCase())) {
      throw new Error("Invalid priority");
    }
    return true;
  }),
  validateOptionalPositiveInteger("assigned_to"),
  validateOptionalPositiveInteger("no_of_positions", "openings"),
  validateOptionalNonNegativeInteger("min_exp_year"),
  validateOptionalNonNegativeInteger("min_exp_month"),
  validateOptionalNonNegativeInteger("max_exp_year"),
  validateOptionalNonNegativeInteger("max_exp_month"),
  validateOptionalNonNegativeInteger("duration_year"),
  validateOptionalNonNegativeInteger("duration_months"),
  validateOptionalDate("assign_date", "assignDate", "due_date", "dueDate")
];

export const updateRequirementValidator = [
  body().custom((_, { req }) => {
    const clientName = resolveValue(req.body, "client_name");
    if (hasOwn(req.body, "client_name") && isBlank(clientName)) {
      throw new Error("Client name is required");
    }
    const position = resolveValue(req.body, "position", "title");
    if ((hasOwn(req.body, "position") || hasOwn(req.body, "title")) && isBlank(position)) {
      throw new Error("Position is required");
    }
    const companyId = resolveValue(req.body, "company_id");
    if (hasOwn(req.body, "company_id") && !isPositiveInteger(companyId)) {
      throw new Error("company_id must be a positive integer");
    }
    const status = resolveValue(req.body, "status");
    if (!isBlank(status) && !STATUS_VALUES.includes(String(status).trim().toLowerCase())) {
      throw new Error("Invalid status");
    }
    const priority = resolveValue(req.body, "priority");
    if (!isBlank(priority) && !PRIORITY_VALUES.includes(String(priority).trim().toLowerCase())) {
      throw new Error("Invalid priority");
    }
    return true;
  }),
  validateOptionalPositiveInteger("assigned_to"),
  validateOptionalPositiveInteger("no_of_positions", "openings"),
  validateOptionalNonNegativeInteger("min_exp_year"),
  validateOptionalNonNegativeInteger("min_exp_month"),
  validateOptionalNonNegativeInteger("max_exp_year"),
  validateOptionalNonNegativeInteger("max_exp_month"),
  validateOptionalNonNegativeInteger("duration_year"),
  validateOptionalNonNegativeInteger("duration_months"),
  validateOptionalDate("assign_date", "assignDate", "due_date", "dueDate")
];
