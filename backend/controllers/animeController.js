const axios = require('axios');
const cheerio = require('cheerio');

// ═══════════════════════════════════════
// AniList GraphQL API — Chinese Donghua
// ═══════════════════════════════════════
const ANILIST_URL = 'https://graphql.anilist.co';

// ── Known official YouTube channel IDs for Chinese anime studios ──
// These channels upload full episodes publicly
const OFFICIAL_YT_CHANNELS = {
  tencent: 'UCdpiId0eJGnnIvfhpbJIM1w',     // Tencent Video Animation
  yuewen: 'UCuLbvLOoJsOPMVkuVb6-bJg',       // Yuewen Animation English
  bilibili: 'UCqkSPAHJXA-RJtRmBDggIOg',     // Made By Bilibili
  iqiyi: 'UCqmn-9uFH8gxSMQFJiPGAoQ',        // iQIYI Anime
  youku: 'UCBsV2O_B2nBBPSjkjECZmOA',        // YOUKU Animation
};

const SCRAPER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
};

// Words that identify a video is NOT a full episode
const TRAILER_KEYWORDS = ['trailer', 'teaser', 'preview', 'pv', 'opening', 'ending', 'ost', 'promo', 'mv ', 'music video', 'short clip', 'clip '];

// ═══════════════════════════════════════
// AniList Helper
// ═══════════════════════════════════════
const anilistQuery = async (query, variables = {}) => {
  const { data } = await axios.post(
    ANILIST_URL,
    { query, variables },
    {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 12000,
    }
  );
  return data;
};

const mapAniListAnime = (item) => ({
  id: String(item.id),
  mal_id: item.idMal || item.id,
  title: item.title?.english || item.title?.romaji || item.title?.native,
  title_english: item.title?.english || item.title?.romaji,
  title_native: item.title?.native,
  image: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium,
  score: item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : null,
  episodes: item.episodes,
  status: item.status === 'RELEASING' ? 'Ongoing' : item.status === 'FINISHED' ? 'Completed' : item.status,
  synopsis: item.description ? item.description.replace(/<[^>]*>/g, '') : '',
  genres: item.genres || [],
  year: item.startDate?.year,
  season: item.season,
  type: item.format,
  studio: item.studios?.nodes?.[0]?.name || null,
  countryOfOrigin: item.countryOfOrigin,
});

// ═══════════════════════════════════════
// TRENDING / POPULAR / SEARCH (AniList)
// ═══════════════════════════════════════

const MEDIA_FIELDS = `
  id idMal
  title { romaji english native }
  coverImage { extraLarge large medium }
  averageScore episodes status genres
  startDate { year } season format description
  countryOfOrigin
  studios(isMain: true) { nodes { name } }
`;

const getTrending = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const data = await anilistQuery(
      `query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, countryOfOrigin: "CN", sort: [TRENDING_DESC, POPULARITY_DESC]) { ${MEDIA_FIELDS} }
        }
      }`,
      { page, perPage: 24 }
    );
    res.json({ success: true, results: (data?.data?.Page?.media || []).map(mapAniListAnime) });
  } catch (e) {
    console.error('Trending error:', e.message);
    res.status(500).json({ success: false, message: 'Failed to fetch trending donghua' });
  }
};

const getPopular = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const data = await anilistQuery(
      `query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, countryOfOrigin: "CN", sort: [POPULARITY_DESC, SCORE_DESC]) { ${MEDIA_FIELDS} }
        }
      }`,
      { page, perPage: 24 }
    );
    res.json({ success: true, results: (data?.data?.Page?.media || []).map(mapAniListAnime) });
  } catch (e) {
    console.error('Popular error:', e.message);
    res.status(500).json({ success: false, message: 'Failed to fetch popular donghua' });
  }
};

const searchAnime = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, results: [] });
    const data = await anilistQuery(
      `query ($search: String) {
        Page(page: 1, perPage: 24) {
          media(type: ANIME, countryOfOrigin: "CN", search: $search, sort: [SEARCH_MATCH]) { ${MEDIA_FIELDS} }
        }
      }`,
      { search: q }
    );
    res.json({ success: true, results: (data?.data?.Page?.media || []).map(mapAniListAnime) });
  } catch (e) {
    console.error('Search error:', e.message);
    res.status(500).json({ success: false, message: 'Donghua search failed' });
  }
};

