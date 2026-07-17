import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 15000,
});

// ═══════════════════════════════════════
// ANIME ENDPOINTS
// ═══════════════════════════════════════

export const fetchTrending = async (page = 1) => {
  const { data } = await API.get('/anime/trending', { params: { page } });
  return data;
};

export const fetchPopular = async (page = 1) => {
  const { data } = await API.get('/anime/popular', { params: { page } });
  return data;
};

export const searchAnime = async (query) => {
  const { data } = await API.get('/anime/search', { params: { q: query } });
  return data;
};

export const fetchAnimeInfo = async (animeId) => {
  const { data } = await API.get(`/anime/info/${encodeURIComponent(animeId)}`);
  return data;
};

export const fetchWatchUrl = async (episodeId) => {
  const { data } = await API.get(`/anime/watch/${encodeURIComponent(episodeId)}`);
  return data;
};

// ═══════════════════════════════════════
// USER ENDPOINTS
// ═══════════════════════════════════════

export const getWatchlist = async () => {
  const { data } = await API.get('/user/watchlist');
  return data;
};

export const addToWatchlist = async (anime) => {
  const { data } = await API.post('/user/watchlist', anime);
  return data;
};

export const removeFromWatchlist = async (animeId) => {
  const { data } = await API.delete(`/user/watchlist/${encodeURIComponent(animeId)}`);
  return data;
};

export const getFavorites = async () => {
  const { data } = await API.get('/user/favorites');
  return data;
};

export const addToFavorites = async (anime) => {
  const { data } = await API.post('/user/favorites', anime);
  return data;
};

export const removeFromFavorites = async (animeId) => {
  const { data } = await API.delete(`/user/favorites/${encodeURIComponent(animeId)}`);
  return data;
};

export default API;
