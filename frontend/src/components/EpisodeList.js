import React from 'react';
import { Link } from 'react-router-dom';
import './EpisodeList.css';

const EpisodeList = ({ episodes = [], currentEpisodeId, animeTitle }) => {
  if (episodes.length === 0) {
    return (
      <div className="episode-list-empty">
        <span className="empty-icon-svg">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </svg>
        </span>
        <p>No episodes available yet for this title.</p>
      </div>
    );
  }

  return (
    <div className="episode-list-container" id="episode-list">
      <h3 className="episode-list-title">
        <span className="title-icon-svg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
        </span> Episodes
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
              {isActive && <span className="ep-playing">Playing</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default EpisodeList;
