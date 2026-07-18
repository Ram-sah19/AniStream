import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import EpisodeList from '../components/EpisodeList';
import AdSlot from '../components/AdSlot';
import { fetchAnimeInfo, addToWatchlist, addToFavorites } from '../api';
import './AnimeDetailPage.css';

const AnimeDetailPage = () => {
  const { animeId } = useParams();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    const loadAnimeInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAnimeInfo(animeId);
        setAnime(data.anime);
      } catch (err) {
        console.error('Failed to load anime info:', err);
        setError('Failed to load anime details. Backend may be offline.');
      } finally {
        setLoading(false);
      }
    };

    loadAnimeInfo();
  }, [animeId]);

  const handleAddToWatchlist = async () => {
    try {
      await addToWatchlist({
        animeId: anime.id || animeId,
        title: anime.title,
        image: anime.image,
        genres: anime.genres,
        status: anime.status,
      });
      setActionMsg('Added to Watchlist!');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      if (err.response?.status === 409) {
        setActionMsg('Already in Watchlist');
      } else {
        setActionMsg('Failed. Is MongoDB running?');
      }
      setTimeout(() => setActionMsg(''), 3000);
    }
  };

  const handleAddToFavorites = async () => {
    try {
      await addToFavorites({
        animeId: anime.id || animeId,
        title: anime.title,
        image: anime.image,
        genres: anime.genres,
      });
      setActionMsg('Added to Favorites!');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      if (err.response?.status === 409) {
        setActionMsg('Already in Favorites');
      } else {
        setActionMsg('Failed. Is MongoDB running?');
      }
      setTimeout(() => setActionMsg(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-skeleton">
          <div className="detail-skeleton-poster"></div>
          <div className="detail-skeleton-info">
            <div className="skeleton-line" style={{ width: '60%', height: '28px' }}></div>
            <div className="skeleton-line" style={{ width: '40%', height: '16px' }}></div>
            <div className="skeleton-line" style={{ width: '90%', height: '14px' }}></div>
            <div className="skeleton-line" style={{ width: '85%', height: '14px' }}></div>
            <div className="skeleton-line" style={{ width: '70%', height: '14px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-page">
        <div className="detail-error">
          <span className="empty-icon-svg red">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <h2>Error Loading Anime</h2>
          <p>{error}</p>
          <Link to="/" className="back-home-btn">← Back to Home</Link>
        </div>
      </div>
    );
  }

  if (!anime) return null;

  return (
    <div className="detail-page" id="anime-detail-page">
      {/* Background Blur */}
      <div
        className="detail-bg"
        style={{ backgroundImage: `url(${anime.image})` }}
      ></div>

      {/* Main Content */}
      <div className="detail-container">
        {/* Top Section: Poster + Info */}
        <div className="detail-top">
          <div className="detail-poster">
            <img src={anime.image} alt={anime.title} />
          </div>

          <div className="detail-info">
            <h1 className="detail-title">{anime.title_english || anime.title}</h1>
            {anime.title_english && anime.title !== anime.title_english && (
              <p className="detail-alt-title">{anime.title}</p>
            )}

            {/* Metadata Badges */}
            <div className="detail-badges">
              {anime.status && (
                <span className={`detail-badge ${anime.status === 'Ongoing' || anime.status === 'Currently Airing' ? 'badge-airing' : 'badge-completed'}`}>
                  {anime.status}
                </span>
              )}
              {anime.type && <span className="detail-badge badge-type">{anime.type}</span>}
              {anime.totalEpisodes && (
                <span className="detail-badge badge-episodes">{anime.totalEpisodes} Episodes</span>
              )}
              {anime.score && (
                <span className="detail-badge badge-score">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  {anime.score}
                </span>
              )}
              {anime.year && <span className="detail-badge badge-year">{anime.year}</span>}
              {anime.subOrDub && (
                <span className="detail-badge badge-sub">{anime.subOrDub.toUpperCase()}</span>
              )}
            </div>

            {/* Genres */}
            {anime.genres?.length > 0 && (
              <div className="detail-genres">
                {anime.genres.map((genre, i) => (
                  <span key={i} className="genre-tag">{genre}</span>
                ))}
              </div>
            )}

            {/* Synopsis */}
            <p className="detail-synopsis">
              {anime.description || 'No synopsis available for this anime.'}
            </p>

            {/* Action Buttons */}
            <div className="detail-actions">
              {anime.episodes?.length > 0 && (
                <Link
                  to={`/watch/${anime.id || animeId}/${encodeURIComponent(anime.episodes[0].id)}`}
                  className="action-btn btn-watch"
                  id="watch-first-episode-btn"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Watch Episode 1
                </Link>
              )}
              <button
                onClick={handleAddToWatchlist}
                className="action-btn btn-watchlist"
                id="add-watchlist-btn"
              >
                Add to Watchlist
              </button>
              <button
                onClick={handleAddToFavorites}
                className="action-btn btn-favorite"
                id="add-favorite-btn"
              >
                Favorite
              </button>
            </div>

            {/* Action Message */}
            {actionMsg && <p className="action-message">{actionMsg}</p>}
          </div>
        </div>

        {/* Ad Slot */}
        <AdSlot position="banner" size="728x90" label="Advertisement Banner Slot — Detail Page" />

        {/* Episode List */}
        <EpisodeList
          episodes={anime.episodes || []}
          animeTitle={anime.title}
          animeId={anime.id || animeId}
        />
      </div>
    </div>
  );
};

export default AnimeDetailPage;
