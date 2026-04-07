import { body } from "express-validator";

const PHONE_PATTERN = /^[+\d\s()-]{7,20}$/;
const STATUS_VALUES = ["open", "assigned", "closed"];

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

export const createEnquiryValidator = [
  body().custom((_, { req }) => {
    if (isBlank(resolveValue(req.body, "client_name", "name"))) {
      throw new Error("Client name is required");
    }
    const status = resolveValue(req.body, "status");
    if (!isBlank(status) && !STATUS_VALUES.includes(String(status).trim().toLowerCase())) {
      throw new Error("Invalid enquiry status");
    }
    const enquiryDate = resolveValue(req.body, "enquiry_date");
    if (!isBlank(enquiryDate) && !isValidDate(enquiryDate)) {
      throw new Error("Invalid enquiry_date");
    }
    return true;
  }),
  body("email")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Enter a valid email address"),
  body("contact_number")
    .optional({ values: "falsy" })
    .matches(PHONE_PATTERN)
    .withMessage("Enter a valid contact number"),
  body("phone")
    .optional({ values: "falsy" })
    .matches(PHONE_PATTERN)
    .withMessage("Enter a valid phone number"),
  body("resource_profile_link")
    .optional({ values: "falsy" })
    .isURL({ require_protocol: false })
    .withMessage("resource_profile_link must be a valid URL"),
  validateOptionalPositiveInteger("company_id"),
  validateOptionalPositiveInteger("assigned_to")
];

export const updateEnquiryValidator = [
  body().custom((_, { req }) => {
    const clientName = resolveValue(req.body, "client_name", "name");
    if ((hasOwn(req.body, "client_name") || hasOwn(req.body, "name")) && isBlank(clientName)) {
      throw new Error("Client name is required");
    }
    const status = resolveValue(req.body, "status");
    if (!isBlank(status) && !STATUS_VALUES.includes(String(status).trim().toLowerCase())) {
      throw new Error("Invalid enquiry status");
    }
    const enquiryDate = resolveValue(req.body, "enquiry_date");
    if (!isBlank(enquiryDate) && !isValidDate(enquiryDate)) {
      throw new Error("Invalid enquiry_date");
    }
    return true;
  }),
  body("email")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Enter a valid email address"),
  body("contact_number")
    .optional({ values: "falsy" })
    .matches(PHONE_PATTERN)
    .withMessage("Enter a valid contact number"),
  body("phone")
    .optional({ values: "falsy" })
    .matches(PHONE_PATTERN)
    .withMessage("Enter a valid phone number"),
  body("resource_profile_link")
    .optional({ values: "falsy" })
    .isURL({ require_protocol: false })
    .withMessage("resource_profile_link must be a valid URL"),
  validateOptionalPositiveInteger("company_id"),
  validateOptionalPositiveInteger("assigned_to")
];
