import { motion } from "framer-motion";
import { pageTransition } from "../../lib/motion";

const PageShell = ({ children, className = "" }) => (
  <motion.div
    className={`page-shell ${className}`.trim()}
    initial={pageTransition.initial}
    animate={pageTransition.animate}
    exit={pageTransition.exit}
  >
    {children}
  </motion.div>
);

export default PageShell;
