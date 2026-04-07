import { motion } from "framer-motion";
import { buttonTap } from "../../lib/motion";

const Button = ({
  as: Component = "button",
  variant = "primary",
  className = "",
  children,
  type = "button",
  ...rest
}) => {
  const classes = `${variant === "secondary" ? "btn-secondary" : "btn-primary"} ${className}`.trim();

  if (Component !== "button") {
    return (
      <Component className={classes} {...rest}>
        {children}
      </Component>
    );
  }

  return (
    <motion.button
      type={type}
      className={classes}
      whileTap={buttonTap.whileTap}
      transition={buttonTap.transition}
      {...rest}
    >
      {children}
    </motion.button>
  );
};

export default Button;
