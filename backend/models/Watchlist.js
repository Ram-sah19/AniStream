const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  animeId: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: '',
  },
  genres: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    default: 'Unknown',
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Watchlist', watchlistSchema);
