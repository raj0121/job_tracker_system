import { buildFormData, normalizeString } from "../form.utils";

export const buildEnquiryPayload = (form, contacts = [], attachments = []) => {
  const cleanedForm = {
    ...form,
    client_name: normalizeString(form.client_name) || "",
    contact_number: normalizeString(form.contact_number) || "",
    email: normalizeString(form.email) || "",
    client_type: normalizeString(form.client_type) || "",
    country: normalizeString(form.country) || "",
    state: normalizeString(form.state) || "",
    city: normalizeString(form.city) || "",
    zip_code: normalizeString(form.zip_code) || "",
    address: normalizeString(form.address) || "",
    company_id: form.company_id,
    company_name: normalizeString(form.company_name) || "",
    industry: normalizeString(form.industry) || "",
    reference_source: normalizeString(form.reference_source) || "",
    enquiry_source: normalizeString(form.enquiry_source) || "",
    resource_profile_link: normalizeString(form.resource_profile_link) || "",
    remarks: normalizeString(form.remarks) || "",
    status: normalizeString(form.status) || "open"
  };

  const payload = buildFormData(cleanedForm, { skipEmpty: true });

  if (form.company_id && form.company_id !== "other") {
    payload.delete("company_name");
  }

  if (form.company_id === "other") {
    payload.delete("company_id");
    if (form.company_name) {
      payload.delete("company_name");
      payload.append("company_name", form.company_name);
    }
  }

  if (contacts.length) {
    payload.append("contacts", JSON.stringify(contacts));
  }

  attachments.forEach((file) => {
    payload.append("attachments", file);
  });

  return payload;
};