// ═══════════════════════════════════════
// HELPER — slug & title variants
// ═══════════════════════════════════════
const toSlug = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const titleVariants = (title) => {
  const base = [title];
  // Remove common suffixes
  const noSeason = title.replace(/\s*(season\s*\d+|s\d+|part\s*\d+|\d+(?:st|nd|rd|th)\s*season)/gi, '').trim();
  if (noSeason !== title) base.push(noSeason);
  // Short version (first 3 words)
  const words = title.split(' ');
  if (words.length > 3) base.push(words.slice(0, 3).join(' '));
  return [...new Set(base)];
};

// ═══════════════════════════════════════
// SCRAPER 1 — AnimeFLV / Zoro / AnimeKhor style sites
// Target: sites that actually host full-episode donghua
// ═══════════════════════════════════════

/**
 * Scrape episode list from AnimeKhor (dedicated Chinese anime site)
 */
const scrapeAnimeKhor = async (title) => {
  try {
    for (const variant of titleVariants(title)) {
      const slug = toSlug(variant);
      const searchUrl = `https://animekhor.xyz/?s=${encodeURIComponent(variant)}`;
      console.log(`[AnimeKhor] Searching: "${variant}"`);

      const searchRes = await axios.get(searchUrl, { headers: SCRAPER_HEADERS, timeout: 8000 });
      const $ = cheerio.load(searchRes.data);

      let seriesUrl = null;
      $('article a[href], .result-item a[href], h2 a[href], .title a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('animekhor') && !href.includes('page') && !seriesUrl) {
          seriesUrl = href;
        }
      });

      if (!seriesUrl) {
        // Try direct URL guess
        const directUrl = `https://animekhor.xyz/${slug}/`;
        try {
          const testRes = await axios.head(directUrl, { headers: SCRAPER_HEADERS, timeout: 4000 });
          if (testRes.status === 200) seriesUrl = directUrl;
        } catch (_) {}
      }

      if (seriesUrl) {
        console.log(`[AnimeKhor] Found series: ${seriesUrl}`);
        const pageRes = await axios.get(seriesUrl, { headers: SCRAPER_HEADERS, timeout: 8000 });
        const $p = cheerio.load(pageRes.data);
        const episodes = [];

        // AnimeKhor uses episode list with links
        $p('a[href*="episode"], a[href*="-ep-"], .episodios a, #episodes_list a, .epcurrent a, li a[href*="animekhor"]').each((i, el) => {
          const href = $p(el).attr('href');
          if (!href) return;
          const epMatch = href.match(/episode[-_]?(\d+)/i) || $p(el).text().match(/(\d+)/);
          const epNum = epMatch ? parseInt(epMatch[1], 10) : (i + 1);
          const id = `animekhor:${href}`;
          if (!episodes.some((e) => e.id === id)) {
            episodes.push({ id, number: epNum, url: `/watch/animekhor:${encodeURIComponent(href)}` });
          }
        });

        if (episodes.length > 0) {
          episodes.sort((a, b) => a.number - b.number);
          console.log(`[AnimeKhor] Found ${episodes.length} episodes.`);
          return episodes;
        }
      }
    }
  } catch (e) {
    console.warn('[AnimeKhor] Failed:', e.message);
  }
  return [];
};

/**
 * Scrape episode list from LuciferDonghua
 */
