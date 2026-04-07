import { useSyncExternalStore } from "react";
import { normalizeRole } from "../utils/roles";

const state = {
  user: null,
  roles: [],
  permissions: []
};

const listeners = new Set();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const deriveRoles = (user) => {
  if (!user) {
    return [];
  }

  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles.map((role) => normalizeRole(role?.key || role?.name || role));
  }

  const role = normalizeRole(user.role);
  return role && role !== "unknown" ? [role] : [];
};

export const authStore = {
  getState: () => state,
  setState: (partial) => {
    Object.assign(state, partial);
    emitChange();
  },
  setAuthState: ({ user = null, permissions = [] } = {}) => {
    state.user = user;
    state.roles = deriveRoles(user);
    state.permissions = Array.isArray(permissions) ? permissions : [];
    emitChange();
  },
  clear: () => {
    state.user = null;
    state.roles = [];
    state.permissions = [];
    emitChange();
  },
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};

export const useAuthStore = (selector = (snapshot) => snapshot) => (
  useSyncExternalStore(
    authStore.subscribe,
    () => selector(authStore.getState()),
    () => selector(authStore.getState())
  )
);
