import { useEffect, useState } from "react";

const listeners = new Set();
let nextToastId = 1;

export const pushToast = (toast) => {
  const payload = {
    id: nextToastId++,
    tone: toast.tone || "info",
    message: toast.message || "",
    duration: toast.duration || 3000
  };

  listeners.forEach((listener) => listener(payload));
};

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (toast) => {
      setToasts((prev) => [...prev, toast]);

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, toast.duration);
    };

    listeners.add(handleToast);
    return () => listeners.delete(handleToast);
  }, []);

  return (
    <>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`.trim()}>
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
};

export default ToastProvider;
