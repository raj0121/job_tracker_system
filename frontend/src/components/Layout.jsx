import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { pageTransition } from "../lib/motion";

const Layout = ({ children }) => {
  const location = useLocation();

  return (
    <div className="layout-shell">
      <div className="layout-grid">
        <Sidebar />
        <main className="layout-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className="content-stack"
              initial={pageTransition.initial}
              animate={pageTransition.animate}
              exit={pageTransition.exit}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Layout;
