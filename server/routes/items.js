const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const WatchlistItem = require('../models/WatchlistItem');
const logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');
const { badRequest, notFound } = require('../utils/errors');

const router = express.Router();

const STATUS_MAP = {
  plan: 'В планах',
  watching: 'Смотрю',
  completed: 'Завершено',
};

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const removeFile = (absPath) => {
  if (absPath && fs.existsSync(absPath)) fs.unlinkSync(absPath);
};

const removeUploaded = (file) => removeFile(file?.path);
const removePoster = (poster) =>
  removeFile(poster ? path.join(__dirname, '..', poster) : null);

const buildStatus = (statusId) => {
  if (!STATUS_MAP[statusId]) throw badRequest('Некорректный статус');
  return { id: statusId, label: STATUS_MAP[statusId] };
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) =>
      cb(
        null,
        Date.now() +
          '-' +
          Math.round(Math.random() * 1e9) +
          path.extname(file.originalname)
      ),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(badRequest('Только изображения разрешены'));
  },
});

router.get(
  '/',
  authenticate,
  authorize(['admin', 'editor', 'viewer']),
  async (req, res, next) => {
    try {
      const { status } = req.query;
      const filter = status && status !== 'all' ? { 'status.id': status } : {};
      const items = await WatchlistItem.find(filter).sort({ createdAt: -1 });
      res.status(200).json(items);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/',
  authenticate,
  authorize(['admin', 'editor']),
  upload.single('poster'),
  async (req, res, next) => {
    try {
      const { title, type, statusId, dueDate } = req.body;
      if (!title || !type || !statusId || !dueDate) {
        throw badRequest('Заполните все обязательные поля');
      }

      const item = await WatchlistItem.create({
        title: title.trim(),
        type,
        status: buildStatus(statusId),
        dueDate,
        poster: req.file ? `/uploads/${req.file.filename}` : null,
      });

      logger.info('Item created', { id: item._id, by: req.user.email });
      res.status(201).json(item);
    } catch (err) {
      removeUploaded(req.file);
      next(err);
    }
  }
);

router.put(
  '/:id',
  authenticate,
  authorize(['admin', 'editor']),
  upload.single('poster'),
  async (req, res, next) => {
    try {
      const item = await WatchlistItem.findById(req.params.id);
      if (!item) throw notFound('Элемент не найден');

      const { title, type, statusId, dueDate } = req.body;
      if (title) item.title = title.trim();
      if (type) item.type = type;
      if (dueDate) item.dueDate = dueDate;
      if (statusId) item.status = buildStatus(statusId);

      if (req.file) {
        removePoster(item.poster);
        item.poster = `/uploads/${req.file.filename}`;
      }

      await item.save();
      logger.info('Item updated', { id: item._id, by: req.user.email });
      res.status(200).json(item);
    } catch (err) {
      removeUploaded(req.file);
      next(err);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  authorize(['admin']),
  async (req, res, next) => {
    try {
      const item = await WatchlistItem.findById(req.params.id);
      if (!item) throw notFound('Элемент не найден');

      removePoster(item.poster);
      await item.deleteOne();

      logger.info('Item deleted', { id: item._id, by: req.user.email });
      res.status(200).json({ message: 'Успешно удалено' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
