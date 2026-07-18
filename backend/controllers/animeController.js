const axios = require('axios');
const cheerio = require('cheerio');

// ═══════════════════════════════════════
// AniList GraphQL API — Chinese Donghua
// ═══════════════════════════════════════
const ANILIST_URL = 'https://graphql.anilist.co';

const SCRAPER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://www.google.com/',
};

/**
 * Execute an AniList GraphQL query
 */
const anilistQuery = async (query, variables = {}) => {
  const { data } = await axios.post(
    ANILIST_URL,
    { query, variables },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 12000,
    }
  );
  return data;
};

/**
 * Map an AniList media object to our internal schema
 */
const mapAniListAnime = (item) => ({
  id: String(item.id),
  mal_id: item.idMal || item.id,
  title: item.title?.english || item.title?.romaji || item.title?.native,
  title_english: item.title?.english || item.title?.romaji,
  title_native: item.title?.native,
  image:
    item.coverImage?.extraLarge ||
    item.coverImage?.large ||
    item.coverImage?.medium,
  score: item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : null,
  episodes: item.episodes,
  status: item.status === 'RELEASING' ? 'Ongoing' : item.status === 'FINISHED' ? 'Completed' : item.status,
  synopsis: item.description
    ? item.description.replace(/<[^>]*>/g, '') // strip HTML tags
    : '',
  genres: item.genres || [],
  year: item.startDate?.year,
  season: item.season,
  type: item.format,
  countryOfOrigin: item.countryOfOrigin,
  studio: item.studios?.nodes?.[0]?.name || null,
});

// ═══════════════════════════════════════
// TRENDING DONGHUA
// ═══════════════════════════════════════

/**
 * @desc    Get trending Chinese anime (donghua)
 * @route   GET /api/anime/trending
 */
const getTrending = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;

    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage perPage }
          media(
            type: ANIME
            countryOfOrigin: "CN"
            sort: [TRENDING_DESC, POPULARITY_DESC]
            status_in: [RELEASING, FINISHED]
          ) {
            id
            idMal
            title { romaji english native }
            coverImage { extraLarge large medium }
            averageScore
            episodes
            status
            genres
            startDate { year }
            season
            format
            description
            countryOfOrigin
            studios(isMain: true) { nodes { name } }
          }
        }
      }
    `;

    const data = await anilistQuery(query, { page, perPage: 24 });
    const mediaList = data?.data?.Page?.media || [];
    const anime = mediaList.map(mapAniListAnime);

    res.json({ success: true, results: anime });
  } catch (error) {
    console.error('Trending fetch error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch trending donghua' });
  }
};

// ═══════════════════════════════════════
// POPULAR DONGHUA
// ═══════════════════════════════════════

/**
 * @desc    Get popular Chinese anime (donghua)
 * @route   GET /api/anime/popular
 */
const getPopular = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;

    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage perPage }
          media(
            type: ANIME
            countryOfOrigin: "CN"
            sort: [POPULARITY_DESC, SCORE_DESC]
          ) {
            id
            idMal
            title { romaji english native }
            coverImage { extraLarge large medium }
            averageScore
            episodes
            status
            genres
            startDate { year }
            season
            format
            description
            countryOfOrigin
            studios(isMain: true) { nodes { name } }
          }
        }
      }
    `;

    const data = await anilistQuery(query, { page, perPage: 24 });
    const mediaList = data?.data?.Page?.media || [];
    const anime = mediaList.map(mapAniListAnime);

    res.json({ success: true, results: anime });
  } catch (error) {
    console.error('Popular fetch error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch popular donghua' });
  }
};

// ═══════════════════════════════════════
// SEARCH DONGHUA
// ═══════════════════════════════════════

/**
 * @desc    Search Chinese anime by query
 * @route   GET /api/anime/search
 */
