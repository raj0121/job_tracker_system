import { useEffect, useReducer, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME } from "../config/constants";
import { formActionTypes, formReducer } from "../utils/atsFormReducer";
import { validateRequirementForm } from "../utils/atsValidation";
import { applyLocationDependency, getCityOptions, getCountryOptions, getStateOptions, getNestedCityOptions, getNestedStateOptions } from "../utils/location.utils";
import { buildRequirementPayload } from "../utils/payloadBuilders/buildRequirementPayload";
import { formatDateForInput } from "../utils/date.utils";
import { listCompanies } from "../services/company.service";
import { createRequirement, getRequirement, listAssignableUsers, updateRequirement } from "../services/requirement.service";
import { initialRequirementForm, locationOptions, normalizeKeywordsToArray, parseEducation } from "../pages/platform/requirements/requirementsConfig";

export const useRequirementForm = ({ id, mode = "create", canReadCompanies, isAuthenticated = true, authLoading = false, onSuccess }) => {
  const queryClient = useQueryClient();
  const [form, dispatch] = useReducer(formReducer, {
    ...initialRequirementForm,
    keywords: Array.isArray(initialRequirementForm.keywords) ? initialRequirementForm.keywords : []
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [existingFile, setExistingFile] = useState(null);

  const isEdit = mode === "edit";

  const requirementQuery = useQuery({
    queryKey: ["platform", "requirements", id],
    queryFn: () => getRequirement(id),
    enabled: Boolean(id) && isEdit && isAuthenticated && !authLoading
  });

  const usersQuery = useQuery({
    queryKey: ["platform", "users", "assignable"],
    queryFn: listAssignableUsers,
    enabled: isEdit && isAuthenticated && !authLoading,
    staleTime: DEFAULT_STALE_TIME
  });

  const companiesQuery = useQuery({
    queryKey: ["companies", "list"],
    queryFn: listCompanies,
    enabled: (!isEdit || (isAuthenticated && !authLoading)) && canReadCompanies,
    staleTime: DEFAULT_STALE_TIME
  });

  useEffect(() => {
    if (!isEdit || !requirementQuery.data) {
      return;
    }

    const requirement = requirementQuery.data;
    const durationMonths = requirement.duration_months !== null && requirement.duration_months !== undefined
      ? String(requirement.duration_months)
      : (requirement.duration_year !== null && requirement.duration_year !== undefined
        ? String(Number(requirement.duration_year) * 12)
        : "");

    dispatch({
      type: formActionTypes.replaceForm,
      payload: {
        ...initialRequirementForm,
        company_id: requirement.company_id ? String(requirement.company_id) : "",
        client_name: requirement.client_name || "",
        end_client_name: requirement.end_client_name || "",
        position: requirement.position || requirement.title || "",
        industry: requirement.industry || "",
        department: requirement.department || "",
        client_job_id: requirement.client_job_id || "",
        min_exp_year: requirement.min_exp_year !== null && requirement.min_exp_year !== undefined ? String(requirement.min_exp_year) : "",
        min_exp_month: requirement.min_exp_month !== null && requirement.min_exp_month !== undefined ? String(requirement.min_exp_month) : "",
        max_exp_year: requirement.max_exp_year !== null && requirement.max_exp_year !== undefined ? String(requirement.max_exp_year) : "",
        max_exp_month: requirement.max_exp_month !== null && requirement.max_exp_month !== undefined ? String(requirement.max_exp_month) : "",
        no_of_positions: requirement.no_of_positions !== null && requirement.no_of_positions !== undefined ? String(requirement.no_of_positions) : "1",
        assign_date: formatDateForInput(requirement.assign_date || requirement.due_date),
        assigned_to: requirement.assigned_to ? String(requirement.assigned_to) : "",
        email_subject: requirement.email_subject || "",
        country: requirement.country || "",
        state: requirement.state || "",
        city: requirement.city || "",
        zip_code: requirement.zip_code || "",
        job_type: requirement.job_type || "",
        workplace_type: requirement.workplace_type || "",
        priority: requirement.priority || "medium",
        status: requirement.status || "open",
        duration_year: requirement.duration_year !== null && requirement.duration_year !== undefined ? String(requirement.duration_year) : "",
        duration_months: durationMonths,
        keywords: normalizeKeywordsToArray(requirement.keywords),
        remarks: requirement.remarks || "",
        description: requirement.description || requirement.notes || "",
        education: parseEducation(requirement.education).length ? parseEducation(requirement.education) : initialRequirementForm.education,
        file: null
      }
    });
    setErrors({});
    setSubmitError("");
    if (requirement.file_url || requirement.file_original_name) {
      setExistingFile({
        url: requirement.file_url || "",
        name: requirement.file_original_name || requirement.file_url || ""
      });
    } else {
      setExistingFile(null);
    }
  }, [isEdit, requirementQuery.data]);

  const mutation = useMutation({
    mutationFn: (payload) => (
      isEdit
        ? updateRequirement({ id, payload })
        : createRequirement(payload)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "requirements"] });
      onSuccess?.();
    },
    onError: (error) => {
      setSubmitError(error?.response?.data?.message || `Unable to ${isEdit ? "update" : "create"} requirement.`);
    }
  });

  const handleChange = (event) => {
    const { name, value, files } = event.target;

    if (name === "file") {
      dispatch({ type: formActionTypes.setField, name, value: files?.[0] || null });
      return;
    }

    if (name === "country" || name === "state") {
      dispatch({
        type: formActionTypes.replaceForm,
        payload: applyLocationDependency(form, name, value)
      });
      return;
    }

    dispatch({ type: formActionTypes.setField, name, value });
  };

  const handleEducationChange = (index, field, value) => {
    dispatch({
      type: formActionTypes.setNestedItem,
      name: "education",
      index,
      field,
      value
    });
  };

  const addEducation = () => {
    dispatch({
      type: formActionTypes.addNestedItem,
      name: "education",
      item: { education_group: "", education_type: "", specialization: "" }
    });
  };

  const removeEducation = (index) => {
    dispatch({
      type: formActionTypes.removeNestedItem,
      name: "education",
      index,
      fallbackItem: initialRequirementForm.education[0]
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitError("");
    const nextErrors = validateRequirementForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    mutation.mutate(buildRequirementPayload(form, { includeAssignedTo: isEdit }));
  };

  const usersPayload = usersQuery.data;
  const assignableUsers = Array.isArray(usersPayload) ? usersPayload : (usersPayload?.data || []);
  const companiesPayload = companiesQuery.data;
  const companies = Array.isArray(companiesPayload) ? companiesPayload : (companiesPayload?.data || []);

  return {
    form,
    errors,
    submitError,
    existingFile,
    mutation,
    requirementQuery,
    usersQuery,
    assignableUsers,
    companiesQuery,
    companies,
    countryOptions: isEdit ? Object.keys(locationOptions) : getCountryOptions(),
    stateOptions: isEdit ? getNestedStateOptions(locationOptions, form.country) : getStateOptions(form.country),
    cityOptions: isEdit ? getNestedCityOptions(locationOptions, form.country, form.state) : getCityOptions(form.country, form.state),
    handleChange,
    handleSubmit,
    handleEducationChange,
    addEducation,
    removeEducation
  };
};
