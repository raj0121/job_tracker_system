const HeroPanel = ({
  badge,
  badgeTone = "info",
  title,
  subtitle,
  actions,
  children,
  className = ""
}) => {
  const badgeClass = badge
    ? `badge${badgeTone ? ` badge--${badgeTone}` : ""}`
    : "";

  return (
    <section className={`hero-panel ${className}`.trim()}>
      <div className="page-header">
        <div>
          {badge && <span className={badgeClass}>{badge}</span>}
          {title && <h2 className={badge ? "hero-title" : ""}>{title}</h2>}
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
};

export default HeroPanel;
