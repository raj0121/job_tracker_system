const SplitLayout = ({ children, className = "" }) => (
  <div className={`split-layout ${className}`.trim()}>
    {children}
  </div>
);

export default SplitLayout;
