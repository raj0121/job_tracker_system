const SectionHeader = ({ title, description, badge, action, className = "" }) => (
  <div className={`card-header ${className}`.trim()}>
    <div className="page-header">
      <div>
        <div className="header-inline">
          <h2 className="card-title">{title}</h2>
          {badge}
        </div>
        {description ? <p className="card-subtitle">{description}</p> : null}
      </div>
      {action ? <div className="page-actions">{action}</div> : null}
    </div>
  </div>
);

export default SectionHeader;
