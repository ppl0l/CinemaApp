class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const badRequest = (msg = 'Некорректный запрос') =>
  new AppError(msg, 400, 'BAD_REQUEST');
const unauthorized = (msg = 'Не авторизован') =>
  new AppError(msg, 401, 'UNAUTHORIZED');
const forbidden = (msg = 'Недостаточно прав') =>
  new AppError(msg, 403, 'FORBIDDEN');
const notFound = (msg = 'Не найдено') => new AppError(msg, 404, 'NOT_FOUND');
const tooMany = (msg = 'Слишком много попыток') =>
  new AppError(msg, 429, 'TOO_MANY_REQUESTS');

module.exports = { badRequest, unauthorized, forbidden, notFound, tooMany };
