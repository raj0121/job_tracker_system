import { normalizeNumber, normalizeString } from "./form.utils";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+\d\s()-]{7,20}$/;

const validators = {
  required: (value) => Boolean(normalizeString(value)),
  email: (value) => !normalizeString(value) || emailPattern.test(String(value).trim()),
  phone: (value) => !normalizeString(value) || phonePattern.test(String(value).trim()),
  number: (value) => value === "" || value === null || value === undefined || normalizeNumber(value) !== null
};

export const candidateValidationSchema = {
  name: {
    checks: [
      { type: "required", message: "Candidate name is required." }
    ]
  },
  email: {
    checks: [
      { type: "email", message: "Enter a valid email address." }
    ]
  },
  phone: {
    checks: [
      { type: "phone", message: "Enter a valid contact number." }
    ]
  },
  availabilityDays: {
    checks: [
      { type: "number", message: "Enter a valid number." }
    ]
  },
  currentSalary: {
    checks: [
      { type: "number", message: "Enter a valid number." }
    ]
  },
  expectedSalary: {
    checks: [
      { type: "number", message: "Enter a valid number." }
    ]
  }
};

export const requirementValidationSchema = {
  company_id: {
    checks: [
      { type: "required", message: "Company is required." }
    ]
  },
  client_name: {
    checks: [
      { type: "required", message: "Client name is required." }
    ]
  },
  position: {
    checks: [
      { type: "required", message: "Position is required." }
    ]
  },
  no_of_positions: {
    checks: [
      { type: "required", message: "Number of positions is required." },
      { type: "number", message: "Number of positions is required." }
    ]
  }
};

export const enquiryValidationSchema = {
  client_name: {
    checks: [
      { type: "required", message: "Client name is required." }
    ]
  },
  email: {
    checks: [
      { type: "email", message: "Enter a valid email address." }
    ]
  },
  contact_number: {
    checks: [
      { type: "phone", message: "Enter a valid contact number." }
    ]
  }
};

export const validateWithSchema = (schema, values, extraChecks = []) => {
  const errors = {};

  Object.entries(schema).forEach(([field, config]) => {
    for (const check of config.checks || []) {
      const validator = validators[check.type];
      if (validator && !validator(values[field])) {
        errors[field] = check.message;
        break;
      }
    }
  });

  extraChecks.forEach((check) => {
    const result = check(values);
    if (result?.field && result?.message && !errors[result.field]) {
      errors[result.field] = result.message;
    }
  });

  return errors;
};
