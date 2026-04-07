import { motion } from "framer-motion";
import { pageTransition } from "../../lib/motion";

const EmptyState = ({ icon, title, description, action, className = "" }) => (
  <motion.div
    className={`empty-state ${className}`.trim()}
    initial={pageTransition.initial}
    animate={pageTransition.animate}
  >
    {icon ? <div>{icon}</div> : null}
    <div className="empty-state-title">{title}</div>
    {description ? <div className="empty-state-description">{description}</div> : null}
    {action ? <div className="mt-12">{action}</div> : null}
  </motion.div>
);

export default EmptyState;
