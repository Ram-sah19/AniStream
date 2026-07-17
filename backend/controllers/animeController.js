const axios = require('axios');
const cheerio = require('cheerio');
const { ANIME } = require('@consumet/extensions');

const ANILIST_URL = 'https://graphql.anilist.co';
const animepahe = new ANIME.AnimePahe();

const queryAniList = async (query, variables) => {
  const { data } = await axios.post(ANILIST_URL, {
    query,
    variables,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    timeout: 8000,
  });
  return data;
};

// Helper headers for hianime.ro scraping
const SCRAPER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

/**
 * @desc    Get trending / top-airing Chinese anime
 * @route   GET /api/anime/trending
 */
const getTrending = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const query = `
      query ($page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          media (type: ANIME, countryOfOrigin: "CN", sort: TRENDING_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
            }
            averageScore
            episodes
            status
            description
            genres
            seasonYear
            season
            format
          }
        }
      }
    `;

    const data = await queryAniList(query, { page, perPage: 24 });
    const mediaList = data?.data?.Page?.media || [];

    const anime = mediaList.map((item) => ({
      mal_id: item.id,
      id: String(item.id),
      title: item.title.english || item.title.romaji || item.title.native,
      title_english: item.title.english,
      image: item.coverImage.large,
      score: item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : null,
      episodes: item.episodes,
      status: item.status,
      synopsis: item.description?.replace(/<[^>]*>/g, '') || '',
      genres: item.genres || [],
      year: item.seasonYear,
      season: item.season ? item.season.toLowerCase() : null,
      type: item.format,
    }));

    res.json({ success: true, results: anime });
  } catch (error) {
    console.error('Trending fetch error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch trending anime' });
  }
};

/**
 * @desc    Get popular Chinese anime of all time
 * @route   GET /api/anime/popular
 */
const getPopular = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const query = `
      query ($page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          media (type: ANIME, countryOfOrigin: "CN", sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
            }
            averageScore
            episodes
            status
            description
            genres
            seasonYear
            season
            format
          }
        }
      }
    `;

    const data = await queryAniList(query, { page, perPage: 24 });
    const mediaList = data?.data?.Page?.media || [];

    const anime = mediaList.map((item) => ({
      mal_id: item.id,
      id: String(item.id),
      title: item.title.english || item.title.romaji || item.title.native,
      title_english: item.title.english,
      image: item.coverImage.large,
      score: item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : null,
      episodes: item.episodes,
      status: item.status,
      synopsis: item.description?.replace(/<[^>]*>/g, '') || '',
      genres: item.genres || [],
      year: item.seasonYear,
      season: item.season ? item.season.toLowerCase() : null,
      type: item.format,
    }));

    res.json({ success: true, results: anime });
  } catch (error) {
    console.error('Popular fetch error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch popular anime' });
  }
};

/**
 * @desc    Search Chinese anime by query
 * @route   GET /api/anime/search
 */
