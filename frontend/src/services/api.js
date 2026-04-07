import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  // baseURL: import.meta.env.VITE_API_URL || "https://Rovexapex.com/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

// Rovexapex.com

const unwrap = (payload) => {
  if (!payload) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }

  return payload;
};

let isRefreshing = false;
let refreshSubscribers = [];
let forcedLogoutInProgress = false;

const isLogoutInProgress = () => localStorage.getItem("logoutInProgress") === "true";

const emitSessionEnded = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:session-ended"));
  }
};

const clearSessionAndRedirect = () => {
  emitSessionEnded();

  if (forcedLogoutInProgress) {
    return;
  }

  forcedLogoutInProgress = true;
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
    return;
  }

  setTimeout(() => {
    forcedLogoutInProgress = false;
  }, 300);
};

const notifySubscribersSuccess = () => {
  refreshSubscribers.forEach((subscriber) => subscriber.resolve());
  refreshSubscribers = [];
};

const notifySubscribersFailure = (error) => {
  refreshSubscribers.forEach((subscriber) => subscriber.reject(error));
  refreshSubscribers = [];
};

api.interceptors.request.use(
  (config) => {
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      if (typeof config.headers?.delete === "function") {
        config.headers.delete("Content-Type");
      } else if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    config.withCredentials = true;
    forcedLogoutInProgress = false;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || !error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    if (isLogoutInProgress()) {
      return Promise.reject(error);
    }

    const isLoginOrRegisterRequest = originalRequest.url?.includes("/auth/login")
      || originalRequest.url?.includes("/auth/register");
    const isRefreshRequest = originalRequest.url?.includes("/auth/refresh-token");
    if (isRefreshRequest || isLoginOrRegisterRequest) {
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshSubscribers.push({
          resolve: () => {
            resolve(api(originalRequest));
          },
          reject
        });
      });
    }

    isRefreshing = true;

    try {
      await axios.post(
        `${api.defaults.baseURL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      );

      if (isLogoutInProgress()) {
        throw new Error("Logout in progress");
      }

      notifySubscribersSuccess();
      return api(originalRequest);
    } catch (refreshError) {
      notifySubscribersFailure(refreshError);
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const extractData = (response) => unwrap(response?.data);

export default api;
