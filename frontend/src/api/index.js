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

export const fetchCatalog = async (params = {}) => {
  const { data } = await API.get('/anime/catalog', { params });
  return data;
};

export const fetchAnimeInfo = async (animeId) => {
  const { data } = await API.get(`/anime/info/${encodeURIComponent(animeId)}`);
  return data;
};

export const fetchWatchUrl = async (episodeId) => {
  const { data } = await API.get(`/anime/watch/${encodeURIComponent(episodeId)}`, { timeout: 60000 });
  return data;
};

// ═══════════════════════════════════════
// USER ENDPOINTS (Database-Free LocalStorage Implementation)
// ═══════════════════════════════════════

export const getWatchlist = async () => {
  try {
    const list = JSON.parse(localStorage.getItem('watchlist')) || [];
    return { success: true, watchlist: list };
  } catch (_) {
    return { success: true, watchlist: [] };
  }
};

export const addToWatchlist = async (anime) => {
  const list = JSON.parse(localStorage.getItem('watchlist')) || [];
  const idStr = String(anime.animeId);
  const exists = list.some((item) => String(item.animeId) === idStr);
  if (exists) {
    const err = new Error('Already in watchlist');
    err.response = { status: 409 };
    throw err;
  }
  list.push(anime);
  localStorage.setItem('watchlist', JSON.stringify(list));
  return { success: true, watchlist: list };
};

export const removeFromWatchlist = async (animeId) => {
  const list = JSON.parse(localStorage.getItem('watchlist')) || [];
  const idStr = String(animeId);
  const filtered = list.filter((item) => String(item.animeId) !== idStr);
  localStorage.setItem('watchlist', JSON.stringify(filtered));
  return { success: true, watchlist: filtered };
};

export const getFavorites = async () => {
  try {
    const list = JSON.parse(localStorage.getItem('favorites')) || [];
    return { success: true, favorites: list };
  } catch (_) {
    return { success: true, favorites: [] };
  }
};

export const addToFavorites = async (anime) => {
  const list = JSON.parse(localStorage.getItem('favorites')) || [];
  const idStr = String(anime.animeId);
  const exists = list.some((item) => String(item.animeId) === idStr);
  if (exists) {
    const err = new Error('Already in favorites');
    err.response = { status: 409 };
    throw err;
  }
  list.push(anime);
  localStorage.setItem('favorites', JSON.stringify(list));
  return { success: true, favorites: list };
};

export const removeFromFavorites = async (animeId) => {
  const list = JSON.parse(localStorage.getItem('favorites')) || [];
  const idStr = String(animeId);
  const filtered = list.filter((item) => String(item.animeId) !== idStr);
  localStorage.setItem('favorites', JSON.stringify(filtered));
  return { success: true, favorites: filtered };
};

export default API;
