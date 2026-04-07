const toneClassMap = {
  default: "badge badge--default",
  success: "badge badge--success",
  danger: "badge badge--danger",
  info: "badge",
  warning: "badge badge--warning"
};

const Badge = ({ children, tone = "info", className = "" }) => (
  <span className={`${toneClassMap[tone] || "badge"} ${className}`.trim()}>
    {children}
  </span>
);

export default Badge;
