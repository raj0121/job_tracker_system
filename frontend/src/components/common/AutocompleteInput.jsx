import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api, { extractData } from "../../services/api";
import useDebouncedValue from "../../hooks/useDebouncedValue";

const getDefaultOptionKey = (option) => `${option.id || option.value}-${option.label || option.value}`;

const AutocompleteInput = ({
  entity,
  value,
  onChange,
  onSelect,
  workspaceId,
  placeholder = "",
  disabled = false,
  minChars = 1,
  limit = 8,
  inputClassName = "input-field",
  inputStyle = {},
  dropdownStyle = {},
  optionStyle = {},
  helperText = "",
  noResultsText = "No suggestions found",
  params = {},
  required = false,
  name,
  type = "text"
}) => {
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debouncedValue = useDebouncedValue(value, 280);
  const normalizedQuery = String(debouncedValue || "").trim();
  const serializedParams = useMemo(() => JSON.stringify(params || {}), [params]);

  const suggestionsQuery = useQuery({
    queryKey: ["suggestions", entity, workspaceId || "personal", normalizedQuery, limit, serializedParams],
    queryFn: async () => {
      const response = await api.get("/suggestions", {
        params: {
          entity,
          q: normalizedQuery,
          limit,
          ...(workspaceId ? { workspace_id: workspaceId } : {}),
          ...(params || {})
        }
      });

      return extractData(response) || [];
    },
    enabled: isOpen && !disabled && normalizedQuery.length >= minChars,
    staleTime: 60 * 1000,
    retry: false
  });

  const suggestions = useMemo(() => suggestionsQuery.data || [], [suggestionsQuery.data]);

  useEffect(() => {
    setHighlightedIndex(suggestions.length ? 0 : -1);
  }, [suggestions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectSuggestion = (suggestion) => {
    onChange(suggestion.value || suggestion.label || "");
    onSelect?.(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (!suggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Enter" && highlightedIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[highlightedIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        className={inputClassName}
        style={inputStyle}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        disabled={disabled}
        required={required}
      />

      {helperText && (
        <p className="mt-1 text-xs text-slate-500">
          {helperText}
        </p>
      )}

      {isOpen && normalizedQuery.length >= minChars && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.3rem)] z-30 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-lg"
          style={{ maxHeight: "240px", ...dropdownStyle }}
        >
          {suggestionsQuery.isLoading ? (
            <p className="px-3 py-2 text-sm text-slate-500">Loading suggestions...</p>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">{noResultsText}</p>
          ) : (
            suggestions.map((suggestion, index) => {
              const isActive = index === highlightedIndex;

              return (
                <button
                  key={getDefaultOptionKey(suggestion)}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectSuggestion(suggestion);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={[
                    "flex w-full flex-col items-start gap-1 rounded-xl px-3 py-3 text-left transition",
                    isActive ? "bg-slate-50" : "bg-transparent"
                  ].join(" ")}
                  style={optionStyle}
                >
                  <span className="text-sm font-semibold text-slate-900">{suggestion.label || suggestion.value}</span>
                  {suggestion.secondaryText && (
                    <span className="text-xs text-slate-500">{suggestion.secondaryText}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