const searchAnime = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, results: [] });

    const query = `
      query ($search: String, $page: Int) {
        Page(page: $page, perPage: 24) {
          media(
            type: ANIME
            countryOfOrigin: "CN"
            search: $search
            sort: [SEARCH_MATCH]
          ) {
            id
            idMal
            title { romaji english native }
            coverImage { extraLarge large medium }
            averageScore
            episodes
            status
            genres
            startDate { year }
            season
            format
            description
            countryOfOrigin
            studios(isMain: true) { nodes { name } }
          }
        }
      }
    `;

    const data = await anilistQuery(query, { search: q, page: 1 });
    const mediaList = data?.data?.Page?.media || [];

    // If no CN results, fall back to a global search (in case user typed Chinese title in romaji)
    if (mediaList.length === 0) {
      const fallbackQuery = `
        query ($search: String, $page: Int) {
          Page(page: $page, perPage: 24) {
            media(
              type: ANIME
              search: $search
              sort: [SEARCH_MATCH]
              countryOfOrigin: "CN"
            ) {
              id
              idMal
              title { romaji english native }
              coverImage { extraLarge large medium }
              averageScore
              episodes
              status
              genres
              startDate { year }
              season
              format
              description
              countryOfOrigin
              studios(isMain: true) { nodes { name } }
            }
          }
        }
      `;
      const fbData = await anilistQuery(fallbackQuery, { search: q, page: 1 });
      const fbList = fbData?.data?.Page?.media || [];
      return res.json({ success: true, results: fbList.map(mapAniListAnime) });
    }

    res.json({ success: true, results: mediaList.map(mapAniListAnime) });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ success: false, message: 'Donghua search failed' });
  }
};

// ═══════════════════════════════════════
// ANIME INFO + EPISODE LIST
// ═══════════════════════════════════════

/**
 * Scrape episode list from donghua.io for a given title
 */
