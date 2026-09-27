const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const WatchlistItem = require('./models/WatchlistItem');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cinetrack';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Только изображения разрешены'));
  }
});

const STATUS_MAP = {
  plan: 'В планах',
  watching: 'Смотрю',
  completed: 'Завершено'
};

app.get('/api/items', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== 'all' ? { 'status.id': status } : {};
    const items = await WatchlistItem.find(filter).sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера при получении данных' });
  }
});

app.post('/api/items', upload.single('poster'), async (req, res) => {
  try {
    const { title, type, statusId, dueDate } = req.body;

    if (!title || !type || !statusId || !dueDate) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Заполните все обязательные поля.' });
    }

    if (!STATUS_MAP[statusId]) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Некорректный статус.' });
    }

    const newItem = await WatchlistItem.create({
      title: title.trim(),
      type,
      status: { id: statusId, label: STATUS_MAP[statusId] },
      dueDate,
      poster: req.file ? `/uploads/${req.file.filename}` : null
    });

    res.status(201).json(newItem);
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(400).json({ error: 'Ошибка при создании записи.' });
  }
});

app.put('/api/items/:id', upload.single('poster'), async (req, res) => {
  try {
    const { title, type, statusId, dueDate } = req.body;
    const item = await WatchlistItem.findById(req.params.id);

    if (!item) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Элемент не найден.' });
    }

    if (title) item.title = title.trim();
    if (type) item.type = type;
    if (dueDate) item.dueDate = dueDate;
    
    if (statusId) {
      if (!STATUS_MAP[statusId]) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Некорректный статус.' });
      }
      item.status = { id: statusId, label: STATUS_MAP[statusId] };
    }

    if (req.file) {
      if (item.poster) {
        const oldPosterPath = path.join(__dirname, item.poster);
        if (fs.existsSync(oldPosterPath)) fs.unlinkSync(oldPosterPath);
      }
      item.poster = `/uploads/${req.file.filename}`;
    }

    await item.save();
    res.status(200).json(item);
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(400).json({ error: 'Ошибка при обновлении записи.' });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    const item = await WatchlistItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Элемент не найден.' });

    if (item.poster) {
      const posterPath = path.join(__dirname, item.poster);
      if (fs.existsSync(posterPath)) fs.unlinkSync(posterPath);
    }

    await item.deleteOne();
    res.status(200).json({ message: 'Успешно удалено' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при удалении элемента.' });
  }
});

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
  