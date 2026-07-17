import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import EpisodeList from '../components/EpisodeList';
import AdSlot from '../components/AdSlot';
import { fetchWatchUrl, fetchAnimeInfo } from '../api';
import './WatchPage.css';

const WatchPage = () => {
  const { episodeId } = useParams();
  const [videoUrl, setVideoUrl] = useState('');
  const [isM3U8, setIsM3U8] = useState(true);
  const [sources, setSources] = useState([]);
  const [streamHeaders, setStreamHeaders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animeInfo, setAnimeInfo] = useState(null);
  const [episodeTitle, setEpisodeTitle] = useState('');

  // Parse current provider and core episode ID
  let currentProvider = 'hianime';
  let coreId = episodeId;
  if (episodeId.includes(':')) {
    const parts = episodeId.split(':');
    currentProvider = parts[0];
    coreId = parts.slice(1).join(':');
  }

  // Parse anime ID from episode ID (supports both HiAnime "$episode$" and legacy "-episode-")
  const getAnimeIdFromEpisode = (epId) => {
    if (epId.includes('$episode$')) {
      return epId.split('$episode$')[0];
    }
    const parts = epId.split('-episode-');
    return parts.length > 1 ? parts[0] : epId;
  };

  useEffect(() => {
    const loadStream = async () => {
      try {
        setLoading(true);
        setError(null);

        // Format episode title from ID
        const formattedTitle = episodeId
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setEpisodeTitle(formattedTitle);

        // Fetch video URL from backend (VidStreaming/GogoCDN HLS)
        const data = await fetchWatchUrl(episodeId);
        if (data.success && data.videoUrl) {
          setVideoUrl(data.videoUrl);
          setIsM3U8(data.isM3U8 !== undefined ? data.isM3U8 : true);
          setSources(data.sources || []);
          setStreamHeaders(data.headers || {});
        } else {
          setError('No streaming source found for this episode.');
        }
      } catch (err) {
        console.error('Failed to fetch watch URL:', err);
        setError(
          err.response?.data?.message ||
          'Failed to load stream. Ensure the backend and Consumet API are running.'
        );
      } finally {
        setLoading(false);
      }
    };

    // Fetch anime info for episode list
    const loadAnimeInfo = async () => {
      try {
        const animeId = getAnimeIdFromEpisode(episodeId);
        const data = await fetchAnimeInfo(animeId);
        setAnimeInfo(data.anime);
      } catch (err) {
        console.log('Could not load anime info for episode list');
      }
    };

    loadStream();
    loadAnimeInfo();
  }, [episodeId]);

  return (
    <div className="watch-page" id="watch-page">
      <div className="watch-container">
        {/* Main Content Area */}
        <div className="watch-main">
          {/* Breadcrumb */}
          <div className="watch-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            {animeInfo && (
              <>
                <Link to={`/anime/${animeInfo.id}`}>{animeInfo.title}</Link>
                <span>/</span>
              </>
            )}
            <span className="breadcrumb-current">{episodeTitle}</span>
          </div>

          {/* Video Player */}
          <VideoPlayer
            videoUrl={videoUrl}
            isLoading={loading}
            error={error}
            episodeTitle={episodeTitle}
            isM3U8={isM3U8}
            sources={sources}
            headers={streamHeaders}
          />

          {/* Server Switcher */}
          <div className="server-selector-container">
            <span className="server-label">🔮 Switch Server (If player is loading or broken):</span>
            <div className="server-buttons">
              <Link
                to={`/watch/animepahe:${coreId}`}
                className={`server-btn ${currentProvider === 'animepahe' ? 'active' : ''}`}
              >
                🚀 Server Alpha (High Quality HLS)
              </Link>
              <Link
                to={`/watch/hianime:${coreId}`}
                className={`server-btn ${currentProvider === 'hianime' ? 'active' : ''}`}
              >
                ⚡ Server Beta (HiAnime Scraper)
              </Link>
              <Link
                to={`/watch/dailymotion:${coreId}`}
                className={`server-btn ${currentProvider === 'dailymotion' ? 'active' : ''}`}
              >
                📺 Server Gamma (Dailymotion Fallback)
              </Link>
              <Link
                to={`/watch/anime4i:${coreId}`}
                className={`server-btn ${currentProvider === 'anime4i' ? 'active' : ''}`}
              >
                🌸 Server Delta (Anime4i Custom Scraper)
              </Link>
            </div>
          </div>

          {/* Ad Slot — Below Player (Banner) */}
          <AdSlot
            position="banner"
            size="728x90"
            label="Advertisement Banner Slot — Below Player"
          />

          {/* Episode Info */}
          {animeInfo && (
            <div className="watch-info">
              <h2 className="watch-anime-title">{animeInfo.title}</h2>
              <p className="watch-episode-name">{episodeTitle}</p>
            </div>
          )}

          {/* Episode List */}
          {animeInfo && (
            <EpisodeList
              episodes={animeInfo.episodes || []}
              currentEpisodeId={episodeId}
              animeTitle={animeInfo.title}
            />
          )}
        </div>

        {/* Sidebar */}
        <aside className="watch-sidebar">
          {/* Ad Slot — Sidebar (300x250) */}
          <AdSlot
            position="sidebar"
            size="300x250"
            label="Advertisement Banner Slot — Sidebar"
          />

          {/* Ad Slot — Sidebar 2 */}
          <AdSlot
            position="sidebar"
            size="300x250"
            label="Advertisement Banner Slot — Sidebar 2"
          />

          {/* Quick Info Card */}
          {animeInfo && (
            <div className="sidebar-info-card">
              <img
                src={animeInfo.image}
                alt={animeInfo.title}
                className="sidebar-poster"
              />
              <div className="sidebar-meta">
                <h4>{animeInfo.title}</h4>
                <p>{animeInfo.status} • {animeInfo.totalEpisodes || '?'} EP</p>
                {animeInfo.genres?.length > 0 && (
                  <div className="sidebar-genres">
                    {animeInfo.genres.slice(0, 3).map((g, i) => (
                      <span key={i}>{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Bottom Ad Slot */}
      <div className="watch-bottom-ad">
        <AdSlot
          position="footer"
          size="728x90"
          label="Advertisement Banner Slot — Footer"
        />
      </div>
    </div>
  );
};

export default WatchPage;
