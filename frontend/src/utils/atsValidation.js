import { normalizeString } from "./form.utils";
import {
  candidateValidationSchema,
  enquiryValidationSchema,
  requirementValidationSchema,
  validateWithSchema
} from "./validationSchemas";

export const validateCandidateForm = (form) => {
  return validateWithSchema(candidateValidationSchema, form);
};

export const validateRequirementForm = (form) => {
  return validateWithSchema(requirementValidationSchema, form);
};

export const validateEnquiryForm = (form, contacts = []) => {
  return validateWithSchema(enquiryValidationSchema, form, [
    (values) => (
      values.company_id === "other" && !normalizeString(values.company_name)
        ? { field: "company_name", message: "Company name is required." }
        : null
    ),
    () => {
      const hasInvalidContact = contacts.some((contact) => {
        const hasAnyValue = ["mobile", "email", "designation"].some((field) => normalizeString(contact[field]));
        return hasAnyValue && !normalizeString(contact.name);
      });

      return hasInvalidContact
        ? { field: "contacts", message: "Contact person name is required when contact details are provided." }
        : null;
    }
  ]);
};
