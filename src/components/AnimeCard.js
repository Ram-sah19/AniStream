import React from 'react';
import { Link } from 'react-router-dom';
import './AnimeCard.css';

const AnimeCard = ({ anime }) => {
  const {
    mal_id,
    id,
    title,
    title_english,
    image,
    score,
    episodes,
    type,
    genres = [],
  } = anime;

  // Use mal_id for Jikan-sourced anime, id for Consumet-sourced
  const linkId = id || mal_id;
  const displayTitle = title_english || title;

  return (
    <Link to={`/anime/${linkId}`} className="anime-card" id={`anime-card-${linkId}`}>
      <div className="card-image-wrapper">
        <img
          src={image}
          alt={displayTitle}
          className="card-image"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/225x320/1a1a2e/c084fc?text=No+Image';
          }}
        />
        <div className="card-overlay">
          <span className="card-play-btn">▶</span>
        </div>
        {score && (
          <div className="card-score">
            <span>⭐</span> {score}
          </div>
        )}
        {type && <div className="card-type">{type}</div>}
      </div>
      <div className="card-info">
        <h3 className="card-title">{displayTitle}</h3>
        <div className="card-meta">
          {episodes && <span className="card-episodes">{episodes} EP</span>}
          {genres.slice(0, 2).map((genre, i) => (
            <span key={i} className="card-genre">{genre}</span>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default AnimeCard;
