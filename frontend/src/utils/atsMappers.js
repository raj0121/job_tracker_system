const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

const asText = (value, fallback = "-") => {
  if (value === undefined || value === null) {
    return fallback;
  }

  const normalized = typeof value === "string" ? value.trim() : String(value).trim();
  return normalized || fallback;
};

const asNullableText = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = typeof value === "string" ? value.trim() : String(value).trim();
  return normalized || null;
};

export const mapRequirement = (item = {}) => {
  const requirement = item?.raw || item;
  const company = requirement.company || requirement.Company || null;

  return {
    id: requirement.id,
    title: asText(firstDefined(requirement.title, requirement.position)),
    position: asText(firstDefined(requirement.position, requirement.title), "Role not set"),
    clientName: asText(firstDefined(requirement.clientName, requirement.client_name, requirement.companyName, company?.name), "Client"),
    jobId: asText(firstDefined(requirement.jobId, requirement.clientJobId, requirement.client_job_id)),
    companyId: firstDefined(requirement.companyId, requirement.company_id, company?.id, null),
    companyName: asText(firstDefined(requirement.companyName, company?.name, requirement.client_name)),
    industry: asText(requirement.industry),
    department: asText(requirement.department),
    assignDate: firstDefined(requirement.assignDate, requirement.assign_date, requirement.createdAt, null),
    openings: firstDefined(requirement.openings, requirement.no_of_positions, "-"),
    city: asNullableText(requirement.city) || "",
    state: asNullableText(requirement.state) || "",
    country: asNullableText(requirement.country) || "",
    priority: asText(requirement.priority, "medium"),
    status: asText(requirement.status),
    minExperienceYears: firstDefined(requirement.minExperienceYears, requirement.minExpYear, requirement.min_exp_year, null),
    minExperienceMonths: firstDefined(requirement.minExperienceMonths, requirement.minExpMonth, requirement.min_exp_month, null),
    maxExperienceYears: firstDefined(requirement.maxExperienceYears, requirement.maxExpYear, requirement.max_exp_year, null),
    maxExperienceMonths: firstDefined(requirement.maxExperienceMonths, requirement.maxExpMonth, requirement.max_exp_month, null),
    raw: requirement
  };
};

export const mapEnquiry = (item = {}, resolveCompanyLabel) => {
  const enquiry = item?.raw || item;
  const company = enquiry.company || enquiry.Company || null;
  const companyLabel = resolveCompanyLabel
    ? resolveCompanyLabel(enquiry)
    : firstDefined(enquiry.companyName, enquiry.company_name, company?.name, "-");

  return {
    id: enquiry.id,
    clientName: asText(firstDefined(enquiry.clientName, enquiry.client_name)),
    companyName: asText(companyLabel),
    contactNumber: asText(firstDefined(enquiry.contactNumber, enquiry.contact_number)),
    email: asText(enquiry.email),
    remarks: asText(enquiry.remarks),
    industry: asText(enquiry.industry),
    city: asText(enquiry.city),
    enquiryDate: firstDefined(enquiry.enquiryDate, enquiry.enquiry_date, enquiry.createdAt, null),
    status: asText(enquiry.status),
    createdBy: asText(firstDefined(enquiry.createdByName, enquiry.createdBy?.displayName, enquiry.user?.displayName, enquiry.User?.name, enquiry.User?.email)),
    raw: enquiry
  };
};

export const mapCandidate = (item = {}) => {
  const candidate = item?.raw || item;
  const requirement = mapRequirement(candidate.requirement || candidate.Requirement || {});
  const department = candidate.department || candidate.Department || null;
  const assignee = candidate.assignee || candidate.Assignee || null;
  const user = candidate.user || candidate.User || null;
  const clientJobId = asNullableText(firstDefined(candidate.clientJobId, candidate.client_job_id, requirement.jobId));
  const requirementId = firstDefined(candidate.requirementId, candidate.requirement_id, requirement.id, null);

  return {
    id: candidate.id,
    name: asText(candidate.name),
    email: asText(candidate.email, "No email"),
    phone: asNullableText(candidate.phone),
    position: asText(firstDefined(candidate.position, candidate.appliedPosition, candidate.applied_position), "Role not set"),
    companyName: asText(firstDefined(candidate.companyName, requirement.companyName)),
    departmentName: asText(firstDefined(candidate.departmentName, department?.name, candidate.department)),
    currentSalary: asText(firstDefined(candidate.currentSalary, candidate.current_salary)),
    expectedSalary: asText(firstDefined(candidate.expectedSalary, candidate.expected_salary)),
    status: asText(candidate.status),
    assignedTo: asText(firstDefined(candidate.assignedToName, candidate.assignedTo, assignee?.displayName, assignee?.name, assignee?.email), "Unassigned"),
    createdBy: asText(firstDefined(candidate.createdByName, user?.displayName, user?.name, user?.email)),
    requirementId,
    clientJobId,
    assignmentRemarks: asNullableText(firstDefined(candidate.assignmentRemarks, candidate.assignment_remarks)) || "",
    requirement: requirement.id ? requirement : null,
    hasJobAssignment: Boolean(requirementId || clientJobId)
  };
};
