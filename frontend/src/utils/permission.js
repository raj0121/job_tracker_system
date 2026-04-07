import { authStore } from "../store/useAuthStore";

export const matchesPermission = (permissionList, permissionKey) => {
  if (!permissionKey) {
    return true;
  }

  if (permissionList.includes("*")) {
    return true;
  }

  return permissionList.includes(permissionKey)
    || (permissionKey.endsWith(":own") && permissionList.includes(permissionKey.replace(":own", ":any")));
};

const getPermissionList = () => {
  const snapshot = authStore.getState();
  return Array.isArray(snapshot.permissions) ? snapshot.permissions : [];
};

export const hasPermission = (permissionKey) => matchesPermission(getPermissionList(), permissionKey);

export const hasAnyPermission = (permissionKeys = []) => {
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) {
    return true;
  }

  const permissionList = getPermissionList();
  return permissionKeys.some((permissionKey) => matchesPermission(permissionList, permissionKey));
};

export const hasAllPermissions = (permissionKeys = []) => {
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) {
    return true;
  }

  const permissionList = getPermissionList();
  return permissionKeys.every((permissionKey) => matchesPermission(permissionList, permissionKey));
};