const getDonghuaIoEpisodes = async (animeTitle) => {
  try {
    console.log(`[Donghua.io] Searching for series: "${animeTitle}"`);
    const cleanTitle = animeTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const slug = cleanTitle.replace(/\s+/g, '-');

    // Try direct URL first
    const directUrls = [
      `https://www.donghua.io/anime/${slug}/`,
      `https://www.donghua.io/anime/${slug}`,
    ];

    for (const url of directUrls) {
      try {
        console.log(`[Donghua.io] Trying direct URL: ${url}`);
        const res = await axios.get(url, { headers: SCRAPER_HEADERS, timeout: 8000 });
        const $ = cheerio.load(res.data);
        const episodes = [];

        // Try common episode list selectors
        $('a[href*="/episode/"], a[href*="-episode-"], .ep-list a, .episodes-list a, .episode-list a').each((i, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().trim();
          if (href && href.includes('episode')) {
            const epMatch = href.match(/episode[-_]?(\d+)/i) || text.match(/(\d+)/);
            const epNum = epMatch ? parseInt(epMatch[1], 10) : i + 1;
            const epSlug = href.replace(/https?:\/\/[^/]+\//, '').replace(/\/$/, '');
            if (epSlug && !episodes.some((e) => e.id === `donghua:${epSlug}`)) {
              episodes.push({
                id: `donghua:${epSlug}`,
                number: epNum,
                url: `/watch/donghua:${epSlug}`,
              });
            }
          }
        });

        if (episodes.length > 0) {
          episodes.sort((a, b) => a.number - b.number);
          console.log(`[Donghua.io] Found ${episodes.length} episodes via direct URL.`);
          return episodes;
        }
      } catch (e) {
        console.log(`[Donghua.io] Direct URL failed: ${e.message}`);
      }
    }

    // Try search
    const searchUrl = `https://www.donghua.io/?s=${encodeURIComponent(animeTitle)}`;
    console.log(`[Donghua.io] Trying search: ${searchUrl}`);
    const searchRes = await axios.get(searchUrl, { headers: SCRAPER_HEADERS, timeout: 8000 });
    const $s = cheerio.load(searchRes.data);

    let seriesUrl = null;
    $s('a[href*="/anime/"]').each((i, el) => {
      const href = $s(el).attr('href');
      if (href && !seriesUrl) {
        seriesUrl = href;
      }
    });

    if (seriesUrl) {
      const pageRes = await axios.get(seriesUrl, { headers: SCRAPER_HEADERS, timeout: 8000 });
      const $p = cheerio.load(pageRes.data);
      const episodes = [];

      $p('a[href*="/episode/"], a[href*="-episode-"], .ep-list a, .episodes-list a').each((i, el) => {
        const href = $p(el).attr('href');
        if (href) {
          const epMatch = href.match(/episode[-_]?(\d+)/i);
          const epNum = epMatch ? parseInt(epMatch[1], 10) : i + 1;
          const epSlug = href.replace(/https?:\/\/[^/]+\//, '').replace(/\/$/, '');
          if (epSlug && !episodes.some((e) => e.id === `donghua:${epSlug}`)) {
            episodes.push({
              id: `donghua:${epSlug}`,
              number: epNum,
              url: `/watch/donghua:${epSlug}`,
            });
          }
        }
      });

      if (episodes.length > 0) {
        episodes.sort((a, b) => a.number - b.number);
        console.log(`[Donghua.io] Found ${episodes.length} episodes via search.`);
        return episodes;
      }
    }
  } catch (error) {
    console.warn(`[Donghua.io] Scraper failed:`, error.message);
  }
  return [];
};

/**
 * @desc    Get donghua info + episode list
 * @route   GET /api/anime/info/:animeId
 */
const getAnimeInfo = async (req, res) => {
  try {
    const { animeId } = req.params;
    let resolvedId = animeId;

    // Strip provider prefix if present (e.g. "anilist:12345")
    if (resolvedId.includes(':')) {
      const parts = resolvedId.split(':');
      resolvedId = parts[parts.length - 1];
    }

    let item = null;

    // Fetch by AniList ID (numeric) or search by title
    if (/^\d+$/.test(resolvedId)) {
      console.log(`[AniList] Fetching details for ID: ${resolvedId}`);
      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            idMal
            title { romaji english native }
            coverImage { extraLarge large medium }
            bannerImage
            averageScore
            episodes
            status
            genres
            startDate { year }
            season
            format
            description
            countryOfOrigin
            studios(isMain: true) { nodes { name } }
          }
        }
      `;
      const data = await anilistQuery(query, { id: parseInt(resolvedId, 10) });
      item = data?.data?.Media;
    } else {
      // Search by title slug
      console.log(`[AniList] Searching by title: "${resolvedId}"`);
      const cleanTitle = resolvedId.replace(/-/g, ' ');
      const query = `
        query ($search: String) {
          Page(page: 1, perPage: 1) {
            media(type: ANIME, search: $search, countryOfOrigin: "CN") {
              id
              idMal
              title { romaji english native }
              coverImage { extraLarge large medium }
              bannerImage
              averageScore
              episodes
              status
              genres
              startDate { year }
              season
              format
              description
              countryOfOrigin
              studios(isMain: true) { nodes { name } }
            }
          }
        }
      `;
      const data = await anilistQuery(query, { search: cleanTitle });
      item = data?.data?.Page?.media?.[0];
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Donghua not found' });
    }

    const mapped = mapAniListAnime(item);
    const mainTitle = mapped.title;
    const expectedCount = mapped.episodes || 12;
    let episodes = [];

    // Tier 1: Donghua.io scraper
    try {
      const donghuaEps = await getDonghuaIoEpisodes(mainTitle);
      if (donghuaEps.length > 0) {
        episodes = donghuaEps;
        console.log(`[Donghua.io] Loaded ${episodes.length} episodes as primary source.`);
      }
    } catch (e) {
      console.warn('[Donghua.io] Primary scraper failed:', e.message);
    }

    // Tier 2: Try alternate title (romaji) if English title failed
    if (episodes.length === 0 && item.title?.romaji && item.title.romaji !== mainTitle) {
      try {
        const romajiEps = await getDonghuaIoEpisodes(item.title.romaji);
        if (romajiEps.length > 0) {
          episodes = romajiEps;
          console.log(`[Donghua.io] Loaded ${episodes.length} episodes via romaji title.`);
        }
      } catch (e) {
        console.warn('[Donghua.io] Romaji title scrape failed:', e.message);
      }
    }

    // Tier 3: Generate episode list with Dailymotion search fallback
    if (episodes.length === 0) {
      const totalCount = expectedCount;
      const slugTitle = mainTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      for (let i = 1; i <= totalCount; i++) {
        episodes.push({
          id: `dailymotion:${slugTitle}-episode-${i}`,
          number: i,
          url: `/watch/dailymotion:${slugTitle}-episode-${i}`,
        });
      }
      console.log(`[Fallback] Generated ${episodes.length} Dailymotion fallback episodes.`);
    }

    res.json({
      success: true,
      anime: {
        id: String(item.id),
        mal_id: item.idMal || item.id,
        title: mapped.title,
        title_english: mapped.title_english,
        title_native: mapped.title_native,
        image: mapped.image,
        description: mapped.synopsis,
        status: mapped.status,
        genres: mapped.genres,
        totalEpisodes: mapped.episodes || episodes.length,
        score: mapped.score,
        year: mapped.year,
        season: mapped.season,
        type: mapped.type,
        studio: mapped.studio,
        countryOfOrigin: mapped.countryOfOrigin,
        episodes,
      },
    });
  } catch (error) {
    console.error('Anime info error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch donghua info' });
  }
};

// ═══════════════════════════════════════
// STREAMING — EPISODE WATCH URL
// ═══════════════════════════════════════

/**
 * Parse episode info from a slug ID like "fog-hill-of-five-elements-episode-1"
 */
const parseEpisodeInfo = (id) => {
  let episodeNum = '1';
  let animeName = id.replace(/-/g, ' ');

  let match = id.match(/(?:episode|ep)[-_]?(\d+)/i);
  if (match) {
    episodeNum = match[1];
    const index = id.toLowerCase().indexOf(match[0]);
    animeName = id.substring(0, index).replace(/-/g, ' ').trim();
  } else {
    const cleanId = id.replace(/-(sub|dub|english|eng|raw|chinese|cn)/gi, '');
    const parts = cleanId.split('-');
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      episodeNum = lastPart;
      animeName = parts.slice(0, -1).join(' ');
    }
  }

  animeName = animeName
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return { animeName, episodeNum };
};

/**
 * Search Dailymotion for a Chinese anime episode
 * (Official channels like Tencent Video, Bilibili, iQIYI post on Dailymotion)
 */
const getDailymotionStream = async (targetId) => {
  try {
    const { animeName, episodeNum } = parseEpisodeInfo(targetId);

    // Try multiple search queries — prefer official Chinese channel content
    const queries = [
      `${animeName} Episode ${episodeNum} English Sub`,
      `${animeName} Ep ${episodeNum} Sub`,
      `${animeName} ${episodeNum}`,
    ];

    for (const searchQuery of queries) {
      console.log(`[Dailymotion] Searching: "${searchQuery}"`);
      try {
        const { data } = await axios.get('https://api.dailymotion.com/videos', {
          params: {
            fields: 'id,title,channel',
            search: searchQuery,
            limit: 10,
            sort: 'relevance',
          },
          timeout: 6000,
        });

        const list = data?.list || [];
        if (list.length > 0) {
          // Prefer official Chinese studio channel uploads
          const officialKeywords = ['tencent', 'bilibili', 'iqiyi', 'youku', 'official', 'animation', 'anime'];
          const officialMatch = list.find((v) =>
            officialKeywords.some((kw) =>
              v.title?.toLowerCase().includes(kw) ||
              v.channel?.toLowerCase().includes(kw)
            )
          );

          const best = officialMatch || list[0];
          const embedUrl = `https://www.dailymotion.com/embed/video/${best.id}`;

          console.log(`[Dailymotion] Resolved: "${best.title}" → ${embedUrl}`);
          return {
            success: true,
            videoUrl: embedUrl,
            isM3U8: false,
            quality: 'Dailymotion',
            sources: [{ url: embedUrl, quality: 'Dailymotion Embed', isM3U8: false }],
            headers: {},
          };
        }
      } catch (e) {
        console.warn(`[Dailymotion] Query "${searchQuery}" failed:`, e.message);
      }
    }
  } catch (err) {
    console.error('[Dailymotion] Scraper failed:', err.message);
  }
  return null;
};

