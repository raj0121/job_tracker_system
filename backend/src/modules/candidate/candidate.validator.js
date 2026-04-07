import { body } from "express-validator";

const PHONE_PATTERN = /^[+\d\s()-]{7,20}$/;
const STATUS_VALUES = ["new", "screening", "interview", "rejected", "hired"];

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

export const createCandidateValidator = [
  body().custom((_, { req }) => {
    const name = resolveValue(req.body, "name");
    if (isBlank(name)) {
      throw new Error("Candidate name is required");
    }
    return true;
  }),
  body("email")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Enter a valid email address"),
  body("phone")
    .optional({ values: "falsy" })
    .matches(PHONE_PATTERN)
    .withMessage("Enter a valid phone number"),
  body("resume_url")
    .optional({ values: "falsy" })
    .isURL()
    .withMessage("resume_url must be a valid URL"),
  body("resumeUrl")
    .optional({ values: "falsy" })
    .isURL()
    .withMessage("resumeUrl must be a valid URL"),
  body("status")
    .optional({ values: "falsy" })
    .custom((value) => {
      if (!STATUS_VALUES.includes(String(value).trim().toLowerCase())) {
        throw new Error("Invalid candidate status");
      }
      return true;
    }),
  validateOptionalPositiveInteger("department_id", "departmentId"),
  validateOptionalPositiveInteger("designation_id", "designationId"),
  validateOptionalPositiveInteger("availability_days", "availabilityDays"),
  validateOptionalPositiveInteger("requirement_id", "requirementId"),
  validateOptionalPositiveInteger("assigned_to", "assignedTo")
];

export const updateCandidateValidator = [
  body("email")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Enter a valid email address"),
  body("phone")
    .optional({ values: "falsy" })
    .matches(PHONE_PATTERN)
    .withMessage("Enter a valid phone number"),
  body("resume_url")
    .optional({ values: "falsy" })
    .isURL()
    .withMessage("resume_url must be a valid URL"),
  body("resumeUrl")
    .optional({ values: "falsy" })
    .isURL()
    .withMessage("resumeUrl must be a valid URL"),
  body("status")
    .optional({ values: "falsy" })
    .custom((value) => {
      if (!STATUS_VALUES.includes(String(value).trim().toLowerCase())) {
        throw new Error("Invalid candidate status");
      }
      return true;
    }),
  validateOptionalPositiveInteger("department_id", "departmentId"),
  validateOptionalPositiveInteger("designation_id", "designationId"),
  validateOptionalPositiveInteger("availability_days", "availabilityDays"),
  validateOptionalPositiveInteger("requirement_id", "requirementId"),
  validateOptionalPositiveInteger("assigned_to", "assignedTo")
];
