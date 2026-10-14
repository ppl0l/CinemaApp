const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TEST_URI = 'mongodb://localhost:27017/cinetrack-test';

let app;
let User;
let adminKey;

beforeAll(async () => {
  process.env.MONGO_URI = TEST_URI;
  app = require('../server');
  User = require('../models/User');

  await mongoose.connect(TEST_URI);
  await User.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);
  await User.create({
    email: 'admin@cinetrack.com',
    passwordHash,
    role: 'admin',
  });

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@cinetrack.com', password: 'password123' });
  adminKey = login.body.apiKey;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('CRUD /api/items', () => {
  it('полный жизненный цикл + права доступа', async () => {
    const noAuth = await request(app).get('/api/items');
    expect(noAuth.status).toBe(401);

    const created = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${adminKey}`)
      .field('title', 'Inception')
      .field('type', 'Фильм')
      .field('statusId', 'plan')
      .field('dueDate', '2026-01-01');
    expect(created.status).toBe(201);
    expect(created.body.title).toBe('Inception');

    const bad = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${adminKey}`)
      .field('type', 'Фильм')
      .field('statusId', 'plan')
      .field('dueDate', '2026-01-01');
    expect(bad.status).toBe(400);

    const del = await request(app)
      .delete(`/api/items/${created.body._id}`)
      .set('Authorization', `Bearer ${adminKey}`);
    expect(del.status).toBe(200);

    const notFound = await request(app)
      .delete(`/api/items/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${adminKey}`);
    expect(notFound.status).toBe(404);
  });

  it('просмотр списка (200)', async () => {
    const res = await request(app)
      .get('/api/items')
      .set('Authorization', `Bearer ${adminKey}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
