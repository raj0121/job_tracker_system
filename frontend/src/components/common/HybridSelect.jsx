import { useMemo } from "react";
import CreatableSelect from "react-select/creatable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { extractData } from "../../services/api";

const customStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "44px",
    background: "#ffffff",
    borderColor: state.isFocused ? "#3b82f6" : "#e2e8f0",
    borderRadius: "0.75rem",
    padding: "0 4px",
    boxShadow: state.isFocused ? "0 0 0 4px rgba(59, 130, 246, 0.14)" : "none",
    "&:hover": {
      borderColor: state.isFocused ? "#3b82f6" : "#cbd5e1"
    }
  }),
  menu: (base) => ({
    ...base,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "1rem",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    zIndex: 100
  }),
  option: (base, state) => ({
    ...base,
    background: state.isFocused ? "#f8fafc" : "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
    "&:active": {
      background: "#f1f5f9"
    }
  }),
  singleValue: (base) => ({
    ...base,
    color: "#0f172a"
  }),
  multiValue: (base) => ({
    ...base,
    background: "#f8fafc",
    borderRadius: "999px",
    padding: "2px 8px",
    border: "1px solid #e2e8f0"
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#475569",
    fontSize: "0.85rem"
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#64748b",
    "&:hover": {
      background: "transparent",
      color: "#dc2626"
    }
  }),
  input: (base) => ({
    ...base,
    color: "#0f172a"
  }),
  placeholder: (base) => ({
    ...base,
    color: "#94a3b8"
  })
};

const HybridSelect = ({
  label,
  name,
  value,
  onChange,
  masterType,
  placeholder,
  isMulti = false,
  isDisabled = false,
  error = null,
}) => {
  const queryClient = useQueryClient();

  const { data: optionsData, isLoading } = useQuery({
    queryKey: ["masters", masterType],
    queryFn: () => api.get(`/masters/${masterType}`).then(extractData),
    staleTime: 5 * 60 * 1000,
    enabled: !!masterType,
  });

  const createMutation = useMutation({
    mutationFn: (newName) =>
      api.post(`/masters/${masterType}`, { name: newName }).then(extractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", masterType] });
    },
  });

  const options = useMemo(() => {
    const rawData = Array.isArray(optionsData) ? optionsData : optionsData?.data || [];
    return rawData.map((item) => ({
      label: item.name,
      value: item.name,
    }));
  }, [optionsData]);

  const handleChange = async (newValue, actionMeta) => {
    if (actionMeta.action === "create-option") {
      const createdValue = isMulti
        ? newValue[newValue.length - 1].value
        : newValue.value;
      
      const normalizedValue = createdValue.trim();
      
      try {
        const createdRecord = await createMutation.mutateAsync(normalizedValue);
        if (isMulti) {
          const updatedValue = newValue.map(v => 
            v.value === createdValue ? { label: createdRecord.name, value: createdRecord.name } : v
          );
          onChange({
            target: {
              name,
              value: updatedValue.map(v => v.value),
            },
          });
        } else {
          onChange({
            target: {
              name,
              value: createdRecord.name,
            },
          });
        }
      } catch {
        return;
      }
    } else {
      if (isMulti) {
        onChange({
          target: {
            name,
            value: newValue ? newValue.map((v) => v.value) : [],
          },
        });
      } else {
        onChange({
          target: {
            name,
            value: newValue ? newValue.value : "",
          },
        });
      }
    }
  };

  const selectedValue = useMemo(() => {
    if (isMulti) {
      return Array.isArray(value)
        ? value.map((v) => ({ label: v, value: v }))
        : [];
    }
    return value ? { label: value, value: value } : null;
  }, [value, isMulti]);

  return (
    <div className="form-field">
      {label && <label>{label}</label>}
      <CreatableSelect
        isMulti={isMulti}
        isDisabled={isDisabled || isLoading || createMutation.isPending}
        isLoading={isLoading || createMutation.isPending}
        options={options}
        value={selectedValue}
        onChange={handleChange}
        placeholder={placeholder || (isLoading ? "Loading..." : "Select or type...")}
        styles={customStyles}
        formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
        classNamePrefix="hybrid-select"
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
};

export default HybridSelect;
