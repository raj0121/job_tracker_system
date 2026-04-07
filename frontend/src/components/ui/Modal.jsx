import { AnimatePresence, motion } from "framer-motion";
import { fadeIn, modalAnimation } from "../../lib/motion";

const Modal = ({ open, title, description, children, actions, onClose }) => (
  <AnimatePresence>
    {open ? (
      <motion.div
        className="modal-overlay"
        initial={fadeIn.initial}
        animate={fadeIn.animate}
        exit={fadeIn.exit}
      >
        <motion.div
          className="modal-box"
          initial={modalAnimation.initial}
          animate={modalAnimation.animate}
          exit={modalAnimation.exit}
        >
          <div className="modal-header">
            <div className="page-header">
              <div>
                {title ? <h3 className="card-title">{title}</h3> : null}
                {description ? <p className="card-subtitle">{description}</p> : null}
              </div>
              {onClose ? (
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Close
                </button>
              ) : null}
            </div>
          </div>
          <div className="modal-body">{children}</div>
          {actions ? <div className="modal-actions">{actions}</div> : null}
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export default Modal;
