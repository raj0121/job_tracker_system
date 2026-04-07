const FormSection = ({ title, children, className = "", grid = true }) => (
  <section className={`section ${className}`.trim()}>
    {title && <h4 className="section-title">{title}</h4>}
    {grid ? <div className="form-grid">{children}</div> : children}
  </section>
);

export default FormSection;
