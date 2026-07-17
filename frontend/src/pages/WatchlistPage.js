import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWatchlist, removeFromWatchlist, getFavorites, removeFromFavorites } from '../api';
import './WatchlistPage.css';

const WatchlistPage = () => {
  const [activeTab, setActiveTab] = useState('watchlist');
  const [watchlist, setWatchlist] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [wlData, favData] = await Promise.all([
        getWatchlist().catch(() => ({ results: [] })),
        getFavorites().catch(() => ({ results: [] })),
      ]);
      setWatchlist(wlData.results || []);
      setFavorites(favData.results || []);
    } catch (err) {
      setError('Failed to load data. Is the backend/MongoDB running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRemoveWatchlist = async (animeId) => {
    try {
      await removeFromWatchlist(animeId);
      setWatchlist((prev) => prev.filter((item) => item.animeId !== animeId));
    } catch (err) {
      console.error('Failed to remove:', err);
    }
  };

  const handleRemoveFavorite = async (animeId) => {
    try {
      await removeFromFavorites(animeId);
      setFavorites((prev) => prev.filter((item) => item.animeId !== animeId));
    } catch (err) {
      console.error('Failed to remove:', err);
    }
  };

  const currentList = activeTab === 'watchlist' ? watchlist : favorites;
  const handleRemove = activeTab === 'watchlist' ? handleRemoveWatchlist : handleRemoveFavorite;

  return (
    <div className="watchlist-page" id="watchlist-page">
      <div className="watchlist-container">
        <h1 className="watchlist-title">
          {activeTab === 'watchlist' ? '📋' : '⭐'} My Collection
        </h1>

        {/* Tabs */}
        <div className="watchlist-tabs">
          <button
            className={`tab-btn ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('watchlist')}
            id="tab-watchlist"
          >
            📋 Watchlist ({watchlist.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
            id="tab-favorites"
          >
            ⭐ Favorites ({favorites.length})
          </button>
        </div>

        {loading && (
          <div className="watchlist-loading">
            <div className="spinner"></div>
            <p>Loading your collection...</p>
          </div>
        )}

        {error && (
          <div className="watchlist-empty">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && currentList.length === 0 && (
          <div className="watchlist-empty">
            <span>{activeTab === 'watchlist' ? '📭' : '💫'}</span>
            <h2>
              {activeTab === 'watchlist'
                ? 'Your watchlist is empty'
                : 'No favorites yet'}
            </h2>
            <p>Browse anime and add them to your {activeTab}!</p>
            <Link to="/" className="browse-btn">Browse Anime</Link>
          </div>
        )}

        {!loading && currentList.length > 0 && (
          <div className="collection-grid" id="collection-grid">
            {currentList.map((item) => (
              <div key={item.animeId} className="collection-card">
                <Link to={`/anime/${item.animeId}`} className="collection-link">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="collection-image"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/180x256/1a1a2e/c084fc?text=No+Image';
                    }}
                  />
                  <div className="collection-overlay">
                    <span className="collection-play">▶</span>
                  </div>
                </Link>
                <div className="collection-info">
                  <Link to={`/anime/${item.animeId}`} className="collection-title-link">
                    <h3>{item.title}</h3>
                  </Link>
                  {item.genres?.length > 0 && (
                    <div className="collection-genres">
                      {item.genres.slice(0, 2).map((g, i) => (
                        <span key={i}>{g}</span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => handleRemove(item.animeId)}
                    className="remove-btn"
                    title="Remove from collection"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchlistPage;
