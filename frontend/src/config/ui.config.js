export const STATUS_TONE = {
  new: "badge badge--info",
  screening: "badge badge--warning",
  interview: "badge",
  rejected: "badge badge--danger",
  hired: "badge badge--success",
  active: "badge badge--info",
  generated: "badge badge--success",
  open: "badge badge--info",
  assigned: "badge badge--warning",
  closed: "badge badge--success",
  on_hold: "badge badge--warning"
};

export const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(parsed);
};

export const getStatusTone = (status) => STATUS_TONE[String(status || "").trim().toLowerCase()] || "badge";
