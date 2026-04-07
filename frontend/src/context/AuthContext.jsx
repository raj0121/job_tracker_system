import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { extractData } from "../services/api";
import { authStore } from "../store/useAuthStore";
import { normalizeRole } from "../utils/roles";
import { matchesPermission } from "../utils/permission";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const restoreRanRef = useRef(false);

  const emitSessionEnded = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:session-ended"));
    }
  };

  const fetchPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const response = await api.get("/auth/permissions");
      const payload = extractData(response);
      setPermissions(payload?.permissions || []);
    } catch {
      setPermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      if (restoreRanRef.current) {
        return;
      }
      restoreRanRef.current = true;

      try {
        const response = await api.get("/auth/me");
        const profile = extractData(response);
        const normalizedUser = profile ? { ...profile, role: normalizeRole(profile.role) } : null;
        setUser(normalizedUser);
        setToken(normalizedUser ? "authenticated" : null);
        await fetchPermissions();
      } catch {
        setToken(null);
        setUser(null);
        setPermissions([]);
        authStore.clear();
        setPermissionsLoading(false);
      } finally {
        setLoading(false);
      }
    };

    const handleSessionEnded = () => {
      setToken(null);
      setUser(null);
      setPermissions([]);
      setPermissionsLoading(false);
      setLoading(false);
    };

    const handleStorageSync = (event) => {
      if (event.key === "logoutInProgress" && event.newValue === "true") {
        setToken(null);
        setUser(null);
        setPermissions([]);
        authStore.clear();
        setPermissionsLoading(false);
      }
    };

    window.addEventListener("auth:session-ended", handleSessionEnded);
    window.addEventListener("storage", handleStorageSync);
    restoreSession();

    return () => {
      window.removeEventListener("auth:session-ended", handleSessionEnded);
      window.removeEventListener("storage", handleStorageSync);
    };
  }, []);

  const login = async (email, password, deviceFingerprint = "web-client") => {
    const response = await api.post("/auth/login", {
      email: (email || "").trim(),
      password,
      device_fingerprint: deviceFingerprint
    });

    const payload = extractData(response);
    const nextUser = payload.user ? { ...payload.user, role: normalizeRole(payload.user.role) } : null;

    if (!nextUser) {
      throw new Error("Invalid login response from server.");
    }

    setToken("authenticated");
    setUser(nextUser);
    setLoading(false);
    await fetchPermissions();

    return nextUser;
  };

  const updateUser = (nextUser) => {
    if (!nextUser) {
      setUser(null);
      setPermissions([]);
      authStore.clear();
      return;
    }

    setUser({ ...nextUser, role: normalizeRole(nextUser.role) });
  };

  const logout = async () => {
    localStorage.setItem("logoutInProgress", "true");
    emitSessionEnded();

    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout API errors and clear local state anyway.
    } finally {
      localStorage.removeItem("logoutInProgress");
      setToken(null);
      setUser(null);
      setPermissions([]);
      authStore.clear();
      setPermissionsLoading(false);
      setLoading(false);
      if (navigate) {
        navigate("/login", { replace: true });
      } else if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  useEffect(() => {
    authStore.setAuthState({ user, permissions });
  }, [permissions, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        permissions,
        permissionsLoading,
        roles: authStore.getState().roles,
        hasPermission: (required) => {
          if (!required) {
            return true;
          }

          if (normalizeRole(user?.role) === "superadmin") {
            return true;
          }

          const permissionList = Array.isArray(permissions) ? permissions : [];
          if (Array.isArray(required)) {
            return required.every((permissionKey) => matchesPermission(permissionList, permissionKey));
          }

          return matchesPermission(permissionList, required);
        },
        login,
        logout,
        updateUser,
        isAuthenticated: Boolean(token)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
