export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.status = statusCode;
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
