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
          My Collection
        </h1>

        {/* Tabs */}
        <div className="watchlist-tabs">
          <button
            className={`tab-btn ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('watchlist')}
            id="tab-watchlist"
          >
            Watchlist ({watchlist.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
            id="tab-favorites"
          >
            Favorites ({favorites.length})
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
            <span className="empty-icon-svg red">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && currentList.length === 0 && (
          <div className="watchlist-empty">
            <span className="empty-icon-svg">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <h2>
              {activeTab === 'watchlist'
                ? 'Your watchlist is empty'
                : 'No favorites yet'}
            </h2>
            <p>Browse donghua and add them to your {activeTab}!</p>
            <Link to="/" className="browse-btn">Browse Donghua</Link>
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
                      e.target.src = 'https://via.placeholder.com/180x256/110a0a/e8a830?text=No+Image';
                    }}
                  />
                  <div className="collection-overlay">
                    <span className="collection-play">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </span>
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
                    Remove
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
