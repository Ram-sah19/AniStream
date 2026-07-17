import React from 'react';
import { Link } from 'react-router-dom';
import './EpisodeList.css';

const EpisodeList = ({ episodes = [], currentEpisodeId, animeTitle }) => {
  if (episodes.length === 0) {
    return (
      <div className="episode-list-empty">
        <span>📭</span>
        <p>No episodes available. Consumet API may not be running.</p>
      </div>
    );
  }

  return (
    <div className="episode-list-container" id="episode-list">
      <h3 className="episode-list-title">
        📺 Episodes
        <span className="episode-count">{episodes.length} episodes</span>
      </h3>
      <div className="episode-grid">
        {episodes.map((ep) => {
          const isActive = ep.id === currentEpisodeId;
          return (
            <Link
              key={ep.id}
              to={`/watch/${encodeURIComponent(ep.id)}`}
              className={`episode-btn ${isActive ? 'active' : ''}`}
              id={`episode-btn-${ep.number}`}
              title={`${animeTitle} - Episode ${ep.number}`}
            >
              <span className="ep-number">EP {ep.number}</span>
              {isActive && <span className="ep-playing">▶ Playing</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default EpisodeList;
