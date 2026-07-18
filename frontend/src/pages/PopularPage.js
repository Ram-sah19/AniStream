import React, { useState, useEffect } from 'react';
import AnimeCard from '../components/AnimeCard';
import AdSlot from '../components/AdSlot';
import { fetchPopular } from '../api';
import './HomePage.css'; /* Reuse home page grid styles */

const PopularPage = () => {
  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPopular = async () => {
      try {
        setLoading(true);
        const data = await fetchPopular();
        setAnime(data.results || []);
      } catch (err) {
        console.error('Failed to fetch popular:', err);
        setError('Failed to load popular donghua. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    loadPopular();
  }, []);

  return (
    <div className="home-page" id="popular-page">
      <section className="anime-section" style={{ paddingTop: '6rem' }}>
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2c0 0-3 3.5-3 5.5s1.5 3.5 3.5 3.5 3.5-1.5 3.5-3.5S12 2 12 2z" />
                <path d="M12 10c0 0-4 4.5-4 7.5s2 4.5 5 4.5 5-2 5-4.5S12 10 12 10z" fill="currentColor" />
              </svg>
            </span>
            Most Popular Donghua
          </h2>
          <p className="section-subtitle">All-time most popular Chinese anime ranked by fans</p>
        </div>

        {loading ? (
          <div className="anime-grid">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-image"></div>
                <div className="skeleton-info">
                  <div className="skeleton-line long"></div>
                  <div className="skeleton-line short"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="error-message">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        ) : (
          <div className="anime-grid" id="popular-grid">
            {anime.map((item, index) => (
              <div
                key={item.id ? `popular-${item.id}-${index}` : `popular-${index}`}
                className="anime-grid-item"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <AnimeCard anime={item} />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="home-ad-bottom">
        <AdSlot position="banner" size="728x90" label="Advertisement Banner Slot — Popular Page" />
      </div>
    </div>
  );
};

export default PopularPage;
