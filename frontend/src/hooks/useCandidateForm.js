import { useReducer, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_GC_TIME } from "../config/constants";
import { formActionTypes, formReducer } from "../utils/atsFormReducer";
import { validateCandidateForm } from "../utils/atsValidation";
import { applyLocationDependency, getCityOptions, getCountryOptions, getStateOptions } from "../utils/location.utils";
import { buildCandidatePayload } from "../utils/payloadBuilders/buildCandidatePayload";
import { createCandidate } from "../services/candidate.service";
import { listDesignations } from "../services/master.service";

const createEmptyEducation = () => ({
  educationGroup: "",
  educationType: "",
  university: "",
  cgpa: "",
  year: "",
  specialization: ""
});

const createEmptyExperience = () => ({
  company: "",
  role: "",
  years: "",
  months: "",
  description: ""
});

const initialCandidateForm = {
  name: "",
  position: "",
  department: "",
  designationId: "",
  compensation: "",
  currentSalary: "",
  expectedSalary: "",
  taxTerms: "",
  workAuthorization: "",
  phone: "",
  email: "",
  availabilityDays: "",
  nativePlace: "",
  country: "",
  state: "",
  city: "",
  zipCode: "",
  relocate: false,
  source: "",
  cv: null,
  status: "New",
  educations: [createEmptyEducation()],
  experiences: [createEmptyExperience()]
};

const createInitialCandidateForm = () => ({
  ...initialCandidateForm,
  educations: [createEmptyEducation()],
  experiences: [createEmptyExperience()]
});

export const useCandidateForm = ({ onSuccess }) => {
  const queryClient = useQueryClient();
  const [form, dispatch] = useReducer(formReducer, undefined, createInitialCandidateForm);
  const [formKey, setFormKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const designationsQuery = useQuery({
    queryKey: ["masters", "designations"],
    queryFn: listDesignations,
    staleTime: 5 * 60 * 1000,
    gcTime: DEFAULT_GC_TIME
  });

  const createMutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "candidates"] });
      setErrors({});
      setSubmitError("");
      onSuccess?.();
    },
    onError: (error) => {
      setSubmitError(error?.response?.data?.message || "Unable to create candidate.");
    }
  });

  const handleChange = (event) => {
    const { name, value, type, checked, files } = event.target;

    if (type === "checkbox") {
      dispatch({ type: formActionTypes.setField, name, value: checked });
      return;
    }

    if (type === "file") {
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

  const updateNestedItem = (name, index, field, value) => {
    dispatch({
      type: formActionTypes.setNestedItem,
      name,
      index,
      field,
      value
    });
  };

  const addNestedItem = (name, item) => {
    dispatch({
      type: formActionTypes.addNestedItem,
      name,
      item
    });
  };

  const removeNestedItem = (name, index, fallbackItem) => {
    dispatch({
      type: formActionTypes.removeNestedItem,
      name,
      index,
      fallbackItem
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitError("");
    const nextErrors = validateCandidateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSubmitError("Please correct the highlighted candidate details.");
      return;
    }

    const payload = buildCandidatePayload(form);
    if (!payload.name) {
      setSubmitError("Candidate name is required.");
      return;
    }

    createMutation.mutate(payload);
  };

  const handleReset = () => {
    dispatch({ type: formActionTypes.resetForm, payload: createInitialCandidateForm() });
    setErrors({});
    setSubmitError("");
    setFormKey((prev) => prev + 1);
  };

  const designationsPayload = designationsQuery.data;
  const designations = Array.isArray(designationsPayload)
    ? designationsPayload
    : (designationsPayload?.data || []);

  return {
    form,
    formKey,
    errors,
    submitError,
    createMutation,
    designationsQuery,
    designations,
    countryOptions: getCountryOptions(),
    stateOptions: getStateOptions(form.country),
    cityOptions: getCityOptions(form.country, form.state),
    handleChange,
    handleSubmit,
    handleReset,
    updateEducation: (index, field, value) => updateNestedItem("educations", index, field, value),
    addEducation: () => addNestedItem("educations", createEmptyEducation()),
    removeEducation: (index) => removeNestedItem("educations", index, createEmptyEducation()),
    updateExperience: (index, field, value) => updateNestedItem("experiences", index, field, value),
    addExperience: () => addNestedItem("experiences", createEmptyExperience()),
    removeExperience: (index) => removeNestedItem("experiences", index, createEmptyExperience()),
    setRelocate: (value) => dispatch({ type: formActionTypes.setField, name: "relocate", value })
  };
};
