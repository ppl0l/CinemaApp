# CineTrack 🎬

A web application for managing a personal watchlist of movies and series, built as a **Single Page Application (SPA)** on the client and a **REST API** on the server with full CRUD operations.

Course: Modern Programming Platforms

---

## 📋 About The Project

CineTrack lets users track movies and series they plan to watch, are currently watching, or have completed. Each entry has a title, type (movie/series), status, due date, and a poster image. The client is a SPA (no page reloads), and the server exposes a proper REST API with correct HTTP methods and status codes.

### Key Features

- **Full CRUD** — create, read, update, delete watchlist entries without page reload.
- **Filter** — by status (`All` / `В планах` / `Смотрю` / `Завершено`).
- **Poster upload** — via `multer`, `multipart/form-data`, images only, limit 5 MB.
- **Poster cleanup** — old poster files are removed from disk on update/delete.
- **Server-side validation** — required fields, enum checks for status and type.
- **Informative errors** — the client shows server error messages in a dedicated error box.
- **Dockerized** — the whole stack (app + MongoDB) runs in containers via `docker-compose`.
- **REST API** with proper HTTP methods and status codes (`200`, `201`, `400`, `404`, `500`).

---

## 🛠 Technologies

**Backend:**
- **Node.js + Express** — HTTP server and REST API.
- **MongoDB + Mongoose** — database and schema validation.
- **Multer** — `multipart/form-data` file uploads.
- **CORS** — cross-origin requests support.

**Frontend:**
- **Vanilla JavaScript** — SPA logic, `fetch` API, DOM manipulation.
- **HTML5 + CSS3** — layout with CSS variables, responsive grid.

**Infrastructure:**
- **Docker + docker-compose** — containerized app and database.

---

## 📂 Project Structure

```
CineApp/
├── server/
│   ├── models/
│   │   └── WatchlistItem.js        # Mongoose schema
│   ├── public/                     # SPA (client)
│   │   ├── app.js                  # SPA logic (CRUD, filters, rendering)
│   │   ├── index.html              # Single page
│   │   └── style.css               # Styles
│   ├── uploads/                    # Uploaded posters (volume in Docker)
│   ├── package.json
│   └── server.js                   # Express server + REST API
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
2. Install dependencies and start the server:

```bash
cd server
npm install
npm start
```

Open **http://localhost:3000**.

---

## 🔌 REST API

| Method | Route              | Purpose                                          | Success | Errors          |
|--------|--------------------|--------------------------------------------------|---------|-----------------|
| GET    | `/api/items`       | List watchlist items. Query: `?status=plan\|watching\|completed` | 200     | 500             |
| POST   | `/api/items`       | Create new entry (`multipart/form-data`)         | 201     | 400             |
| PUT    | `/api/items/:id`   | Update entry (`multipart/form-data`)             | 200     | 400, 404        |
| DELETE | `/api/items/:id`   | Delete entry + remove poster file from disk      | 200     | 404, 500        |

### Example request

```bash
curl -X POST http://localhost:3000/api/items \
  -F "title=Inception" \
  -F "type=Фильм" \
  -F "statusId=plan" \
  -F "dueDate=2026-01-01" \
  -F "poster=@poster.jpg"
```

---

## ✨ Implementation Details

### Data Model

Each watchlist item stored in MongoDB:

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

### Mongoose Schema

```js
const watchlistSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  type:     { type: String, required: true, enum: ['Фильм', 'Сериал'] },
  status: {
    id:    { type: String, required: true, enum: ['plan', 'watching', 'completed'] },
    label: { type: String, required: true }
  },
  dueDate:  { type: String, required: true },
  poster:   { type: String, default: null }
}, { timestamps: true });
```

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

### Server-side Validation

On `POST` and `PUT`:
- Missing `title`, `type`, `statusId`, or `dueDate` → `400 { error: 'Заполните все обязательные поля.' }`
- Unknown `statusId` → `400 { error: 'Некорректный статус.' }`
- Not found by id → `404 { error: 'Элемент не найден.' }`
- File too large or wrong type → `400` with JSON error via global multer handler.

### SPA (Client)

- All CRUD operations go through `fetch` — **no page reloads**.
- Rendering is done with `document.createElement` / `textContent` to prevent XSS.
- Error messages are displayed in `#error-box`.
- Filters are `<a>` links that trigger a re-fetch with `?status=...` — without reloading the page.

### Docker

Two services in `docker-compose.yml`:

- **`mongo`** — MongoDB 7.0, persistent volume `mongo_data`, healthcheck.
- **`app`** — Node.js 20 Alpine, built from the local `Dockerfile`, persistent volume `uploads_data` for user-uploaded posters.

The app waits for MongoDB to be ready (via `depends_on` + healthcheck) before starting.

---

Laboratory work for the *"Modern Programming Platforms"* course.
