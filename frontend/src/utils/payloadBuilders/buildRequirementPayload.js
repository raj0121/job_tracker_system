import { buildFormData, normalizeNumber, normalizeString } from "../form.utils";

export const buildRequirementPayload = (form, { includeAssignedTo = false } = {}) => {
  const cleanedForm = {
    ...form,
    client_name: normalizeString(form.client_name) || "",
    end_client_name: normalizeString(form.end_client_name) || "",
    position: normalizeString(form.position) || "",
    industry: normalizeString(form.industry) || "",
    department: normalizeString(form.department) || "",
    company_id: normalizeNumber(form.company_id) || "",
    min_exp_year: normalizeNumber(form.min_exp_year),
    min_exp_month: normalizeNumber(form.min_exp_month),
    max_exp_year: normalizeNumber(form.max_exp_year),
    max_exp_month: normalizeNumber(form.max_exp_month),
    no_of_positions: normalizeNumber(form.no_of_positions) || "",
    assigned_to: includeAssignedTo ? normalizeNumber(form.assigned_to) : form.assigned_to,
    email_subject: normalizeString(form.email_subject) || "",
    country: normalizeString(form.country) || "",
    state: normalizeString(form.state) || "",
    city: normalizeString(form.city) || "",
    zip_code: normalizeString(form.zip_code) || "",
    job_type: normalizeString(form.job_type) || "",
    workplace_type: normalizeString(form.workplace_type) || "",
    duration_months: normalizeNumber(form.duration_months),
    description: normalizeString(form.description) || "",
    remarks: normalizeString(form.remarks) || ""
  };

  return buildFormData(cleanedForm, {
    jsonFields: ["education"],
    csvFields: ["keywords"],
    fileFields: ["file"],
    skipFields: ["client_job_id", ...(includeAssignedTo ? [] : ["assigned_to"])]
  });
};
