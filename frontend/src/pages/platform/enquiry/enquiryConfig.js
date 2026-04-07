import { getEnquiryStatusMeta } from "../../../config/status.config";

export const initialEnquiryForm = {
  client_name: "",
  contact_number: "",
  email: "",
  client_type: "company",
  country: "",
  state: "",
  city: "",
  zip_code: "",
  address: "",
  company_id: "",
  company_name: "",
  industry: "",
  reference_source: "",
  enquiry_date: "",
  enquiry_source: "website",
  resource_profile_link: "",
  remarks: "",
  status: "open"
};

export const emptyContact = {
  name: "",
  mobile: "",
  email: "",
  designation: ""
};

export const clientTypeOptions = [
  { value: "company", label: "Company" },
  { value: "individual", label: "Individual" },
  { value: "agency", label: "Agency" },
  { value: "partner", label: "Partner" },
  { value: "vendor", label: "Vendor" }
];

export const enquirySourceOptions = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "Email" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" }
];

export const resolveLabel = (options, value) => {
  const match = options.find((option) => option.value === value);
  return match ? match.label : (value || "-");
};

export const resolveCompanyLabel = (item) => (
  item?.company_name || item?.Company?.name || "-"
);

export const normalizeEnquiryStatus = getEnquiryStatusMeta;