/**
 * Scrape streaming source from donghua.io watch page
 */
const getDonghuaIoStream = async (targetId) => {
  try {
    console.log(`[Donghua.io] Fetching stream for: "${targetId}"`);
    const watchUrl = `https://www.donghua.io/${targetId}/`;

    const response = await axios.get(watchUrl, {
      headers: SCRAPER_HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const sources = [];

    // Look for iframes or video embeds
    $('iframe').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.length > 10) {
        sources.push({
          url: src,
          quality: `Stream ${i + 1}`,
          isM3U8: src.includes('.m3u8'),
        });
      }
    });

    // Look for data-embed attributes
    $('[data-embed], [data-src], [data-stream]').each((i, el) => {
      const embedVal =
        $(el).attr('data-embed') || $(el).attr('data-src') || $(el).attr('data-stream');
      if (embedVal && embedVal.startsWith('http')) {
        if (!sources.some((s) => s.url === embedVal)) {
          sources.push({
            url: embedVal,
            quality: 'Embed Source',
            isM3U8: embedVal.includes('.m3u8'),
          });
        }
      }
    });

    // Try base64 decoded embeds
    $('[data-enc], .player-embed, #pembed').each((i, el) => {
      const val = $(el).attr('data-enc') || $(el).attr('data-default-embed');
      if (val) {
        try {
          const decoded = Buffer.from(val, 'base64').toString('utf8');
          const match = decoded.match(/src=["']([^"']+)["']/i);
          if (match && match[1] && !sources.some((s) => s.url === match[1])) {
            sources.push({
              url: match[1],
              quality: 'Decoded Embed',
              isM3U8: match[1].includes('.m3u8'),
            });
          }
        } catch (_) {}
      }
    });

    if (sources.length > 0) {
      console.log(`[Donghua.io] Found ${sources.length} stream sources.`);
      return {
        success: true,
        videoUrl: sources[0].url,
        isM3U8: sources[0].isM3U8,
        quality: sources[0].quality,
        sources,
        headers: {},
      };
    }
  } catch (error) {
    console.warn(`[Donghua.io] Stream scrape failed:`, error.message);
  }
  return null;
};

