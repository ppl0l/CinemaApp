const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['Фильм', 'Сериал'] },
  status: {
    id: { type: String, required: true, enum: ['plan', 'watching', 'completed'] },
    label: { type: String, required: true }
  },
  dueDate: { type: String, required: true },
  poster: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('WatchlistItem', watchlistSchema);
