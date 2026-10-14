const User = require('../models/User');
const { unauthorized, forbidden } = require('../utils/errors');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw unauthorized('Отсутствует ключ доступа. Войдите в систему');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const user = await User.findOne({ apiKey: token });

    if (!user || !user.apiKeyExpiresAt || user.apiKeyExpiresAt < new Date()) {
      throw unauthorized('Недействительный или просроченный ключ доступа');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
};

const authorize = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(forbidden('Недостаточно прав доступа'));
  }
  next();
};

module.exports = { authenticate, authorize };