const scrapeLuciferDonghua = async (title) => {
  try {
    for (const variant of titleVariants(title)) {
      const slug = toSlug(variant);
      const urls = [
        `https://luciferdonghua.in/anime/${slug}/`,
        `https://luciferdonghua.in/anime/${slug}-sub/`,
      ];

      for (const url of urls) {
        try {
          console.log(`[LuciferDonghua] Trying: ${url}`);
          const res = await axios.get(url, { headers: SCRAPER_HEADERS, timeout: 8000 });
          const $ = cheerio.load(res.data);
          const episodes = [];

          // LuciferDonghua episode list selectors
          $('.eplister ul li a, .listing-chapters_wrap a, .episodelist a, li.slide-up a').each((i, el) => {
            const href = $(el).attr('href');
            if (!href) return;
            const numText = $(el).find('.epl-num').text().trim() || $(el).text().trim();
            const epNum = parseInt(numText.match(/\d+/)?.[0] || (i + 1), 10);
            const id = `lucifer:${href}`;
            if (!episodes.some((e) => e.id === id)) {
              episodes.push({ id, number: epNum, url: `/watch/lucifer:${encodeURIComponent(href)}` });
            }
          });

          if (episodes.length > 0) {
            episodes.sort((a, b) => a.number - b.number);
            console.log(`[LuciferDonghua] Found ${episodes.length} episodes.`);
            return episodes;
          }
        } catch (_) {}
      }

      // Search fallback
      try {
        const searchRes = await axios.get(`https://luciferdonghua.in/?s=${encodeURIComponent(variant)}`, {
          headers: SCRAPER_HEADERS,
          timeout: 8000,
        });
        const $s = cheerio.load(searchRes.data);
        let found = null;
        $s('.result-item a, article a, h2 a').each((i, el) => {
          const href = $s(el).attr('href');
          if (href && href.includes('luciferdonghua') && !found) found = href;
        });

        if (found) {
          const pageRes = await axios.get(found, { headers: SCRAPER_HEADERS, timeout: 8000 });
          const $p = cheerio.load(pageRes.data);
          const episodes = [];
          $p('.eplister ul li a, .listing-chapters_wrap a, .episodelist a').each((i, el) => {
            const href = $p(el).attr('href');
            if (!href) return;
            const numText = $p(el).find('.epl-num').text().trim() || $p(el).text().trim();
            const epNum = parseInt(numText.match(/\d+/)?.[0] || (i + 1), 10);
            const id = `lucifer:${href}`;
            if (!episodes.some((e) => e.id === id)) {
              episodes.push({ id, number: epNum, url: `/watch/lucifer:${encodeURIComponent(href)}` });
            }
          });
          if (episodes.length > 0) {
            episodes.sort((a, b) => a.number - b.number);
            console.log(`[LuciferDonghua] Found ${episodes.length} via search.`);
            return episodes;
          }
        }
      } catch (_) {}
    }
  } catch (e) {
    console.warn('[LuciferDonghua] Failed:', e.message);
  }
  return [];
};

/**
 * Scrape episode list from MisterDonghua
 */
const scrapeMisterDonghua = async (title) => {
  try {
    for (const variant of titleVariants(title)) {
      const slug = toSlug(variant);
      const urls = [
        `https://www.misterdonghua.com/anime/${slug}/`,
        `https://www.misterdonghua.com/anime/${slug}-sub/`,
        `https://www.misterdonghua.com/${slug}/`,
      ];

      for (const url of urls) {
        try {
          console.log(`[MisterDonghua] Trying: ${url}`);
          const res = await axios.get(url, { headers: SCRAPER_HEADERS, timeout: 8000 });
          const $ = cheerio.load(res.data);
          const episodes = [];

          $('.eplister ul li a, .listing-chapters_wrap a, .episodelist a, li a[href*="episode"]').each((i, el) => {
            const href = $(el).attr('href');
            if (!href) return;
            const numText = $(el).find('.epl-num').text().trim() || $(el).text().trim();
            const epNum = parseInt(numText.match(/\d+/)?.[0] || (i + 1), 10);
            const id = `misterdonghua:${href}`;
            if (!episodes.some((e) => e.id === id)) {
              episodes.push({ id, number: epNum, url: `/watch/misterdonghua:${encodeURIComponent(href)}` });
            }
          });

          if (episodes.length > 0) {
            episodes.sort((a, b) => a.number - b.number);
            console.log(`[MisterDonghua] Found ${episodes.length} episodes.`);
            return episodes;
          }
        } catch (_) {}
      }
    }
  } catch (e) {
    console.warn('[MisterDonghua] Failed:', e.message);
  }
  return [];
};

