const SidePanel = ({ children, className = "", ...rest }) => (
  <aside className={`side-panel ${className}`.trim()} {...rest}>
    {children}
  </aside>
);

export default SidePanel;
