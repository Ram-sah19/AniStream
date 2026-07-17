const Watchlist = require('../models/Watchlist');
const Favorite = require('../models/Favorite');

// ═══════════════════════════════════════
// WATCHLIST CONTROLLERS
// ═══════════════════════════════════════

/**
 * @desc    Get all watchlist items
 * @route   GET /api/user/watchlist
 */
const getWatchlist = async (req, res) => {
  try {
    const items = await Watchlist.find().sort({ addedAt: -1 });
    res.json({ success: true, results: items });
  } catch (error) {
    console.error('Get watchlist error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch watchlist' });
  }
};

/**
 * @desc    Add anime to watchlist
 * @route   POST /api/user/watchlist
 */
const addToWatchlist = async (req, res) => {
  try {
    const { animeId, title, image, genres, status } = req.body;

    if (!animeId || !title) {
      return res.status(400).json({ success: false, message: 'animeId and title are required' });
    }

    // Check if already exists
    const existing = await Watchlist.findOne({ animeId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Anime already in watchlist' });
    }

    const item = await Watchlist.create({ animeId, title, image, genres, status });
    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error('Add to watchlist error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to add to watchlist' });
  }
};

/**
 * @desc    Remove anime from watchlist
 * @route   DELETE /api/user/watchlist/:animeId
 */
const removeFromWatchlist = async (req, res) => {
  try {
    const { animeId } = req.params;
    const deleted = await Watchlist.findOneAndDelete({ animeId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Item not found in watchlist' });
    }

    res.json({ success: true, message: 'Removed from watchlist' });
  } catch (error) {
    console.error('Remove from watchlist error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to remove from watchlist' });
  }
};

// ═══════════════════════════════════════
// FAVORITES CONTROLLERS
// ═══════════════════════════════════════

/**
 * @desc    Get all favorites
 * @route   GET /api/user/favorites
 */
const getFavorites = async (req, res) => {
  try {
    const items = await Favorite.find().sort({ addedAt: -1 });
    res.json({ success: true, results: items });
  } catch (error) {
    console.error('Get favorites error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch favorites' });
  }
};

/**
 * @desc    Add anime to favorites
 * @route   POST /api/user/favorites
 */
const addToFavorites = async (req, res) => {
  try {
    const { animeId, title, image, genres } = req.body;

    if (!animeId || !title) {
      return res.status(400).json({ success: false, message: 'animeId and title are required' });
    }

    const existing = await Favorite.findOne({ animeId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Anime already in favorites' });
    }

    const item = await Favorite.create({ animeId, title, image, genres });
    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error('Add to favorites error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to add to favorites' });
  }
};

/**
 * @desc    Remove anime from favorites
 * @route   DELETE /api/user/favorites/:animeId
 */
const removeFromFavorites = async (req, res) => {
  try {
    const { animeId } = req.params;
    const deleted = await Favorite.findOneAndDelete({ animeId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Item not found in favorites' });
    }

    res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove from favorites error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to remove from favorites' });
  }
};

module.exports = {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getFavorites,
  addToFavorites,
  removeFromFavorites,
};