// ═══════════════════════════════════════
// SCRAPER 2 — Dailymotion FULL EPISODES
// Strict filtering: must contain episode number, not a trailer
// ═══════════════════════════════════════
const getDailymotionFullEpisodes = async (title, totalEps = 12) => {
  const episodes = [];
  try {
    console.log(`[Dailymotion] Building episode list for "${title}" (${totalEps} eps)`);

    for (let epNum = 1; epNum <= Math.min(totalEps, 60); epNum++) {
      const queries = [
        `"${title}" "episode ${epNum}" full`,
        `${title} ep ${epNum} full english sub`,
        `${title} episode ${epNum} english`,
      ];

      let found = false;
      for (const q of queries) {
        if (found) break;
        try {
          const { data } = await axios.get('https://api.dailymotion.com/videos', {
            params: { fields: 'id,title,duration', search: q, limit: 5, sort: 'relevance' },
            timeout: 5000,
          });

          const list = (data?.list || []).filter((v) => {
            const t = (v.title || '').toLowerCase();
            // Must have episode number in title
            const hasEpNum = t.includes(`episode ${epNum}`) || t.includes(`ep ${epNum}`) || t.includes(`ep.${epNum}`) || t.includes(` ${epNum} `);
            // Must NOT be a trailer
            const isTrailer = TRAILER_KEYWORDS.some((kw) => t.includes(kw));
            // Must be long enough (full ep ≥ 10 min = 600s)
            const isLongEnough = !v.duration || v.duration >= 600;
            return hasEpNum && !isTrailer && isLongEnough;
          });

          if (list.length > 0) {
            const best = list[0];
            const dmSlug = `dm-${best.id}-ep${epNum}`;
            episodes.push({
              id: `dailymotion:${dmSlug}`,
              number: epNum,
              dmVideoId: best.id,
              url: `/watch/dailymotion:${dmSlug}`,
            });
            found = true;
            console.log(`[Dailymotion] Ep ${epNum}: "${best.title}" (${best.id})`);
          }
        } catch (_) {}
      }

      if (!found) {
        // Still add placeholder so episode shows in list
        const slug = toSlug(title);
        episodes.push({
          id: `dailymotion:search-${slug}-episode-${epNum}`,
          number: epNum,
          url: `/watch/dailymotion:search-${slug}-episode-${epNum}`,
        });
      }
    }
  } catch (e) {
    console.warn('[Dailymotion] Episode build failed:', e.message);
  }
  return episodes;
};

// ═══════════════════════════════════════
// STREAM RESOLVERS
// ═══════════════════════════════════════

/**
 * Resolve stream from AnimeKhor watch page
 */
const resolveAnimeKhorStream = async (watchUrl) => {
  try {
    const decodedUrl = decodeURIComponent(watchUrl);
    console.log(`[AnimeKhor] Resolving stream: ${decodedUrl}`);
    const res = await axios.get(decodedUrl, { headers: SCRAPER_HEADERS, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const sources = [];

    // iframes
    $('iframe[src], .player-embed iframe, #player iframe').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.length > 10 && !TRAILER_KEYWORDS.some((kw) => src.toLowerCase().includes(kw))) {
        sources.push({ url: src, quality: `Server ${i + 1}`, isM3U8: src.includes('.m3u8') });
      }
    });

    // Plyr / JW Player source data
    const html = res.data;
    const fileMatches = html.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/gi) || [];
    for (const m of fileMatches) {
      const url = m.match(/["']([^"']+)["']/)?.[1];
      if (url && !sources.some((s) => s.url === url)) {
        sources.push({ url, quality: 'HLS Stream', isM3U8: true });
      }
    }

    // Data attributes
    $('[data-src], [data-file], [data-video-src]').each((i, el) => {
      const src = $(el).attr('data-src') || $(el).attr('data-file') || $(el).attr('data-video-src');
      if (src && src.startsWith('http') && !sources.some((s) => s.url === src)) {
        sources.push({ url: src, quality: 'Data Source', isM3U8: src.includes('.m3u8') });
      }
    });

    if (sources.length > 0) {
      console.log(`[AnimeKhor] Resolved ${sources.length} sources.`);
      return { success: true, videoUrl: sources[0].url, isM3U8: sources[0].isM3U8, quality: sources[0].quality, sources, headers: {} };
    }
  } catch (e) {
    console.warn('[AnimeKhor] Stream resolve failed:', e.message);
  }
  return null;
};

/**
 * Resolve stream from LuciferDonghua watch page
 */
