export const CANDIDATE_STATUS_OPTIONS = ["New", "Screening", "Interview", "Rejected", "Hired"];

export const ENQUIRY_STATUS_OPTIONS = ["open", "assigned", "closed"];

export const REQUIREMENT_STATUS_OPTIONS = ["open", "on_hold", "closed"];

export const REQUIREMENT_PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"];

export const normalizeStatusValue = (value) => String(value || "").trim().toLowerCase();

export const formatStatusLabel = (value) => (
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "-"
);

export const normalizePriorityValue = (value) => normalizeStatusValue(value);

export const getEnquiryStatusMeta = (status) => {
  const normalized = normalizeStatusValue(status);

  if (!normalized) {
    return { key: "", label: "-" };
  }

  if (normalized === "active" || normalized === "generated") {
    return { key: normalized, label: formatStatusLabel(normalized) };
  }

  if (normalized === "open" || normalized === "assigned") {
    return { key: "active", label: "Active" };
  }

  if (normalized === "closed") {
    return { key: "generated", label: "Generated" };
  }

  return { key: normalized, label: formatStatusLabel(normalized) };
};
