const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TEST_URI = 'mongodb://localhost:27017/cinetrack-test';

let app;
let User;

beforeAll(async () => {
  process.env.MONGO_URI = TEST_URI;
  app = require('../server');
  User = require('../models/User');

  await mongoose.connect(TEST_URI);
  await User.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);
  await User.create([
    { email: 'admin@cinetrack.com', passwordHash, role: 'admin' },
    { email: 'lockme@cinetrack.com', passwordHash, role: 'viewer' },
  ]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Аутентификация', () => {
  it('успешный логин + валидация + неверный пароль (200/400/401)', async () => {
    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@cinetrack.com', password: 'password123' });
    expect(ok.status).toBe(200);
    expect(ok.body).toHaveProperty('apiKey');
    expect(ok.body.role).toBe('admin');

    const bad = await request(app).post('/api/auth/login').send({});
    expect(bad.status).toBe(400);

    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@cinetrack.com', password: 'wrong' });
    expect(wrong.status).toBe(401);
  });

  it('блокировка после 5 неудачных попыток (429)', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'lockme@cinetrack.com', password: 'wrong' });
    }
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'lockme@cinetrack.com', password: 'password123' });
    expect(res.status).toBe(429);
  });

  it('recover не палит существование email (200)', async () => {
    const res = await request(app)
      .post('/api/auth/recover')
      .send({ email: 'unknown@example.com' });
    expect(res.status).toBe(200);
  });
});