const searchAnime = async (req, res) => {
  try {
    const { q } = req.query;
    let anime = [];

    if (q) {
      const query = `
        query ($search: String, $page: Int, $perPage: Int) {
          Page (page: $page, perPage: $perPage) {
            media (type: ANIME, countryOfOrigin: "CN", search: $search) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
              }
              averageScore
              episodes
              status
              description
              genres
              seasonYear
              season
              format
            }
          }
        }
      `;

      const data = await queryAniList(query, { search: q, page: 1, perPage: 24 });
      const mediaList = data?.data?.Page?.media || [];

      anime = mediaList.map((item) => ({
        mal_id: item.id,
        id: String(item.id),
        title: item.title.english || item.title.romaji || item.title.native,
        title_english: item.title.english,
        image: item.coverImage.large,
        score: item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : null,
        episodes: item.episodes,
        status: item.status,
        synopsis: item.description?.replace(/<[^>]*>/g, '') || '',
        genres: item.genres || [],
      }));
    }

    res.json({ success: true, results: anime });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};

/**
 * Helper to resolve anime page HTML on hianime.ro
 */
const getHianimePageHtml = async (title) => {
  const cleanSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const directUrl = `https://hianime.ro/anime/${cleanSlug}/`;
  
  try {
    console.log(`[Hianime Scraper] Checking direct url: ${directUrl}`);
    const res = await axios.get(directUrl, { headers: SCRAPER_HEADERS, timeout: 5000 });
    return res.data;
  } catch (err) {
    console.log(`[Hianime Scraper] Direct URL failed. Searching for "${title}" on site...`);
    try {
      const searchUrl = `https://hianime.ro/?s=${encodeURIComponent(title)}`;
      const searchRes = await axios.get(searchUrl, { headers: SCRAPER_HEADERS, timeout: 5000 });
      const $ = cheerio.load(searchRes.data);
      
      // Look for the first result card link under the search results
      const resolvedLink = $('a[href*="/anime/"]').first().attr('href');
      if (resolvedLink) {
        console.log(`[Hianime Scraper] Found matching anime page: ${resolvedLink}`);
        const res = await axios.get(resolvedLink, { headers: SCRAPER_HEADERS, timeout: 5000 });
        return res.data;
      }
    } catch (searchErr) {
      console.warn('[Hianime Scraper] Search failed:', searchErr.message);
    }
  }
  return null;
};

/**
 * @desc    Get anime info + dynamic/scraped episode list
 * @route   GET /api/anime/info/:animeId
 */
const getAnimeInfo = async (req, res) => {
  try {
    const { animeId } = req.params;
    let resolvedId = animeId;

    if (resolvedId.includes(':')) {
      const parts = resolvedId.split(':');
      resolvedId = parts.slice(1).join(':');
    }

    // If ID is not numeric (e.g. alphanumeric slug), search AniList first to find the ID
    if (!/^\d+$/.test(resolvedId)) {
      console.log(`[Metadata] Alphanumeric ID "${resolvedId}". Searching AniList...`);
      const cleanSlug = resolvedId.replace(/-/g, ' ');
      const query = `
        query ($search: String) {
          Page (page: 1, perPage: 1) {
            media (type: ANIME, countryOfOrigin: "CN", search: $search) {
              id
            }
          }
        }
      `;
      const searchRes = await queryAniList(query, { search: cleanSlug });
      const foundItem = searchRes?.data?.Page?.media?.[0];
      if (foundItem) {
        resolvedId = String(foundItem.id);
      } else {
        return res.status(404).json({ success: false, message: 'Anime details not found' });
      }
    }

    console.log(`[Metadata] Fetching anime info for AniList ID: "${resolvedId}"`);
    const query = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
          }
          averageScore
          episodes
          status
          description
          genres
          seasonYear
          season
          format
        }
      }
    `;
    const detailsRes = await queryAniList(query, { id: parseInt(resolvedId, 10) });
    const item = detailsRes?.data?.Media;

    if (!item) {
      return res.status(404).json({ success: false, message: 'Anime details not found' });
    }

    // Determine expected episode count
    const expectedCount = item.episodes || 12;
    let episodes = [];
    const mainTitle = item.title.english || item.title.romaji || item.title.native;
    const backupTitle = item.title.romaji !== mainTitle ? item.title.romaji : (item.title.english || '');

    // Tier 1: Fetch episodes from Anime4i (Primary for Chinese Anime)
    try {
      const anime4iEpList = await getAnime4iEpisodes(mainTitle);
      if (anime4iEpList && anime4iEpList.length > 0) {
        episodes = anime4iEpList;
        console.log(`[Anime4i Scraper] Successfully loaded ${episodes.length} episodes as primary!`);
      }
    } catch (anime4iErr) {
      console.warn('[Anime4i Scraper] Failed to fetch episodes as primary:', anime4iErr.message);
    }

    // Tier 2: Fetch real episodes using @consumet/extensions (AnimePahe fallback)
    if (episodes.length < expectedCount) {
      try {
        console.log(`[AnimePahe] Searching for anime: "${mainTitle}"`);
        const searchRes = await animepahe.search(mainTitle);
        const results = searchRes.results || [];
        let matchedAnime = results[0];

        if (!matchedAnime && backupTitle) {
          console.log(`[AnimePahe] No match for "${mainTitle}". Trying backup title: "${backupTitle}"`);
          const searchResEng = await animepahe.search(backupTitle);
          matchedAnime = searchResEng.results?.[0];
        }

        if (matchedAnime) {
          console.log(`[AnimePahe] Found matching anime ID: "${matchedAnime.id}". Fetching details...`);
          const animeDetails = await animepahe.fetchAnimeInfo(matchedAnime.id);
          if (animeDetails && animeDetails.episodes && animeDetails.episodes.length > episodes.length) {
            episodes = animeDetails.episodes.map((ep) => ({
              id: `animepahe:${ep.id}`,
              number: Number(ep.number) || ep.number,
              url: `/watch/animepahe:${ep.id}`,
            }));
            console.log(`[AnimePahe] Successfully replaced with more complete list of ${episodes.length} episodes!`);
          }
        }
      } catch (paheErr) {
        console.warn('[AnimePahe] Failed to fetch episodes:', paheErr.message);
      }
    }

    // Tier 3: Attempt to scrape real episodes from hianime.ro (Fallback)
    if (episodes.length < expectedCount) {
      try {
        const pageHtml = await getHianimePageHtml(mainTitle);
        if (pageHtml) {
          const $ = cheerio.load(pageHtml);
          const animePostId = $('#ani_detail').attr('data-anime-id') || $('[data-anime-id]').first().attr('data-anime-id');
          
          if (animePostId) {
            console.log(`[Hianime Scraper] Found Post ID: ${animePostId}. Fetching episode list...`);
            const listRes = await axios.get(`https://hianime.ro/wp-json/v1/otakuthemes/episode/list/${animePostId}`, {
              headers: SCRAPER_HEADERS,
              timeout: 5000,
            });

            if (listRes.data && listRes.data.status && listRes.data.html) {
              const $list = cheerio.load(listRes.data.html);
              const hianimeEpisodes = [];
              $list('.ep-item').each((i, el) => {
                const epId = $list(el).attr('data-id');
                const epNum = $list(el).attr('data-number') || $list(el).text().trim();
                if (epId) {
                  hianimeEpisodes.push({
                    id: `hianime:${epId}`,
                    number: Number(epNum) || (i + 1),
                    url: `/watch/hianime:${epId}`,
                  });
                }
              });
              if (hianimeEpisodes.length > episodes.length) {
                episodes = hianimeEpisodes;
                console.log(`[Hianime Scraper] Successfully replaced with more complete list of ${episodes.length} episodes!`);
              }
            }
          }
        }
      } catch (scrapeErr) {
        console.warn('[Hianime Scraper] Scraper failed to fetch episodes:', scrapeErr.message);
      }
    }

    // Tier 4: Generate dynamic episode list if other methods failed
    if (episodes.length === 0) {
      const totalCount = item.episodes || 12;
      const slugTitle = mainTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      for (let i = 1; i <= totalCount; i++) {
        episodes.push({
          id: `dailymotion:${slugTitle}-episode-${i}`,
          number: i,
          url: `/watch/dailymotion:${slugTitle}-episode-${i}`,
        });
      }
      console.log(`[Scraper Fallback] Generated ${episodes.length} dynamic Dailymotion episodes.`);
    }

    res.json({
      success: true,
      anime: {
        id: String(item.id),
        mal_id: item.id,
        title: item.title.english || item.title.romaji || item.title.native,
        title_english: item.title.english,
        image: item.coverImage.extraLarge || item.coverImage.large,
        description: item.description?.replace(/<[^>]*>/g, '') || '',
        status: item.status,
        genres: item.genres || [],
        totalEpisodes: item.episodes || episodes.length,
        score: item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : null,
        year: item.seasonYear,
        season: item.season ? item.season.toLowerCase() : null,
        type: item.format,
        episodes: episodes,
      },
    });

  } catch (error) {
    console.error('Anime info error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch anime info' });
  }
};

