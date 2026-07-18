import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
        setError('Failed to load trending donghua. Make sure the backend is running on port 5000.');
      } finally {
        setLoading(false);
      }
    };
    loadTrending();
  }, []);

  const heroAnime = trendingAnime[0] || null;

  return (
    <div className="home-page" id="home-page">
      {heroAnime && <HeroSection anime={heroAnime} />}

      <div className="home-ad-top">
        <AdSlot position="header" size="728x90" label="Advertisement Banner Slot — Top" />
      </div>

      <section className="anime-section" id="trending-section">
        <div className="section-header">
          <div className="section-title-group">
            <h2 className="section-title">
              <span className="section-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z" />
                </svg>
              </span>
              Trending Donghua
            </h2>
            <p className="section-subtitle">Top trending Chinese anime series right now</p>
          </div>
          <Link to="/popular" className="section-view-all">View All →</Link>
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
                key={anime.id ? `trending-${anime.id}-${index}` : `trending-${index}`}
                className="anime-grid-item"
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <AnimeCard anime={anime} />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="home-ad-bottom">
        <AdSlot position="banner" size="728x90" label="Advertisement Banner Slot — Bottom" />
      </div>
    </div>
  );
};

export default HomePage;