const resolveLuciferStream = async (watchUrl) => {
  try {
    const decodedUrl = decodeURIComponent(watchUrl);
    console.log(`[LuciferDonghua] Resolving stream: ${decodedUrl}`);
    const res = await axios.get(decodedUrl, { headers: SCRAPER_HEADERS, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const sources = [];

    // Look for video embeds
    $('iframe[src], .player iframe, #player iframe, .video-player iframe').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.length > 10) {
        sources.push({ url: src, quality: `Mirror ${i + 1}`, isM3U8: src.includes('.m3u8') });
      }
    });

    // Extract HLS from page source
    const html = res.data;
    const m3u8Matches = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g) || [];
    for (const url of m3u8Matches) {
      if (!sources.some((s) => s.url === url)) {
        sources.push({ url, quality: 'HLS', isM3U8: true });
      }
    }

    // Server selection buttons often have data-embed
    $('.server-item, .mirror-opt, [data-embed], [data-value]').each((i, el) => {
      const val = $(el).attr('data-embed') || $(el).attr('data-value') || $(el).attr('data-src');
      if (val) {
        try {
          const decoded = Buffer.from(val, 'base64').toString('utf8');
          const match = decoded.match(/src=["']([^"']+)["']/i) || decoded.match(/https?:\/\/[^\s"']+/);
          const url = match?.[1] || match?.[0];
          if (url && !sources.some((s) => s.url === url)) {
            sources.push({ url, quality: `Server ${i + 1}`, isM3U8: url.includes('.m3u8') });
          }
        } catch (_) {}
      }
    });

    if (sources.length > 0) {
      console.log(`[LuciferDonghua] Resolved ${sources.length} sources.`);
      return { success: true, videoUrl: sources[0].url, isM3U8: sources[0].isM3U8, quality: sources[0].quality, sources, headers: {} };
    }
  } catch (e) {
    console.warn('[LuciferDonghua] Stream resolve failed:', e.message);
  }
  return null;
};

/**
 * Resolve stream from MisterDonghua watch page
 */
const resolveMisterDonghuaStream = async (watchUrl) => {
  try {
    const decodedUrl = decodeURIComponent(watchUrl);
    console.log(`[MisterDonghua] Resolving stream: ${decodedUrl}`);
    const res = await axios.get(decodedUrl, { headers: SCRAPER_HEADERS, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const sources = [];

    $('iframe[src], .player iframe, video source[src]').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.length > 10) {
        sources.push({ url: src, quality: `Source ${i + 1}`, isM3U8: src.includes('.m3u8') });
      }
    });

    const html = res.data;
    const m3u8Matches = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g) || [];
    for (const url of m3u8Matches) {
      if (!sources.some((s) => s.url === url)) sources.push({ url, quality: 'HLS', isM3U8: true });
    }

    if (sources.length > 0) {
      console.log(`[MisterDonghua] Resolved ${sources.length} sources.`);
      return { success: true, videoUrl: sources[0].url, isM3U8: sources[0].isM3U8, quality: sources[0].quality, sources, headers: {} };
    }
  } catch (e) {
    console.warn('[MisterDonghua] Stream resolve failed:', e.message);
  }
  return null;
};

/**
 * Dailymotion stream — direct video ID or strict full-episode search
 */
const resolveDailymotionStream = async (targetId) => {
  try {
    // Pattern: "dm-{videoId}-ep{N}" → direct embed
    const directMatch = targetId.match(/^dm-([a-z0-9]+)-ep\d+$/i);
    if (directMatch) {
      const embedUrl = `https://www.dailymotion.com/embed/video/${directMatch[1]}?autoplay=1`;
      return { success: true, videoUrl: embedUrl, isM3U8: false, quality: 'Dailymotion HD', sources: [{ url: embedUrl, quality: 'Dailymotion', isM3U8: false }], headers: {} };
    }

    // Parse episode info from slug
    const { animeName, episodeNum } = parseEpisodeInfo(targetId);
    const queries = [
      `"${animeName}" "episode ${episodeNum}" english sub full`,
      `${animeName} ep ${episodeNum} english subbed`,
      `${animeName} episode ${episodeNum} donghua`,
    ];

    for (const q of queries) {
      try {
        const { data } = await axios.get('https://api.dailymotion.com/videos', {
          params: { fields: 'id,title,duration', search: q, limit: 10, sort: 'relevance' },
          timeout: 6000,
        });

        const list = (data?.list || []).filter((v) => {
          const t = (v.title || '').toLowerCase();
          const hasEpNum = t.includes(episodeNum) || t.includes(`ep ${episodeNum}`) || t.includes(`ep.${episodeNum}`) || t.includes(`episode ${episodeNum}`);
          const isTrailer = TRAILER_KEYWORDS.some((kw) => t.includes(kw));
          // Duration at least 10 minutes for a full episode
          const isLongEnough = !v.duration || v.duration >= 600;
          return hasEpNum && !isTrailer && isLongEnough;
        });

        if (list.length > 0) {
          const best = list[0];
          const embedUrl = `https://www.dailymotion.com/embed/video/${best.id}?autoplay=1`;
          console.log(`[Dailymotion] ✅ Full episode found: "${best.title}" (${best.duration}s)`);
          return { success: true, videoUrl: embedUrl, isM3U8: false, quality: 'Dailymotion', sources: [{ url: embedUrl, quality: 'Dailymotion Full Episode', isM3U8: false }], headers: {} };
        }
      } catch (_) {}
    }
  } catch (e) {
    console.warn('[Dailymotion] Stream resolve failed:', e.message);
  }
  return null;
};