const parseEpisodeInfo = (id) => {
  let episodeNum = '1';
  let animeName = id.replace(/-/g, ' ');

  // Try to find "episode-XX" or "ep-XX"
  let match = id.match(/(?:episode|ep)-(\d+)/i);
  if (match) {
    episodeNum = match[1];
    const index = id.toLowerCase().indexOf(match[0]);
    animeName = id.substring(0, index).replace(/-/g, ' ').trim();
  } else {
    // Trailing number fallback
    const cleanId = id.replace(/-(sub|dub|english|eng|raw)/gi, '');
    const parts = cleanId.split('-');
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      episodeNum = lastPart;
      animeName = parts.slice(0, -1).join(' ');
    }
  }

  // Capitalize title
  animeName = animeName
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return { animeName, episodeNum };
};

/**
 * Fallback to search Dailymotion
 */
const getDailymotionFallback = async (targetId) => {
  try {
    const { animeName, episodeNum } = parseEpisodeInfo(targetId);
    const searchQuery = `${animeName} Episode ${episodeNum}`;
    console.log(`[Dailymotion Fallback] Searching: "${searchQuery}"`);

    const { data } = await axios.get('https://api.dailymotion.com/videos', {
      params: {
        fields: 'id,title',
        search: searchQuery,
        limit: 5,
      },
      timeout: 5000,
    });

    const list = data?.list || [];
    if (list.length > 0) {
      const match = list.find((v) => 
        v.title.toLowerCase().includes(episodeNum) || 
        v.title.toLowerCase().includes(`ep ${episodeNum}`) ||
        v.title.toLowerCase().includes(`ep.${episodeNum}`)
      ) || list[0];

      const embedUrl = `https://www.dailymotion.com/embed/video/${match.id}`;
      console.log(`[Dailymotion Fallback] Resolved: "${match.title}" -> ${embedUrl}`);
      
      return {
        success: true,
        videoUrl: embedUrl,
        isM3U8: false,
        quality: 'Dailymotion Embed',
        sources: [
          {
            url: embedUrl,
            quality: 'Dailymotion',
            isM3U8: false,
          }
        ],
        headers: {},
      };
    }
  } catch (err) {
    console.error('[Dailymotion Fallback] Failed:', err.message);
  }
  return null;
};

