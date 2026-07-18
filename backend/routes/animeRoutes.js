const express = require('express');
const axios = require('axios');
const router = express.Router();
const {
  getTrending,
  getPopular,
  searchAnime,
  getAnimeInfo,
  getWatchUrl,
  getCatalog,
} = require('../controllers/animeController');

// Anime metadata routes
router.get('/trending', getTrending);
router.get('/popular', getPopular);
router.get('/search', searchAnime);
router.get('/catalog', getCatalog);
router.get('/info/:animeId', getAnimeInfo);

// Streaming route (returns M3U8 URL + sources)
router.get('/watch/*', getWatchUrl);

// ═══════════════════════════════════════
// CORS PROXY for HLS streams
// GogoCDN/VidStreaming blocks direct browser requests
// This proxy forwards the request with the correct Referer header
// ═══════════════════════════════════════
router.get('/proxy', async (req, res) => {
  try {
    const { url, referer } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const response = await axios.get(url, {
      headers: {
        'Referer': referer || 'https://gogoplay4.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      responseType: 'arraybuffer',
      timeout: 15000,
    });

    // Forward the content type header
    const contentType = response.headers['content-type'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Allow CORS
    res.setHeader('Access-Control-Allow-Origin', '*');

    // If it's a .m3u8 manifest, we need to rewrite segment URLs to go through our proxy too
    if (url.endsWith('.m3u8') || (contentType && contentType.includes('mpegurl'))) {
      let manifest = response.data.toString('utf-8');

      // Get the base URL of the original M3U8 file
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

      // Rewrite relative URLs in the manifest to go through our proxy
      manifest = manifest.replace(/^(?!#)(.+\.ts.*)$/gm, (match) => {
        const segmentUrl = match.startsWith('http') ? match : baseUrl + match;
        return `/api/anime/proxy?url=${encodeURIComponent(segmentUrl.trim())}&referer=${encodeURIComponent(referer || 'https://gogoplay4.com/')}`;
      });

      // Also rewrite nested .m3u8 playlist references
      manifest = manifest.replace(/^(?!#)(.+\.m3u8.*)$/gm, (match) => {
        const playlistUrl = match.startsWith('http') ? match : baseUrl + match;
        return `/api/anime/proxy?url=${encodeURIComponent(playlistUrl.trim())}&referer=${encodeURIComponent(referer || 'https://gogoplay4.com/')}`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(manifest);
    }

    // For .ts segments and other binary data, just pipe through
    res.send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

module.exports = router;
