# CineTrack 🎬

A web application for managing a personal watchlist of movies and series, built as a **Single Page Application (SPA)** on the client and a **REST API** on the server with full CRUD operations, role-based access control, and automated CI.

Course: Modern Programming Platforms

---

## 📋 About The Project

CineTrack lets users track movies and series they plan to watch, are currently watching, or have completed. Each entry has a title, type (movie/series), status, due date, and a poster image. The client is a SPA (no page reloads), and the server exposes a proper REST API with correct HTTP methods and status codes.

### Key Features

**Core functionality:**

- **Full CRUD** — create, read, update, delete watchlist entries without page reload.
- **Filter** — by status (`All` / `В планах` / `Смотрю` / `Завершено`).
- **Poster upload** — via `multer`, `multipart/form-data`, images only, limit 5 MB.
- **Poster cleanup** — old poster files are removed from disk on update/delete.
- **Server-side validation** — required fields, enum checks for status and type.
- **Informative errors** — the client shows server error messages in a dedicated error box.
- **Dockerized** — the whole stack (app + MongoDB) runs in containers via `docker-compose`.

**Security & access control:**

- **RBAC with 3 roles** — `admin`, `editor`, `viewer` with different permissions.
- **Temporary API keys** — issued on login, expire after 24 hours, stored in MongoDB.
- **Brute-force protection** — account lockout after 5 failed attempts (5 min).
- **Rate limiting** — global (300 req / 5 min) and stricter for `/api/auth` (20 req / 5 min).
- **Session control** — max 3 concurrent sessions per user, logout revokes only current session.
- **Password reset via email** — one-time token, SHA-256 hashed, sent via Nodemailer (Gmail / SMTP / Ethereal).
- **Bcrypt password hashing** — 10 rounds, salt included.
- **Helmet** — secure HTTP headers.

**Observability & quality:**

- **Structured logging** — Winston, JSON in production, colorized in dev, with `requestId` for tracing.
- **HTTP status semantics** — proper codes for every situation (`200`, `201`, `400`, `401`, `403`, `404`, `429`, `500`).
- **Centralized error handling** — `AppError` class + global error middleware.
- **CI pipeline** — GitHub Actions runs lint, format check, and tests on every push / PR.
- **Automated tests** — Jest + Supertest, integration tests with a real MongoDB.

---

## 🛠 Technologies

**Backend:**

- **Node.js 20 + Express 4** — HTTP server and REST API.
- **MongoDB 7 + Mongoose 8** — database and schema validation.
- **bcryptjs** — password hashing.
- **Temporary API keys** — custom implementation with `crypto.randomBytes` + DB storage.
- **Nodemailer** — sending password-reset emails (Gmail / SMTP / Ethereal fallback).
- **Winston** — structured logging.
- **Helmet** — HTTP security headers.
- **express-rate-limit** — DoS / brute-force protection.
- **Multer** — `multipart/form-data` file uploads.
- **CORS** — cross-origin requests support.

**Frontend:**

- **Vanilla JavaScript** — SPA logic, `fetch` API, DOM manipulation, XSS-safe rendering.
- **HTML5 + CSS3** — layout with CSS variables, responsive grid.

**Infrastructure & DevOps:**

- **Docker + docker-compose** — containerized app and database.
- **GitHub Actions** — CI pipeline.
- **ESLint + Prettier** — code style enforcement.
- **Jest + Supertest** — automated tests.

---

## 📂 Project Structure

