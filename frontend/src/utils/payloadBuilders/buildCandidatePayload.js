import { normalizeNumber, normalizeString } from "../form.utils";

const buildEducationsPayload = (educations = []) => (
  educations
    .map((entry) => ({
      education_group: normalizeString(entry.educationGroup),
      education_type: normalizeString(entry.educationType),
      university: normalizeString(entry.university),
      cgpa: normalizeString(entry.cgpa),
      year: normalizeString(entry.year),
      specialization: normalizeString(entry.specialization)
    }))
    .filter((entry) => Object.values(entry).some(Boolean))
);

const buildExperiencesPayload = (experiences = []) => (
  experiences
    .map((entry) => ({
      company: normalizeString(entry.company),
      role: normalizeString(entry.role),
      years: normalizeNumber(entry.years),
      months: normalizeNumber(entry.months),
      description: normalizeString(entry.description)
    }))
    .filter((entry) => Object.values(entry).some((value) => value !== null && value !== ""))
);

export const buildCandidatePayload = (form) => {
  const educations = buildEducationsPayload(form.educations);
  const experiences = buildExperiencesPayload(form.experiences);
  const primaryExperience = experiences[0] || {};

  return {
    name: normalizeString(form.name),
    email: normalizeString(form.email),
    phone: normalizeString(form.phone),
    applied_position: normalizeString(form.position),
    department: normalizeString(form.department),
    designation_id: normalizeNumber(form.designationId),
    compensation: normalizeString(form.compensation),
    current_salary: normalizeString(form.currentSalary),
    expected_salary: normalizeString(form.expectedSalary),
    tax_terms: normalizeString(form.taxTerms),
    experience_years: primaryExperience.years ?? null,
    experience_months: primaryExperience.months ?? null,
    work_authorization: normalizeString(form.workAuthorization),
    availability_days: normalizeNumber(form.availabilityDays),
    native_place: normalizeString(form.nativePlace),
    country: normalizeString(form.country),
    state: normalizeString(form.state),
    city: normalizeString(form.city),
    zip_code: normalizeString(form.zipCode),
    relocate: Boolean(form.relocate),
    source: normalizeString(form.source),
    educations,
    experiences,
    status: form.status || "New"
  };
};
