const toPlainRecord = (record) => {
  if (!record) {
    return null;
  }

  if (typeof record.get === "function") {
    return record.get({ plain: true });
  }

  return record;
};

const serializeUser = (user) => {
  const plain = toPlainRecord(user);
  if (!plain) {
    return null;
  }

  return {
    ...plain,
    displayName: plain.name || plain.email || null
  };
};

const serializeCompany = (company) => {
  const plain = toPlainRecord(company);
  if (!plain) {
    return null;
  }

  return {
    ...plain,
    companyName: plain.name || null
  };
};

export const serializeRequirement = (requirement) => {
  const plain = toPlainRecord(requirement);
  if (!plain) {
    return null;
  }

  const company = serializeCompany(plain.company || plain.Company);
  const user = serializeUser(plain.user || plain.User);

  return {
    ...plain,
    company,
    user,
    clientName: plain.clientName ?? plain.client_name ?? null,
    endClientName: plain.endClientName ?? plain.end_client_name ?? null,
    companyId: plain.companyId ?? plain.company_id ?? company?.id ?? null,
    companyName: plain.companyName ?? company?.name ?? plain.company_name ?? plain.client_name ?? null,
    clientJobId: plain.clientJobId ?? plain.client_job_id ?? null,
    minExpYear: plain.minExpYear ?? plain.min_exp_year ?? null,
    minExpMonth: plain.minExpMonth ?? plain.min_exp_month ?? null,
    maxExpYear: plain.maxExpYear ?? plain.max_exp_year ?? null,
    maxExpMonth: plain.maxExpMonth ?? plain.max_exp_month ?? null,
    openings: plain.openings ?? plain.no_of_positions ?? null,
    assignDate: plain.assignDate ?? plain.assign_date ?? null,
    zipCode: plain.zipCode ?? plain.zip_code ?? null,
    jobType: plain.jobType ?? plain.job_type ?? null,
    workplaceType: plain.workplaceType ?? plain.workplace_type ?? null,
    durationYear: plain.durationYear ?? plain.duration_year ?? null,
    durationMonths: plain.durationMonths ?? plain.duration_months ?? null,
    fileUrl: plain.fileUrl ?? plain.file_url ?? null,
    fileOriginalName: plain.fileOriginalName ?? plain.file_original_name ?? null,
    fileMimeType: plain.fileMimeType ?? plain.file_mime_type ?? null,
    fileSize: plain.fileSize ?? plain.file_size ?? null
  };
};

export const serializeCandidate = (candidate) => {
  const plain = toPlainRecord(candidate);
  if (!plain) {
    return null;
  }

  const user = serializeUser(plain.user || plain.User);
  const assignee = serializeUser(plain.assignee || plain.Assignee);
  const department = toPlainRecord(plain.department || plain.Department);
  const designation = toPlainRecord(plain.designation || plain.Designation);
  const requirement = serializeRequirement(plain.requirement || plain.Requirement);

  return {
    ...plain,
    user,
    assignee,
    department,
    designation,
    requirement,
    resumeUrl: plain.resumeUrl ?? plain.resume_url ?? null,
    appliedPosition: plain.appliedPosition ?? plain.applied_position ?? null,
    departmentId: plain.departmentId ?? plain.department_id ?? department?.id ?? null,
    designationId: plain.designationId ?? plain.designation_id ?? designation?.id ?? null,
    currentSalary: plain.currentSalary ?? plain.current_salary ?? null,
    expectedSalary: plain.expectedSalary ?? plain.expected_salary ?? null,
    taxTerms: plain.taxTerms ?? plain.tax_terms ?? null,
    experienceYears: plain.experienceYears ?? plain.experience_years ?? null,
    experienceMonths: plain.experienceMonths ?? plain.experience_months ?? null,
    workAuthorization: plain.workAuthorization ?? plain.work_authorization ?? null,
    availabilityDays: plain.availabilityDays ?? plain.availability_days ?? null,
    nativePlace: plain.nativePlace ?? plain.native_place ?? null,
    zipCode: plain.zipCode ?? plain.zip_code ?? null,
    educationGroup: plain.educationGroup ?? plain.education_group ?? null,
    educationType: plain.educationType ?? plain.education_type ?? null,
    educationYear: plain.educationYear ?? plain.education_year ?? null,
    requirementId: plain.requirementId ?? plain.requirement_id ?? requirement?.id ?? null,
    clientJobId: plain.clientJobId ?? plain.client_job_id ?? requirement?.clientJobId ?? null,
    assignedToId: plain.assignedToId ?? plain.assigned_to ?? assignee?.id ?? null,
    assignmentRole: plain.assignmentRole ?? plain.assignment_role ?? null,
    assignmentRemarks: plain.assignmentRemarks ?? plain.assignment_remarks ?? null,
    companyName: plain.companyName ?? requirement?.companyName ?? requirement?.clientName ?? null,
    departmentName: plain.departmentName ?? department?.name ?? plain.department ?? null,
    createdByName: plain.createdByName ?? user?.displayName ?? null,
    assignedToName: plain.assignedToName ?? assignee?.displayName ?? null,
    phone: plain.phone ?? null
  };
};

export const serializeEnquiry = (enquiry) => {
  const plain = toPlainRecord(enquiry);
  if (!plain) {
    return null;
  }

  const company = serializeCompany(plain.company || plain.Company);
  const user = serializeUser(plain.user || plain.User);
  const contacts = Array.isArray(plain.contacts)
    ? plain.contacts.map((contact) => toPlainRecord(contact))
    : [];
  const attachments = Array.isArray(plain.attachments)
    ? plain.attachments.map((attachment) => toPlainRecord(attachment))
    : [];

  return {
    ...plain,
    company,
    user,
    contacts,
    attachments,
    clientName: plain.clientName ?? plain.client_name ?? null,
    contactNumber: plain.contactNumber ?? plain.contact_number ?? null,
    clientType: plain.clientType ?? plain.client_type ?? null,
    zipCode: plain.zipCode ?? plain.zip_code ?? null,
    companyId: plain.companyId ?? plain.company_id ?? company?.id ?? null,
    companyName: plain.companyName ?? plain.company_name ?? company?.name ?? null,
    referenceSource: plain.referenceSource ?? plain.reference_source ?? null,
    enquiryDate: plain.enquiryDate ?? plain.enquiry_date ?? null,
    enquirySource: plain.enquirySource ?? plain.enquiry_source ?? null,
    resourceProfileLink: plain.resourceProfileLink ?? plain.resource_profile_link ?? null,
    createdBy: plain.createdBy ?? plain.created_by ?? user?.id ?? null,
    createdByName: plain.createdByName ?? user?.displayName ?? null,
    assignedToId: plain.assignedToId ?? plain.assigned_to ?? null
  };
};

export const serializePageResult = (result, serializer) => {
  if (!result || !Array.isArray(result.data)) {
    return result;
  }

  return {
    ...result,
    data: result.data.map(serializer)
  };
};
