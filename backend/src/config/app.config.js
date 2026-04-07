
export const config = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET,

  db: {
    host: process.env.DB_HOST,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  }
};
