import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import './VideoPlayer.css';

const VideoPlayer = ({ videoUrl, isLoading, error, episodeTitle, isM3U8, sources = [], headers = {}, onEnded }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [currentQuality, setCurrentQuality] = useState('');
  const [playerError, setPlayerError] = useState(null);

  useEffect(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!videoUrl || isLoading || error) return;
    if (isM3U8 === false) return;

    const video = videoRef.current;
    if (!video) return;

    const referer = headers?.Referer || 'https://gogoplay4.com/';
    const proxyUrl = `http://localhost:5000/api/anime/proxy?url=${encodeURIComponent(videoUrl)}&referer=${encodeURIComponent(referer)}`;

    if (isM3U8 !== false && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: -1,
        capLevelToPlayerSize: true,
        debug: false,
      });

      hls.loadSource(proxyUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = hls.levels[data.level];
        if (level) setCurrentQuality(`${level.height}p`);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setPlayerError('Stream playback failed. Try refreshing the page.');
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = proxyUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    } else if (!isM3U8) {
      video.src = proxyUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl, isM3U8, headers, isLoading, error]);

  const handleQualityChange = (source) => {
    if (!videoRef.current) return;
    const currentTime = videoRef.current.currentTime;
    const referer = headers?.Referer || 'https://gogoplay4.com/';
    const proxyUrl = `http://localhost:5000/api/anime/proxy?url=${encodeURIComponent(source.url)}&referer=${encodeURIComponent(referer)}`;

    if (hlsRef.current) hlsRef.current.destroy();

    if (Hls.isSupported()) {
      const hls = new Hls({ startLevel: -1 });
      hls.loadSource(proxyUrl);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current.currentTime = currentTime;
        videoRef.current.play().catch(() => {});
      });
      hlsRef.current = hls;
    }

    setCurrentQuality(source.quality);
  };

  return (
    <div className="video-player-container" id="video-player-container">
      <div className="player-header">
        <div className="player-dots">
          <div className="player-dot red"></div>
          <div className="player-dot yellow"></div>
          <div className="player-dot green"></div>
        </div>
        <span className="player-title">{episodeTitle || 'Now Playing'}</span>
        {currentQuality && <span className="player-quality-badge">{currentQuality}</span>}
      </div>

      <div className="player-wrapper">
        {isLoading ? (
          <div className="player-skeleton">
            <div className="skeleton-pulse"></div>
            <div className="skeleton-play-icon">
              <svg className="spinner" width="40" height="40" viewBox="0 0 50 50">
                <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
              </svg>
            </div>
            <p className="skeleton-text">Resolving streaming sources...</p>
          </div>
        ) : (error || playerError) ? (
          <div className="player-error">
            <span className="error-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <h3>Stream Unavailable</h3>
            <p>{error || playerError}</p>
            <p className="error-hint">Please switch servers below if this player fails to load.</p>
          </div>
        ) : videoUrl ? (
          isM3U8 ? (
            <video
              ref={videoRef}
              className="video-element"
              controls
              playsInline
              id="video-element"
              onEnded={onEnded}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <iframe
              src={videoUrl}
              className="video-element player-iframe"
              frameBorder="0"
              allowFullScreen
              title={episodeTitle || 'Video Player'}
              id="video-element"
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          )
        ) : (
          <div className="player-placeholder">
            <span className="placeholder-icon">
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
              </svg>
            </span>
            <h3>Select an Episode</h3>
            <p>Choose an episode from the list below to start watching</p>
          </div>
        )}
      </div>

      {sources.length > 1 && videoUrl && (
        <div className="quality-selector">
          <span className="quality-label">Quality:</span>
          {sources.map((source, index) => (
            <button
              key={index}
              className={`quality-btn ${currentQuality === source.quality ? 'active' : ''}`}
              onClick={() => handleQualityChange(source)}
            >
              {source.quality || 'Auto'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
