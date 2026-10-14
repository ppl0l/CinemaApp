const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const {
  badRequest,
  unauthorized,
  forbidden,
  tooMany,
} = require('../utils/errors');
const { sendPasswordResetEmail } = require('../utils/mailer');

const router = express.Router();

const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
const SESSION_MS = 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 3;

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw badRequest('Введите email и пароль');
    if (password.length < 8) throw badRequest('Пароль минимум 8 символов');

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) throw badRequest('Пользователь уже существует');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role: 'viewer' });

    res.status(201).json({ message: 'Пользователь создан', role: user.role });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw badRequest('Введите email и пароль');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      throw unauthorized('Неверные учётные данные');
    }

    if (user.isLocked) {
      throw tooMany(
        'Аккаунт временно заблокирован из-за множества неудачных попыток входа'
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MS);
        logger.warn('Account locked after failed attempts', {
          email: user.email,
          attempts: user.loginAttempts,
        });
      }
      await user.save();
      throw unauthorized('Неверные учётные данные');
    }

    user.pruneExpiredSessions();

    if (user.activeSessions.length >= MAX_SESSIONS) {
      throw forbidden('Превышено максимальное количество активных сессий');
    }

    user.loginAttempts = 0;
    user.lockUntil = null;

    const apiKey = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_MS);

    user.apiKey = apiKey;
    user.apiKeyExpiresAt = expiresAt;
    user.activeSessions.push({ key: apiKey, expiresAt });

    await user.save();

    logger.info('User logged in', { email: user.email, role: user.role });

    res.status(200).json({
      apiKey,
      role: user.role,
      expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    req.user.activeSessions = req.user.activeSessions.filter(
      (s) => s.key !== req.token
    );

    if (req.user.activeSessions.length === 0) {
      req.user.apiKey = null;
      req.user.apiKeyExpiresAt = null;
    }

    await req.user.save();

    logger.info('User logged out', { email: req.user.email });

    res.status(200).json({ message: 'Успешный выход из системы' });
  } catch (err) {
    next(err);
  }
});

router.post('/recover', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw badRequest('Введите email');

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      try {
        await sendPasswordResetEmail(user.email, resetToken);
      } catch (mailErr) {
        logger.error('Failed to send reset email', { err: mailErr.message });
      }
    } else {
      logger.info('Recover requested for unknown email', { email });
    }

    res.status(200).json({
      message:
        'Если такой email зарегистрирован, инструкции по восстановлению отправлены',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw badRequest('Необходимы token и newPassword');
    }
    if (newPassword.length < 8) {
      throw badRequest('Пароль должен содержать минимум 8 символов');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw badRequest('Недействительный или просроченный токен');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.loginAttempts = 0;
    user.lockUntil = null;

    user.activeSessions = [];
    user.apiKey = null;
    user.apiKeyExpiresAt = null;

    await user.save();

    logger.info('Password reset successful', { email: user.email });

    res.status(200).json({ message: 'Пароль успешно изменён' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