/**
 * Scrape episode list from anime4i.com for an anime title
 */
const getAnime4iEpisodes = async (animeTitle) => {
  try {
    console.log(`[Anime4i] Searching for series page for title: "${animeTitle}"`);
    const searchUrl = `https://anime4i.com/?s=${encodeURIComponent(animeTitle)}`;
    const response = await axios.get(searchUrl, {
      headers: SCRAPER_HEADERS,
      timeout: 8000,
    });
    
    const $ = cheerio.load(response.data);
    let seriesUrl = null;
    
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('/anime/') && !href.includes('/genres/') && !href.includes('/year/') && !href.includes('/status/')) {
        seriesUrl = href;
        return false;
      }
    });

    if (!seriesUrl) {
      const slug = animeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      seriesUrl = `https://anime4i.com/anime/${slug}`;
      console.log(`[Anime4i] No search series link found, guessing direct URL: ${seriesUrl}`);
    } else {
      console.log(`[Anime4i] Found series page URL from search: ${seriesUrl}`);
    }

    const pageRes = await axios.get(seriesUrl, {
      headers: SCRAPER_HEADERS,
      timeout: 8000,
    });

    const $page = cheerio.load(pageRes.data);
    const episodes = [];

    $page('.eplister ul li a').each((i, el) => {
      const href = $page(el).attr('href');
      if (href) {
        const epNumText = $page(el).find('div').first().text().trim();
        const epNum = parseInt(epNumText, 10);
        const slug = href.replace(/https?:\/\/anime4i\.com\//, '').replace(/\/$/, '');
        if (slug) {
          episodes.push({
            id: `anime4i:${slug}`,
            number: !isNaN(epNum) ? epNum : (i + 1),
            url: `/watch/anime4i:${slug}`,
          });
        }
      }
    });

    if (episodes.length === 0) {
      $page('.eplister a').each((i, el) => {
        const href = $page(el).attr('href');
        if (href && (href.includes('-episode-') || href.includes('-ep-'))) {
          const slug = href.replace(/https?:\/\/anime4i\.com\//, '').replace(/\/$/, '');
          const match = slug.match(/(?:episode|ep)-(\d+)/i);
          const epNum = match ? parseInt(match[1], 10) : (i + 1);
          if (slug && !episodes.some(ep => ep.id === `anime4i:${slug}`)) {
            episodes.push({
              id: `anime4i:${slug}`,
              number: epNum,
              url: `/watch/anime4i:${slug}`,
            });
          }
        }
      });
    }

    if (episodes.length > 0) {
      episodes.sort((a, b) => a.number - b.number);
      console.log(`[Anime4i] Successfully scraped ${episodes.length} episodes.`);
      return episodes;
    }
  } catch (error) {
    console.warn(`[Anime4i] Failed to scrape episodes:`, error.message);
  }
  return [];
};

