const Input = ({ as: Component = "input", className = "", ...rest }) => {
  const baseClass = Component === "textarea"
    ? "textarea"
    : Component === "select"
    ? "select"
    : "input";

  return <Component className={`${baseClass} ${className}`.trim()} {...rest} />;
};

export default Input;
