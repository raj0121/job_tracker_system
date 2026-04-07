const MetaRow = ({ children, className = "", ...rest }) => (
  <div className={`meta-row ${className}`.trim()} {...rest}>
    {children}
  </div>
);

export default MetaRow;
