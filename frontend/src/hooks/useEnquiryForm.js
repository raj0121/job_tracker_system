import { useEffect, useReducer, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_GC_TIME, DEFAULT_STALE_TIME } from "../config/constants";
import { formActionTypes, formReducer } from "../utils/atsFormReducer";
import { validateEnquiryForm } from "../utils/atsValidation";
import { applyLocationDependency, getCityOptions, getCountryOptions, getStateOptions } from "../utils/location.utils";
import { buildEnquiryPayload } from "../utils/payloadBuilders/buildEnquiryPayload";
import { formatDateForInput } from "../utils/date.utils";
import { normalizeString } from "../utils/form.utils";
import useContacts from "./useContacts";
import { listCompanies } from "../services/company.service";
import { createEnquiry, getEnquiry, updateEnquiry, uploadEnquiryAttachments } from "../services/enquiry.service";
import { emptyContact, initialEnquiryForm } from "../pages/platform/enquiry/enquiryConfig";
import { ENQUIRY_STATUS_OPTIONS } from "../config/status.config";

export const useEnquiryForm = ({ id, mode = "create", canReadCompanies, onSuccess }) => {
  const queryClient = useQueryClient();
  const [form, dispatch] = useReducer(formReducer, {
    ...initialEnquiryForm,
    ...(mode === "edit" ? { status: "open" } : {})
  });
  const [errors, setErrors] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [formError, setFormError] = useState("");
  const {
    contacts,
    addContact,
    removeContact,
    replaceContacts,
    resetContacts,
    updateContact,
    getCleanContacts
  } = useContacts(emptyContact);

  const isEdit = mode === "edit";

  const enquiryQuery = useQuery({
    queryKey: ["platform", "enquiries", id],
    queryFn: () => getEnquiry(id),
    enabled: Boolean(id) && isEdit
  });

  const companiesQuery = useQuery({
    queryKey: ["companies", "list"],
    queryFn: listCompanies,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    enabled: canReadCompanies
  });

  useEffect(() => {
    const enquiry = enquiryQuery.data;
    if (!isEdit || !enquiry) {
      return;
    }

    const companyId = enquiry.company_id
      ? String(enquiry.company_id)
      : (enquiry.company_name ? "other" : "");

    dispatch({
      type: formActionTypes.replaceForm,
      payload: {
        client_name: enquiry.client_name || "",
        contact_number: enquiry.contact_number || "",
        email: enquiry.email || "",
        client_type: enquiry.client_type || "company",
        country: enquiry.country || "",
        state: enquiry.state || "",
        city: enquiry.city || "",
        zip_code: enquiry.zip_code || "",
        address: enquiry.address || "",
        company_id: companyId,
        company_name: enquiry.company_id ? "" : (enquiry.company_name || ""),
        industry: enquiry.industry || "",
        reference_source: enquiry.reference_source || "",
        enquiry_date: formatDateForInput(enquiry.enquiry_date),
        enquiry_source: enquiry.enquiry_source || "website",
        resource_profile_link: enquiry.resource_profile_link || "",
        remarks: enquiry.remarks || "",
        status: enquiry.status || "open"
      }
    });

    replaceContacts((enquiry.contacts || []).map((contact) => ({
      name: contact.name || "",
      mobile: contact.mobile || "",
      email: contact.email || "",
      designation: contact.designation || ""
    })));
  }, [isEdit, enquiryQuery.data, replaceContacts]);

  const mutation = useMutation({
    mutationFn: (payload) => (
      isEdit
        ? updateEnquiry({ id, payload })
        : createEnquiry(payload)
    ),
    onSuccess: async () => {
      if (isEdit && attachments.length) {
        const formData = new FormData();
        attachments.forEach((file) => formData.append("attachments", file));
        await uploadEnquiryAttachments({ id, payload: formData });
      }
      queryClient.invalidateQueries({ queryKey: ["platform", "enquiries"] });
      onSuccess?.();
    },
    onError: (error) => {
      setFormError(error?.response?.data?.message || `Unable to ${isEdit ? "update" : "save"} enquiry.`);
    }
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "country" || name === "state") {
      dispatch({
        type: formActionTypes.replaceForm,
        payload: applyLocationDependency(form, name, value)
      });
      return;
    }

    if (name === "company_id" && value !== "other") {
      dispatch({
        type: formActionTypes.patchFields,
        payload: { company_id: value, company_name: "" }
      });
      return;
    }

    dispatch({ type: formActionTypes.setField, name, value });
  };

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    setAttachments((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");

    const nextErrors = validateEnquiryForm(form, contacts);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setFormError(nextErrors.contacts || "Please correct the highlighted enquiry details.");
      return;
    }

    const cleanedContacts = getCleanContacts();

    if (!normalizeString(form.client_name)) {
      setFormError("Client name is required.");
      return;
    }

    if (isEdit) {
      mutation.mutate({
        client_name: form.client_name,
        contact_number: normalizeString(form.contact_number) || "",
        email: normalizeString(form.email) || "",
        client_type: normalizeString(form.client_type) || "",
        country: normalizeString(form.country) || "",
        state: normalizeString(form.state) || "",
        city: normalizeString(form.city) || "",
        zip_code: normalizeString(form.zip_code) || "",
        address: normalizeString(form.address) || "",
        company_id: form.company_id === "other" ? "" : form.company_id,
        company_name: form.company_id === "other" ? normalizeString(form.company_name) || "" : "",
        industry: normalizeString(form.industry) || "",
        reference_source: normalizeString(form.reference_source) || "",
        enquiry_date: form.enquiry_date || null,
        enquiry_source: normalizeString(form.enquiry_source) || "",
        resource_profile_link: normalizeString(form.resource_profile_link) || "",
        remarks: normalizeString(form.remarks) || "",
        status: ENQUIRY_STATUS_OPTIONS.includes(form.status) ? form.status : "open",
        contacts: cleanedContacts
      });
      return;
    }

    mutation.mutate(buildEnquiryPayload(form, cleanedContacts, attachments));
  };

  const handleReset = () => {
    dispatch({ type: formActionTypes.resetForm, payload: { ...initialEnquiryForm } });
    setErrors({});
    resetContacts();
    setAttachments([]);
    setFormError("");
  };

  const companiesPayload = companiesQuery.data;
  const companies = Array.isArray(companiesPayload) ? companiesPayload : (companiesPayload?.data || []);

  return {
    form,
    errors,
    attachments,
    formError,
    contacts,
    addContact,
    removeContact,
    updateContact,
    mutation,
    enquiryQuery,
    companiesQuery,
    companies,
    countryOptions: getCountryOptions(),
    stateOptions: getStateOptions(form.country),
    cityOptions: getCityOptions(form.country, form.state),
    handleChange,
    handleFiles,
    removeAttachment,
    handleSubmit,
    handleReset
  };
};
