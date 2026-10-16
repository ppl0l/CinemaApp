require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const logger = require('./utils/logger');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/cinetrack';
const WINDOW_MS = 5 * 60 * 1000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  const startedAt = Date.now();
  res.on('finish', () => {
    logger.info('HTTP', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(rateLimit({ windowMs: WINDOW_MS, max: 300 }));
app.use(
  '/api/auth',
  rateLimit({
    windowMs: WINDOW_MS,
    max: 20,
    message: { error: 'Слишком много попыток. Попробуйте позже.' },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

async function seedUsers() {
  try {
    if ((await User.countDocuments()) > 0) return;
    const passwordHash = await bcrypt.hash('password123', 10);
    await User.create([
      { email: 'admin@cinetrack.com', passwordHash, role: 'admin' },
      { email: 'editor@cinetrack.com', passwordHash, role: 'editor' },
      { email: 'viewer@cinetrack.com', passwordHash, role: 'viewer' },
    ]);
    logger.info('Test users seeded');
  } catch (err) {
    logger.error('Error seeding users', { err: err.message });
  }
}

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('MongoDB connected');
    await seedUsers();
    app.listen(PORT, () => logger.info(`Server on http://localhost:${PORT}`));
  } catch (err) {
    logger.error('Startup error', { err: err.message });
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = app;
