import { motion } from "framer-motion";

const Card = ({ as: Component = "section", className = "", children, ...rest }) => {
  if (Component !== "section") {
    return (
      <Component className={`card ${className}`.trim()} {...rest}>
        {children}
      </Component>
    );
  }

  return (
    <motion.section
      className={`card ${className}`.trim()}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.section>
  );
};

export default Card;
