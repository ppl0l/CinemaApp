const logger = require('../utils/logger');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Маршрут не найден', code: 'NOT_FOUND' });
}

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message =
    err.isOperational || statusCode < 500
      ? err.message
      : 'Внутренняя ошибка сервера';

  logger[statusCode >= 500 ? 'error' : 'warn']('Request error', {
    message: err.message,
    statusCode,
    requestId: req.id,
  });

  res
    .status(statusCode)
    .json({ error: message, code: err.code || 'INTERNAL_ERROR' });
}

module.exports = { errorHandler, notFoundHandler };