// ═══════════════════════════════════════
// PARSE EPISODE INFO FROM SLUG
// ═══════════════════════════════════════
const parseEpisodeInfo = (id) => {
  let episodeNum = '1';
  let animeName = id.replace(/-/g, ' ');

  const match = id.match(/(?:episode|ep)[-_]?(\d+)/i);
  if (match) {
    episodeNum = match[1];
    const index = id.toLowerCase().indexOf(match[0]);
    animeName = id.substring(0, index).replace(/-/g, ' ').trim();
  } else {
    const parts = id.replace(/-(sub|dub|english|eng|raw|cn|chinese)/gi, '').split('-');
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) {
      episodeNum = last;
      animeName = parts.slice(0, -1).join(' ');
    }
  }

  animeName = animeName.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return { animeName, episodeNum };
};

// ═══════════════════════════════════════
// GET ANIME INFO + EPISODES
// ═══════════════════════════════════════
const getAnimeInfo = async (req, res) => {
  try {
    const { animeId } = req.params;
    let resolvedId = animeId.includes(':') ? animeId.split(':').pop() : animeId;

    let item = null;

    if (/^\d+$/.test(resolvedId)) {
      const data = await anilistQuery(
        `query ($id: Int) { Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} } }`,
        { id: parseInt(resolvedId, 10) }
      );
      item = data?.data?.Media;
    } else {
      const cleanTitle = resolvedId.replace(/-/g, ' ');
      const data = await anilistQuery(
        `query ($search: String) {
          Page(page: 1, perPage: 1) {
            media(type: ANIME, search: $search, countryOfOrigin: "CN") { ${MEDIA_FIELDS} }
          }
        }`,
        { search: cleanTitle }
      );
      item = data?.data?.Page?.media?.[0];
    }

    if (!item) return res.status(404).json({ success: false, message: 'Donghua not found' });

    const mapped = mapAniListAnime(item);
    const mainTitle = mapped.title;
    const romajiTitle = item.title?.romaji;
    const totalEps = mapped.episodes || 12;
    let episodes = [];

    // ── Tier 1: AnimeKhor ──────────────────────────────────────
    console.log(`[Info] Tier 1: Scraping AnimeKhor for "${mainTitle}"`);
    episodes = await scrapeAnimeKhor(mainTitle);
    if (episodes.length === 0 && romajiTitle && romajiTitle !== mainTitle) {
      episodes = await scrapeAnimeKhor(romajiTitle);
    }

    // ── Tier 2: LuciferDonghua ─────────────────────────────────
    if (episodes.length === 0) {
      console.log(`[Info] Tier 2: Scraping LuciferDonghua for "${mainTitle}"`);
      episodes = await scrapeLuciferDonghua(mainTitle);
      if (episodes.length === 0 && romajiTitle && romajiTitle !== mainTitle) {
        episodes = await scrapeLuciferDonghua(romajiTitle);
      }
    }

    // ── Tier 3: MisterDonghua ──────────────────────────────────
    if (episodes.length === 0) {
      console.log(`[Info] Tier 3: Scraping MisterDonghua for "${mainTitle}"`);
      episodes = await scrapeMisterDonghua(mainTitle);
    }

    // ── Tier 4: Dailymotion FULL EPISODE list ─────────────────
    if (episodes.length === 0) {
      console.log(`[Info] Tier 4: Building Dailymotion episode list for "${mainTitle}" (${totalEps} eps)`);
      episodes = await getDailymotionFullEpisodes(mainTitle, totalEps);
    }

    // ── Tier 5: Numeric fallback (Dailymotion search-per-watch) ─
    if (episodes.length === 0) {
      const slug = toSlug(mainTitle);
      for (let i = 1; i <= totalEps; i++) {
        episodes.push({ id: `dailymotion:search-${slug}-episode-${i}`, number: i, url: `/watch/dailymotion:search-${slug}-episode-${i}` });
      }
      console.log(`[Info] Tier 5: Generated ${episodes.length} placeholder episodes.`);
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
// GET WATCH / STREAM URL
// ═══════════════════════════════════════
const getWatchUrl = async (req, res) => {
  try {
    let episodeId = req.params[0] || req.params.episodeId || req.url.split('/watch/')[1];
    episodeId = decodeURIComponent(episodeId);

    let provider = 'dailymotion';
    let targetId = episodeId;

    if (episodeId.includes(':')) {
      const colonIdx = episodeId.indexOf(':');
      provider = episodeId.substring(0, colonIdx);
      targetId = episodeId.substring(colonIdx + 1);
    }

    console.log(`[Watch] Provider: "${provider}", Target: "${targetId}"`);

    // ── AnimeKhor ──────────────────────────────────────────────
    if (provider === 'animekhor') {
      const stream = await resolveAnimeKhorStream(targetId);
      if (stream) return res.json(stream);
    }

    // ── LuciferDonghua ─────────────────────────────────────────
    if (provider === 'lucifer') {
      const stream = await resolveLuciferStream(targetId);
      if (stream) return res.json(stream);
    }

    // ── MisterDonghua ──────────────────────────────────────────
    if (provider === 'misterdonghua') {
      const stream = await resolveMisterDonghuaStream(targetId);
      if (stream) return res.json(stream);
    }

    // ── Dailymotion ────────────────────────────────────────────
    if (provider === 'dailymotion') {
      const stream = await resolveDailymotionStream(targetId);
      if (stream) return res.json(stream);
    }

    // ── YouTube embed (direct video ID) ───────────────────────
    if (provider === 'youtube') {
      const embedUrl = `https://www.youtube.com/embed/${targetId}?autoplay=1`;
      return res.json({ success: true, videoUrl: embedUrl, isM3U8: false, quality: 'YouTube Official', sources: [{ url: embedUrl, quality: 'YouTube', isM3U8: false }], headers: {} });
    }

    // ═══════════════════════════════════════════════════════════
    // AUTO-HEALING CHAIN — try every source in order
    // ═══════════════════════════════════════════════════════════
    console.log(`[Auto-Heal] Primary provider "${provider}" failed. Trying fallback chain...`);

    // 1. AnimeKhor
    try {
      const stream = await resolveAnimeKhorStream(targetId);
      if (stream) { console.log('[Auto-Heal] ✅ AnimeKhor'); return res.json(stream); }
    } catch (_) {}

    // 2. LuciferDonghua
    try {
      const stream = await resolveLuciferStream(targetId);
      if (stream) { console.log('[Auto-Heal] ✅ LuciferDonghua'); return res.json(stream); }
    } catch (_) {}

    // 3. MisterDonghua
    try {
      const stream = await resolveMisterDonghuaStream(targetId);
      if (stream) { console.log('[Auto-Heal] ✅ MisterDonghua'); return res.json(stream); }
    } catch (_) {}

    // 4. Dailymotion (full episode strict search)
    try {
      const stream = await resolveDailymotionStream(targetId);
      if (stream) { console.log('[Auto-Heal] ✅ Dailymotion'); return res.json(stream); }
    } catch (_) {}

    return res.status(404).json({
      success: false,
      message: 'No full episode stream found. Try a different server or check back later!',
    });
  } catch (error) {
    console.error('Watch error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch stream URL' });
  }
};

module.exports = { getTrending, getPopular, searchAnime, getAnimeInfo, getWatchUrl };
