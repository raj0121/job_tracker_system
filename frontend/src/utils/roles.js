const ROLE_ALIASES = {
  superadmin: ["superadmin", "super_admin", "super-admin", "super admin", "superadministrator"],
  admin: ["admin", "administrator"],
  hr: ["hr", "human resources", "human-resources", "human_resources"],
  recruiter: ["recruiter"]
};

const UNKNOWN_ROLE = "unknown";

export const normalizeRole = (role) => {
  const value = (role || "").toString().trim().toLowerCase();
  if (!value) {
    return UNKNOWN_ROLE;
  }

  for (const [canonicalRole, aliases] of Object.entries(ROLE_ALIASES)) {
    if (aliases.includes(value)) {
      return canonicalRole;
    }
  }

  const normalized = value.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || UNKNOWN_ROLE;
};

export const isSuperAdminRole = (role) => normalizeRole(role) === "superadmin";

export const getHomePathForRole = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole !== UNKNOWN_ROLE) {
    return "/app/dashboard";
  }

  return "/login";
};
