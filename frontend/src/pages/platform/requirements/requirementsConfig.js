import {
  REQUIREMENT_PRIORITY_OPTIONS,
  REQUIREMENT_STATUS_OPTIONS
} from "../../../config/status.config";

export const initialRequirementForm = {
  company_id: "",
  client_name: "",
  end_client_name: "",
  position: "",
  industry: "",
  department: "",
  client_job_id: "",
  min_exp_year: "",
  min_exp_month: "",
  max_exp_year: "",
  max_exp_month: "",
  no_of_positions: "1",
  assign_date: "",
  assigned_to: "",
  email_subject: "",
  country: "",
  state: "",
  city: "",
  zip_code: "",
  job_type: "",
  workplace_type: "",
  priority: "medium",
  status: "open",
  duration_year: "",
  duration_months: "",
  keywords: [],
  remarks: "",
  description: "",
  education: [
    {
      education_group: "",
      education_type: "",
      specialization: ""
    }
  ],
  file: null
};

export const jobTypeOptions = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
  "Temporary"
];

export const workplaceTypeOptions = [
  "Onsite",
  "Remote",
  "Hybrid"
];

export const priorityOptions = REQUIREMENT_PRIORITY_OPTIONS;

export const statusOptions = REQUIREMENT_STATUS_OPTIONS;

export const durationOptions = [
  { label: "6 months", value: "6" },
  { label: "12 months (1 year)", value: "12" },
  { label: "18 months", value: "18" },
  { label: "24 months (2 years)", value: "24" },
  { label: "36 months (3 years)", value: "36" }
];

export const locationOptions = {
  "India": {
    "Gujarat": ["Ahmedabad", "Vadodara", "Surat"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur"],
    "Delhi": ["New Delhi"]
  },
  "United States": {
    "California": ["San Francisco", "Los Angeles", "San Diego"],
    "Texas": ["Austin", "Dallas", "Houston"],
    "New York": ["New York City", "Buffalo"]
  }
};

export const priorityTone = {
  low: "badge",
  medium: "badge badge--warning",
  high: "badge badge--danger",
  urgent: "badge badge--danger"
};

export const parseEducation = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const normalizeKeywordsToArray = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const formatOptionLabel = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
