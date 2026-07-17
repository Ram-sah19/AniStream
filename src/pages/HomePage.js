import React, { useState, useEffect } from 'react';
import HeroSection from '../components/HeroSection';
import AnimeCard from '../components/AnimeCard';
import AdSlot from '../components/AdSlot';
import { fetchTrending } from '../api';
import './HomePage.css';

const HomePage = () => {
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        setLoading(true);
        const data = await fetchTrending();
        setTrendingAnime(data.results || []);
      } catch (err) {
        console.error('Failed to fetch trending:', err);
        setError('Failed to load trending anime. Make sure the backend is running on port 5000.');
      } finally {
        setLoading(false);
      }
    };

    loadTrending();
  }, []);

  // Pick the first anime as the hero feature
  const heroAnime = trendingAnime[0] || null;

  return (
    <div className="home-page" id="home-page">
      {/* Hero Banner */}
      {heroAnime && <HeroSection anime={heroAnime} />}

      {/* Ad Slot - Top Banner */}
      <div className="home-ad-top">
        <AdSlot position="header" size="728x90" label="Advertisement Banner Slot — Top" />
      </div>

      {/* Trending Section */}
      <section className="anime-section" id="trending-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-icon">🔥</span>
            Trending Now
          </h2>
          <p className="section-subtitle">Currently airing and most popular anime</p>
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
          <div className="anime-grid" id="trending-grid">
            {trendingAnime.map((anime, index) => (
              <div
                key={anime.mal_id ? `trending-${anime.mal_id}-${index}` : `trending-${anime.id || index}`}
                className="anime-grid-item"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <AnimeCard anime={anime} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ad Slot - Bottom Banner */}
      <div className="home-ad-bottom">
        <AdSlot position="banner" size="728x90" label="Advertisement Banner Slot — Bottom" />
      </div>
    </div>
  );
};

export default HomePage;
