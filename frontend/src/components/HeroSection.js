import React from 'react';
import { Link } from 'react-router-dom';
import './HeroSection.css';

const HeroSection = ({ anime }) => {
  if (!anime) return null;

  const {
    mal_id,
    id,
    title,
    title_english,
    image,
    synopsis,
    genres = [],
    score,
  } = anime;

  const linkId = id || mal_id;
  const displayTitle = title_english || title;

  return (
    <section className="hero-section" id="hero-section">
      {/* Background Image */}
      <div
        className="hero-bg"
        style={{ backgroundImage: `url(${image})` }}
      ></div>
      <div className="hero-gradient"></div>

      {/* Floating Particles */}
      <div className="hero-particles">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`particle particle-${i + 1}`}></div>
        ))}
      </div>

      {/* Content */}
      <div className="hero-content">
        <div className="hero-badges">
          <span className="hero-badge trending-badge">🔥 Trending</span>
          {score && <span className="hero-badge score-badge">⭐ {score}</span>}
          {genres[0] && <span className="hero-badge genre-badge">{genres[0]}</span>}
        </div>

        <h1 className="hero-title">{displayTitle}</h1>

        <p className="hero-synopsis">
          {synopsis
            ? synopsis.length > 200
              ? synopsis.substring(0, 200) + '...'
              : synopsis
            : 'Start watching this amazing anime series now!'}
        </p>

        <div className="hero-actions">
          <Link to={`/anime/${linkId}`} className="hero-btn hero-btn-primary" id="hero-watch-btn">
            <span>▶</span> Watch Now
          </Link>
          <Link to={`/anime/${linkId}`} className="hero-btn hero-btn-secondary" id="hero-info-btn">
            ℹ️ More Info
          </Link>
        </div>
      </div>

      {/* Hero Poster Card */}
      <div className="hero-poster">
        <img src={image} alt={displayTitle} className="hero-poster-img" />
        <div className="hero-poster-glow"></div>
      </div>
    </section>
  );
};

export default HeroSection;
