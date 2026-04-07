import { validationResult } from "express-validator";
import { AppError } from "../utils/AppError.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((err) => err.msg)
      .join(", ");

    throw new AppError(message, 400);
  }

  next();
};