/**
 * Scrape streaming source URL from anime4i.com watch page
 */
const getAnime4iStream = async (targetId) => {
  try {
    console.log(`[Anime4i] Scraping streaming sources for: "${targetId}"`);
    let watchPageUrl = `https://anime4i.com/${targetId}`;
    let response;
    try {
      response = await axios.get(watchPageUrl, {
        headers: SCRAPER_HEADERS,
        timeout: 8000,
      });
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.log(`[Anime4i] Direct URL 404, searching for "${targetId}"`);
        const searchUrl = `https://anime4i.com/?s=${encodeURIComponent(targetId)}`;
        const searchRes = await axios.get(searchUrl, {
          headers: SCRAPER_HEADERS,
          timeout: 8000,
        });
        const $search = cheerio.load(searchRes.data);
        let firstMatch = null;
        $search('article h2 a, .entry-title a, .post-title a, a').each((i, el) => {
          const href = $search(el).attr('href');
          if (href && (href.includes('-episode-') || href.includes('-ep-'))) {
            firstMatch = href;
            return false;
          }
        });
        if (firstMatch) {
          watchPageUrl = firstMatch;
          console.log(`[Anime4i] Resolved search watch URL: ${watchPageUrl}`);
          response = await axios.get(watchPageUrl, {
            headers: SCRAPER_HEADERS,
            timeout: 8000,
          });
        } else {
          throw new Error('No search match found for episode');
        }
      } else {
        throw err;
      }
    }

    const $ = cheerio.load(response.data);
    const sources = [];

    const pembed = $('#pembed, .player-embed').first();
    const defaultEmbedBase64 = pembed.attr('data-default-embed');

    if (defaultEmbedBase64) {
      try {
        const decoded = Buffer.from(defaultEmbedBase64, 'base64').toString('utf8');
        const match = decoded.match(/src=["']([^"']+)["']/i);
        if (match && match[1]) {
          sources.push({
            url: match[1],
            quality: 'Default Player',
            isM3U8: match[1].includes('.m3u8') || (!match[1].includes('dailymotion.com') && !match[1].includes('youtube.com')),
          });
        }
      } catch (decodeErr) {
        console.warn('[Anime4i] Failed to decode default embed:', decodeErr.message);
      }
    }

    $('.mirror option').each((i, el) => {
      const label = $(el).text().trim() || `Mirror ${i + 1}`;
      const value = $(el).attr('value');
      if (value) {
        try {
          const decoded = Buffer.from(value, 'base64').toString('utf8');
          const match = decoded.match(/src=["']([^"']+)["']/i);
          if (match && match[1]) {
            if (!sources.some(s => s.url === match[1])) {
              sources.push({
                url: match[1],
                quality: label,
                isM3U8: match[1].includes('.m3u8') || (!match[1].includes('dailymotion.com') && !match[1].includes('youtube.com')),
              });
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    if (sources.length === 0) {
      $('iframe').each((i, el) => {
        const src = $(el).attr('src');
        if (src && (src.includes('dailymotion.com') || src.includes('youtube.com') || src.includes('.m3u8') || src.includes('embed'))) {
          sources.push({
            url: src,
            quality: `Iframe Source ${i + 1}`,
            isM3U8: src.includes('.m3u8') || (!src.includes('dailymotion.com') && !src.includes('youtube.com')),
          });
        }
      });
    }

    if (sources.length > 0) {
      console.log(`[Anime4i] Successfully resolved ${sources.length} stream sources.`);
      return {
        success: true,
        videoUrl: sources[0].url,
        isM3U8: sources[0].isM3U8,
        quality: sources[0].quality,
        sources: sources,
        headers: {},
      };
    }
  } catch (error) {
    console.warn(`[Anime4i] Failed to scrape streaming URL:`, error.message);
  }
  return null;
};

/**
 * @desc    Get streaming URL for an episode from hianime.ro (or Dailymotion fallback)
 * @route   GET /api/watch/*
 */
const getWatchUrl = async (req, res) => {
  try {
    let episodeId = req.params[0] || req.params.episodeId || req.url.split('/watch/')[1];
    episodeId = decodeURIComponent(episodeId);

    let provider = 'hianime';
    let targetId = episodeId;
    if (episodeId.includes(':')) {
      const parts = episodeId.split(':');
      provider = parts[0];
      targetId = parts.slice(1).join(':');
    }

    console.log(`[Watch] Requested provider: "${provider}", ID: "${targetId}"`);

    // 1. Anime4i Request
    if (provider === 'anime4i') {
      const data = await getAnime4iStream(targetId);
      if (data) return res.json(data);
    }

    // 2. AnimePahe Request
    if (provider === 'animepahe') {
      try {
        console.log(`[AnimePahe] Fetching sources for episodeId: "${targetId}"`);
        const data = await animepahe.fetchEpisodeSources(targetId);
        
        if (data && data.sources && data.sources.length > 0) {
          const mappedSources = data.sources.map((s) => ({
            url: s.url,
            quality: s.quality || 'Auto',
            isM3U8: s.isM3U8 || s.url.includes('.m3u8') || !s.url.includes('.mp4'),
          }));

          const primarySource = mappedSources.find((s) => s.quality === 'default') || mappedSources[0];

          console.log(`[AnimePahe] Successfully resolved ${mappedSources.length} sources.`);
          return res.json({
            success: true,
            videoUrl: primarySource.url,
            isM3U8: primarySource.isM3U8,
            quality: primarySource.quality,
            sources: mappedSources,
            headers: data.headers || {},
          });
        }
      } catch (paheErr) {
        console.warn('[AnimePahe] Failed to fetch episode sources:', paheErr.message);
      }
    }

    // 3. Hianime Scraping Request
    if (provider === 'hianime') {
      try {
        console.log(`[Hianime Scraper] Fetching servers for episodeId: "${targetId}"`);
        const { data } = await axios.get(`https://hianime.ro/wp-json/v1/otakuthemes/episode/servers?episodeId=${targetId}`, {
          headers: SCRAPER_HEADERS,
          timeout: 6000,
        });

        if (data && data.status && data.html) {
          const $ = cheerio.load(data.html);
          const sources = [];

          $('.server-item').each((i, el) => {
            const serverName = $(el).attr('data-server-name') || $(el).text().trim();
            const hash = $(el).attr('data-hash');
            if (hash) {
              try {
                const url = Buffer.from(hash, 'base64').toString('utf8');
                sources.push({
                  url: url,
                  quality: serverName,
                  isM3U8: url.includes('.m3u8') || url.includes('.mp4') === false,
                });
              } catch (decodeErr) {
                console.warn('[Hianime Scraper] Failed to decode server hash:', decodeErr.message);
              }
            }
          });

          if (sources.length > 0) {
            console.log(`[Hianime Scraper] Resolved ${sources.length} stream sources.`);
            return res.json({
              success: true,
              videoUrl: sources[0].url,
              isM3U8: sources[0].isM3U8,
              quality: sources[0].quality,
              sources: sources,
              headers: {},
            });
          }
        }
      } catch (hianimeErr) {
        console.warn(`[Hianime Scraper] Failed to fetch servers: ${hianimeErr.message}`);
      }
    }

    // 4. Direct Dailymotion Request
    if (provider === 'dailymotion') {
      const fallback = await getDailymotionFallback(targetId);
      if (fallback) {
        return res.json(fallback);
      }
    }

    // =========================================================================
    // UNIFIED AUTO-HEALING CHAIN (If requested provider failed/returned no stream)
    // =========================================================================
    console.log(`[Auto-Healing] Provider "${provider}" failed. Healing "${targetId}"...`);

    // 1. Try Anime4i Fallback Scraper
    try {
      const streamData = await getAnime4iStream(targetId);
      if (streamData) {
        console.log(`[Auto-Healing] Successfully healed via Anime4i!`);
        return res.json(streamData);
      }
    } catch (e) {
      console.warn('[Auto-Healing] Anime4i attempt failed:', e.message);
    }

    // 2. Try AnimePahe Fallback
    try {
      const { animeName, episodeNum } = parseEpisodeInfo(targetId);
      const searchRes = await animepahe.search(animeName);
      const results = searchRes?.results || [];
      const matchedAnime = results[0];

      if (matchedAnime) {
        const animeDetails = await animepahe.fetchAnimeInfo(matchedAnime.id);
        const targetEp = animeDetails?.episodes?.find(
          (ep) => Number(ep.number) === Number(episodeNum)
        );

        if (targetEp) {
          const sourceData = await animepahe.fetchEpisodeSources(targetEp.id);
          if (sourceData && sourceData.sources && sourceData.sources.length > 0) {
            const mappedSources = sourceData.sources.map((s) => ({
              url: s.url,
              quality: s.quality || 'Auto',
              isM3U8: s.isM3U8 || s.url.includes('.m3u8') || !s.url.includes('.mp4'),
            }));
            const primarySource = mappedSources.find((s) => s.quality === 'default') || mappedSources[0];
            console.log(`[Auto-Healing] Successfully healed via AnimePahe!`);
            return res.json({
              success: true,
              videoUrl: primarySource.url,
              isM3U8: primarySource.isM3U8,
              quality: primarySource.quality,
              sources: mappedSources,
              headers: sourceData.headers || {},
            });
          }
        }
      }
    } catch (healErr) {
      console.warn('[Auto-Healing] AnimePahe attempt failed:', healErr.message);
    }

    // 3. Try Dailymotion Fallback
    const fallback = await getDailymotionFallback(targetId);
    if (fallback) {
      console.log(`[Auto-Healing] Successfully healed via Dailymotion!`);
      return res.json(fallback);
    }

    res.status(404).json({ 
      success: false, 
      message: 'This episode has not aired yet or no streaming sources were found. Please check back later!' 
    });
  } catch (error) {
    console.error('Watch error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch watch URL' });
  }
};

module.exports = {
  getTrending,
  getPopular,
  searchAnime,
  getAnimeInfo,
  getWatchUrl,
};
