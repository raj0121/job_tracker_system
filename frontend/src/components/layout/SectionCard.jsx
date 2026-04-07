const SectionCard = ({
  as: Component = "section",
  className = "",
  children,
  ...rest
}) => (
  <Component className={`section-card ${className}`.trim()} {...rest}>
    {children}
  </Component>
);

export default SectionCard;
