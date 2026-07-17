import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import './VideoPlayer.css';

const VideoPlayer = ({ videoUrl, isLoading, error, episodeTitle, isM3U8, sources = [], headers = {} }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [currentQuality, setCurrentQuality] = useState('');
  const [playerError, setPlayerError] = useState(null);

  useEffect(() => {
    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!videoUrl || isLoading || error) return;
    if (isM3U8 === false) return;

    const video = videoRef.current;
    if (!video) return;

    // Build the proxied URL through our backend to bypass CORS/Referer blocks
    const referer = headers?.Referer || 'https://gogoplay4.com/';
    const proxyUrl = `http://localhost:5000/api/anime/proxy?url=${encodeURIComponent(videoUrl)}&referer=${encodeURIComponent(referer)}`;

    if (isM3U8 !== false && Hls.isSupported()) {
      // ═══════════════════════════════════════
      // HLS.js playback for M3U8 streams (GogoCDN / VidStreaming)
      // ═══════════════════════════════════════
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: -1, // Auto quality selection
        capLevelToPlayerSize: true,
        debug: false,
      });

      hls.loadSource(proxyUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // Autoplay might be blocked — user will click play
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = hls.levels[data.level];
        if (level) {
          setCurrentQuality(`${level.height}p`);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error:', data);
              setPlayerError('Stream playback failed. Try refreshing the page.');
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari natively supports HLS
      video.src = proxyUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    } else if (!isM3U8) {
      // Direct MP4 / non-HLS source
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

  // Quality switcher
  const handleQualityChange = (source) => {
    if (!videoRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const referer = headers?.Referer || 'https://gogoplay4.com/';
    const proxyUrl = `http://localhost:5000/api/anime/proxy?url=${encodeURIComponent(source.url)}&referer=${encodeURIComponent(referer)}`;

    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

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
      {/* Title Bar */}
      <div className="player-header">
        <div className="player-dots">
          <div className="player-dot red"></div>
          <div className="player-dot yellow"></div>
          <div className="player-dot green"></div>
        </div>
        <span className="player-title">{episodeTitle || 'Now Playing'}</span>
        {currentQuality && (
          <span className="player-quality-badge">{currentQuality}</span>
        )}
      </div>

      {/* Player Area */}
      <div className="player-wrapper">
        {isLoading ? (
          <div className="player-skeleton">
            <div className="skeleton-pulse"></div>
            <div className="skeleton-play-icon">⏳</div>
            <p className="skeleton-text">Fetching stream from VidStreaming...</p>
          </div>
        ) : (error || playerError) ? (
          <div className="player-error">
            <span className="error-icon">⚠️</span>
            <h3>Stream Unavailable</h3>
            <p>{error || playerError}</p>
            <p className="error-hint">
              Make sure @consumet/extensions is installed and updated.
            </p>
          </div>
        ) : videoUrl ? (
          isM3U8 ? (
            <video
              ref={videoRef}
              className="video-element"
              controls
              playsInline
              poster=""
              id="video-element"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <iframe
              src={videoUrl}
              className="video-element player-iframe"
              frameBorder="0"
              allowFullScreen
              title={episodeTitle || "Video Player"}
              id="video-element"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )
        ) : (
          <div className="player-placeholder">
            <span className="placeholder-icon">🎬</span>
            <h3>Select an Episode</h3>
            <p>Choose an episode from the list below to start watching</p>
          </div>
        )}
      </div>

      {/* Quality Selector */}
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
