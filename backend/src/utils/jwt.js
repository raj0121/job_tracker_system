import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRES_IN = "1h";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const JWT_ISSUER = "job-tracker-api";

const getSecret = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

export const signAccessToken = (payload) => {
  return jwt.sign(payload, getSecret("JWT_SECRET"), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: JWT_ISSUER
  });
};

export const signRefreshToken = (payload) => {
  return jwt.sign(payload, getSecret("JWT_REFRESH_SECRET"), {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: JWT_ISSUER
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, getSecret("JWT_SECRET"), {
    issuer: JWT_ISSUER
  });
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, getSecret("JWT_REFRESH_SECRET"), {
    issuer: JWT_ISSUER
  });
};
