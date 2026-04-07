const ACCESS_COOKIE_NAME = process.env.AUTH_ACCESS_COOKIE_NAME || "accessToken";
const REFRESH_COOKIE_NAME = process.env.AUTH_REFRESH_COOKIE_NAME || "refreshToken";
const ACCESS_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const normalizeSameSite = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (["lax", "strict", "none"].includes(normalized)) {
    return normalized;
  }

  return null;
};

const resolveCookieDefaults = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = normalizeSameSite(process.env.AUTH_COOKIE_SAME_SITE)
    || (isProduction ? "none" : "lax");
  const secure = process.env.AUTH_COOKIE_SECURE
    ? process.env.AUTH_COOKIE_SECURE === "true"
    : sameSite === "none" || isProduction;

  return {
    httpOnly: true,
    sameSite,
    secure,
    path: "/"
  };
};

const withOptionalDomain = (options) => {
  const cookieDomain = String(process.env.AUTH_COOKIE_DOMAIN || "").trim();

  if (!cookieDomain) {
    return options;
  }

  return {
    ...options,
    domain: cookieDomain
  };
};

const buildCookieOptions = (maxAge) => withOptionalDomain({
  ...resolveCookieDefaults(),
  maxAge
});

const buildClearCookieOptions = () => withOptionalDomain(resolveCookieDefaults());

export const authCookieNames = {
  accessToken: ACCESS_COOKIE_NAME,
  refreshToken: REFRESH_COOKIE_NAME
};

export const parseCookieHeader = (header = "") =>
  String(header || "")
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((cookies, chunk) => {
      const separatorIndex = chunk.indexOf("=");
      const key = separatorIndex >= 0 ? chunk.slice(0, separatorIndex).trim() : chunk.trim();
      const rawValue = separatorIndex >= 0 ? chunk.slice(separatorIndex + 1) : "";

      if (!key) {
        return cookies;
      }

      try {
        cookies[key] = decodeURIComponent(rawValue);
      } catch {
        cookies[key] = rawValue;
      }

      return cookies;
    }, {});

export const attachAuthCookies = (res, { accessToken, refreshToken }) => {
  if (accessToken) {
    res.cookie(ACCESS_COOKIE_NAME, accessToken, buildCookieOptions(ACCESS_COOKIE_MAX_AGE_MS));
  }

  if (refreshToken) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, buildCookieOptions(REFRESH_COOKIE_MAX_AGE_MS));
  }
};

export const clearAuthCookies = (res) => {
  const options = buildClearCookieOptions();
  res.clearCookie(ACCESS_COOKIE_NAME, options);
  res.clearCookie(REFRESH_COOKIE_NAME, options);
};
