import { body } from "express-validator";

const statuses = [
  "Applied",
  "Screening",
  "Interviewing",
  "Technical Test",
  "Final Round",
  "Rejected",
  "Offer",
  "Hired"
];

const applicationSources = [
  "LinkedIn",
  "Company Website",
  "Referral",
  "Job Board",
  "Agency",
  "Networking",
  "Other"
];

const priorities = ["Low", "Medium", "High", "Critical"];

export const createJobValidator = [
  body("company_name")
    .trim()
    .notEmpty()
    .withMessage("Company name is required"),

  body("job_title")
    .trim()
    .notEmpty()
    .withMessage("Job title is required"),

  body("status")
    .optional()
    .isIn(statuses)
    .withMessage("Invalid job status"),

  body("application_source")
    .optional()
    .isIn(applicationSources)
    .withMessage("Invalid application source"),

  body("priority")
    .optional()
    .isIn(priorities)
    .withMessage("Invalid priority"),

  body("workspace_id")
    .optional({ values: "falsy" })
    .isInt({ gt: 0 })
    .withMessage("workspace_id must be a positive integer"),

  body("company_id")
    .optional({ values: "falsy" })
    .isInt({ gt: 0 })
    .withMessage("company_id must be a positive integer"),

  body("job_description_url")
    .optional({ values: "falsy" })
    .isURL()
    .withMessage("job_description_url must be a valid URL")
];
