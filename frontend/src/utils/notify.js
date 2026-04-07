import { pushToast } from "../components/ui/ToastProvider";

export const notify = {
  success: (message) => pushToast({ tone: "success", message }),
  error: (message) => pushToast({ tone: "error", message }),
  info: (message) => pushToast({ tone: "info", message })
};

export default notify;
