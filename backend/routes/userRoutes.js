const express = require('express');
const router = express.Router();
const {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getFavorites,
  addToFavorites,
  removeFromFavorites,
} = require('../controllers/userController');

// Watchlist routes
router.get('/watchlist', getWatchlist);
router.post('/watchlist', addToWatchlist);
router.delete('/watchlist/:animeId', removeFromWatchlist);

// Favorites routes
router.get('/favorites', getFavorites);
router.post('/favorites', addToFavorites);
router.delete('/favorites/:animeId', removeFromFavorites);

module.exports = router;