```
CineApp/
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions pipeline
├── server/
│   ├── middleware/
│   │   ├── auth.js                 # authenticate + authorize(roles)
│   │   └── errorHandler.js         # notFound + global error handler
│   ├── models/
│   │   ├── User.js                 # User schema (role, apiKey, sessions, lockout)
│   │   └── WatchlistItem.js        # Watchlist entry schema
│   ├── public/                     # SPA (client)
│   │   ├── app.js                  # SPA logic (auth, CRUD, filters, rendering)
│   │   ├── index.html              # Single page
│   │   └── style.css               # Styles
│   ├── routes/
│   │   ├── auth.js                 # /login, /logout, /recover, /reset-password
│   │   └── items.js                # CRUD for /api/items
│   ├── tests/
│   │   ├── auth.test.js            # Login, lockout, recover tests
│   │   └── items.test.js           # CRUD + RBAC tests
│   ├── uploads/                    # Uploaded posters
│   ├── utils/
│   │   ├── errors.js               # AppError + factories (400 / 401 / 403 / 404 / 429)
│   │   ├── logger.js               # Winston configuration
│   │   └── mailer.js               # Nodemailer (SMTP / Ethereal)
│   ├── .env.example                # Template without secrets
│   ├── .eslintrc.json              # ESLint rules
│   ├── .prettierrc                 # Prettier rules
│   ├── jest.config.js              # Jest configuration
│   ├── package.json
│   └── server.js                   # Express app + startup
├── .dockerignore
├── .gitignore
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🚀 Installation and Setup

### A) Quick start with Docker (recommended)

Make sure **Docker Desktop** is installed and running.

```bash
git clone https://github.com/ppl0l/CinemaApp.git
cd CinemaApp
docker compose up --build
```

Open **http://localhost:3000**.

To stop:

```bash
docker compose down
```

To stop and remove the database volume too:

```bash
docker compose down -v
```

---

### B) Manual setup (for development)

1. Start MongoDB locally on `mongodb://localhost:27017`.
2. Configure `.env` (copy `.env.example`, fill in SMTP if you want real emails — otherwise the Ethereal test account is used automatically).
3. Install dependencies and start the server:

```bash
cd server
npm install
npm start
```

Open **http://localhost:3000**.

On the first start the server seeds three test users:

| Email                  | Role   | Password      |
| ---------------------- | ------ | ------------- |
| `admin@cinetrack.com`  | admin  | `password123` |
| `editor@cinetrack.com` | editor | `password123` |
| `viewer@cinetrack.com` | viewer | `password123` |

---

## 🔌 REST API

### Auth endpoints

| Method | Route                       | Purpose                                                 | Success | Errors             |
| ------ | --------------------------- | ------------------------------------------------------- | ------- | ------------------ |
| POST   | `/api/auth/login`           | Log in, get temporary API key                           | 200     | 400, 401, 403, 429 |
| POST   | `/api/auth/logout`          | Revoke current session                                  | 200     | 401                |
| POST   | `/api/auth/recover`         | Request password reset email                            | 200     | 400                |
| POST   | `/api/auth/reset-password`  | Set a new password using the token from the email       | 200     | 400                |

### Items endpoints (require `Authorization: Bearer <apiKey>`)

| Method | Route              | Purpose                                                          | Roles allowed            | Success | Errors             |
| ------ | ------------------ | ---------------------------------------------------------------- | ------------------------ | ------- | ------------------ |
| GET    | `/api/items`       | List watchlist items. Query: `?status=plan\|watching\|completed` | admin, editor, viewer    | 200     | 401, 403           |
| POST   | `/api/items`       | Create new entry (`multipart/form-data`)                         | admin, editor            | 201     | 400, 401, 403      |
| PUT    | `/api/items/:id`   | Update entry (`multipart/form-data`)                             | admin, editor            | 200     | 400, 401, 403, 404 |
| DELETE | `/api/items/:id`   | Delete entry + remove poster file from disk                      | admin only               | 200     | 401, 403, 404      |

### Example: login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cinetrack.com","password":"password123"}'
```

Response:

```json
{
  "apiKey": "a3f9c1b2...64 hex chars...",
  "role": "admin",
  "expiresAt": "2026-10-16T21:00:00.000Z"
}
```

### Example: create item

```bash
curl -X POST http://localhost:3000/api/items \
  -H "Authorization: Bearer <apiKey>" \
  -F "title=Inception" \
  -F "type=Фильм" \
  -F "statusId=plan" \
  -F "dueDate=2026-01-01" \
  -F "poster=@poster.jpg"