/**
 * @desc    Get streaming URL for a donghua episode
 * @route   GET /api/anime/watch/*
 */
const getWatchUrl = async (req, res) => {
  try {
    let episodeId = req.params[0] || req.params.episodeId || req.url.split('/watch/')[1];
    episodeId = decodeURIComponent(episodeId);

    let provider = 'dailymotion';
    let targetId = episodeId;

    if (episodeId.includes(':')) {
      const parts = episodeId.split(':');
      provider = parts[0];
      targetId = parts.slice(1).join(':');
    }

    console.log(`[Watch] Provider: "${provider}", ID: "${targetId}"`);

    // ── 1. Donghua.io ──────────────────────────────────────────────
    if (provider === 'donghua') {
      const data = await getDonghuaIoStream(targetId);
      if (data) return res.json(data);
    }

    // ── 2. Dailymotion ─────────────────────────────────────────────
    if (provider === 'dailymotion') {
      // Check if targetId looks like a DM video ID (short alphanumeric)
      if (/^x[a-z0-9]{6}$/i.test(targetId)) {
        const embedUrl = `https://www.dailymotion.com/embed/video/${targetId}`;
        return res.json({
          success: true,
          videoUrl: embedUrl,
          isM3U8: false,
          quality: 'Dailymotion',
          sources: [{ url: embedUrl, quality: 'Dailymotion Embed', isM3U8: false }],
          headers: {},
        });
      }
      // Otherwise search Dailymotion
      const data = await getDailymotionStream(targetId);
      if (data) return res.json(data);
    }

    // ── 3. YouTube Embed ───────────────────────────────────────────
    if (provider === 'youtube') {
      // targetId is a YouTube video ID
      const embedUrl = `https://www.youtube.com/embed/${targetId}?autoplay=1`;
      return res.json({
        success: true,
        videoUrl: embedUrl,
        isM3U8: false,
        quality: 'YouTube Official',
        sources: [{ url: embedUrl, quality: 'YouTube Embed', isM3U8: false }],
        headers: {},
      });
    }

    // ══════════════════════════════════════════════════════════════
    // AUTO-HEALING CHAIN — try every provider in sequence
    // ══════════════════════════════════════════════════════════════
    console.log(`[Auto-Heal] Provider "${provider}" failed. Trying fallback chain...`);

    // Attempt 1: Donghua.io
    try {
      const stream = await getDonghuaIoStream(targetId);
      if (stream) {
        console.log(`[Auto-Heal] Healed via Donghua.io`);
        return res.json(stream);
      }
    } catch (e) {
      console.warn('[Auto-Heal] Donghua.io failed:', e.message);
    }

    // Attempt 2: Dailymotion search
    try {
      const stream = await getDailymotionStream(targetId);
      if (stream) {
        console.log(`[Auto-Heal] Healed via Dailymotion`);
        return res.json(stream);
      }
    } catch (e) {
      console.warn('[Auto-Heal] Dailymotion failed:', e.message);
    }

    return res.status(404).json({
      success: false,
      message:
        'No streaming source found for this episode. Try switching servers or check back later!',
    });
  } catch (error) {
    console.error('Watch error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch stream URL' });
  }
};

module.exports = {
  getTrending,
  getPopular,
  searchAnime,
  getAnimeInfo,
  getWatchUrl,
};