```

---

## ✨ Implementation Details

### Data Model

**WatchlistItem:**

```js
{
  _id: ObjectId,
  title: 'Inception',
  type: 'Фильм' | 'Сериал',
  status: {
    id: 'plan' | 'watching' | 'completed',
    label: 'В планах' | 'Смотрю' | 'Завершено'
  },
  dueDate: '2026-01-01',
  poster: '/uploads/1730000000-123456789.jpg' | null,
  createdAt: Date,
  updatedAt: Date
}
```

**User:**

```js
{
  _id: ObjectId,
  email: String (unique, lowercase),
  passwordHash: String,                    // bcrypt
  role: 'admin' | 'editor' | 'viewer',
  apiKey: String | null,                   // current session key
  apiKeyExpiresAt: Date | null,
  activeSessions: [{ key, expiresAt }],    // max 3
  loginAttempts: Number,                   // brute-force counter
  lockUntil: Date | null,
  resetPasswordToken: String | null,       // SHA-256 hash
  resetPasswordExpires: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

### Authentication Flow

1. `POST /api/auth/login` → server verifies password, generates `crypto.randomBytes(32).toString('hex')`, stores it as `apiKey` (24h TTL) and pushes into `activeSessions`.
2. Client sends `Authorization: Bearer <apiKey>` on every protected request.
3. `authenticate` middleware finds user by `apiKey`, verifies `apiKeyExpiresAt > now`, sets `req.user`.
4. `authorize(['admin','editor'])` middleware checks `req.user.role`.
5. `POST /api/auth/logout` removes the current session from `activeSessions` and nulls `apiKey` if it was the last one.

### Brute-force Protection

- Each failed login increments `loginAttempts`.
- After 5 failures → `lockUntil = now + 5 min`, `429 Too Many Requests` on any further attempt.
- Successful login resets the counter.
- Additional protection: `express-rate-limit` on `/api/auth` — 20 req / 5 min per IP.

### Password Reset via Email

1. `POST /api/auth/recover {email}` → generates `crypto.randomBytes(32)` raw token, stores **SHA-256 hash** in DB with 1h TTL, sends the **raw** token by email.
2. Always returns `200` regardless of whether the email exists — anti-enumeration.
3. `POST /api/auth/reset-password {token, newPassword}` → hashes the token again, finds matching user with unexpired token, updates `passwordHash`, clears the token, resets lockout counters, **destroys all active sessions**.
4. Token is one-time only.

### Structured Logging (Winston)

- JSON in production, colorized in dev.
- Every request gets a `requestId` (UUID), returned in `X-Request-Id` header.
- Logged events: HTTP requests (method / url / status / duration), user logins / logouts, account lockouts, password resets, item CRUD operations.
- **Never logged:** passwords, API keys, reset tokens.

### Centralized Error Handling

- `AppError` class carries `statusCode`, `code`, and `isOperational`.
- Factories: `badRequest` (400), `unauthorized` (401), `forbidden` (403), `notFound` (404), `tooMany` (429).
- Global `errorHandler` middleware converts them into a uniform JSON response `{ error, code }`.
- 5xx messages are hidden from clients — only logged for developers.

### Status Map (server-side)

```js
const STATUS_MAP = {
  plan:      'В планах',
  watching:  'Смотрю',
  completed: 'Завершено'
};
```

### File Uploads

Uses Multer with:

- **Storage:** `diskStorage` in `server/uploads/`.
- **Filename:** `Date.now() + '-' + random + ext`.
- **Limit:** 5 MB.
- **Filter:** `image/*` only (rejected with a 400 JSON error).

### SPA (Client)

- All CRUD operations go through `fetch` — **no page reloads**.
- Rendering escapes HTML entities to prevent XSS.
- Error messages are displayed in `#error-box`.
- Filters are `<a>` links that trigger a re-fetch with `?status=...` — without reloading the page.
- Auth: modal login form, `apiKey` persisted in `localStorage`.

### CI (GitHub Actions)

Every push and PR to `main` / `master` runs `.github/workflows/ci.yml`:

1. Spin up a MongoDB 7.0 container.
2. Setup Node.js 20 with npm cache.
3. `npm ci` — install dependencies.
4. `npm run lint` — ESLint.
5. `npm run format:check` — Prettier.
6. `npm test` — Jest + Supertest.

If any step fails, the PR cannot be merged.

### Docker

Two services in `docker-compose.yml`:

- **`mongo`** — MongoDB 7.0, persistent volume `mongo_data`, healthcheck.
- **`app`** — Node.js 20 Alpine, built from the local `Dockerfile`, persistent volume `uploads_data` for user-uploaded posters.

The app waits for MongoDB to be ready (via `depends_on` + healthcheck) before starting.

---

## 🧪 Tests

```bash
cd server
npm test               # run all tests
npm run test:coverage  # with coverage report
```

Test suites:

- `tests/auth.test.js` — login, validation, wrong password, lockout after 5 attempts, recover anti-enumeration.
- `tests/items.test.js` — CRUD lifecycle, RBAC (401 / 403), 400 on missing fields, 404 on missing item.

---

## 🧹 Code Quality

```bash
cd server
npm run lint           # ESLint
npm run format         # Prettier — write
npm run format:check   # Prettier — check only
```

---

Laboratory work for the *"Modern Programming Platforms"* course.