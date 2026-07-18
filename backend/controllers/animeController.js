const axios = require('axios');
const cheerio = require('cheerio');

// ═══════════════════════════════════════
// AniList GraphQL API — Chinese Donghua
// ═══════════════════════════════════════
const ANILIST_URL = 'https://graphql.anilist.co';

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

const AD_KEYWORDS = [
  'adsystem', 'adserver', 'adsense', 'doubleclick', 'googleads', 'popads', 
  'onclickads', 'exoclick', 'adsterra', 'propellerads', 'adsco.re', 'plugrush', 
  'adfly', 'bc.game', 'bcgame', 'casino', 'betting', 'slot', 'gamble', 'affiliate',
  'banner', 'sponsor', 'analytics', 'histats', 'clickunder', 'popunder', 'traffic',
  'a-ads', 'crypto', 'juicyads', 'ero-advertising', 'adbtc', 'coinpayu', 'adport', 
  'exdynsrv', 'exosrv', 'ad-maven', 'onclickperformance', 'adsterra'
];

const isAdUrl = (url) => {
  if (!url) return true;
  const u = url.toLowerCase();
  return AD_KEYWORDS.some(kw => u.includes(kw));
};

// ═══════════════════════════════════════
// URL-Safe Base64 Helpers for routing safety
// ═══════════════════════════════════════
const encodeId = (provider, url) => {
  const base64 = Buffer.from(url).toString('base64');
  const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${provider}:${urlSafe}`;
};

const decodeId = (encoded) => {
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf8');
  } catch (_) {
    return '';
  }
};

const isBase64Url = (str) => {
  try {
    const decoded = decodeId(str);
    return decoded.startsWith('http://') || decoded.startsWith('https://');
  } catch (_) {
    return false;
  }
};

const isValidEpisodeUrl = (href) => {
  if (!href) return false;
  const h = href.toLowerCase();
  
  // Exclude static/info pages
  const excludes = [
    '/a-z-lists', '/contact', '/dmca', '/privacy', '/terms', 
    '/genre', '/category', '/tag', '/year', '/season', 
    'wp-content', 'wp-includes', '/author/', '/page/', '?show='
  ];
  if (excludes.some(ex => h.includes(ex))) return false;

  // Must have episode identifiers
  const hasEpWord = h.includes('episode') || h.includes('-ep-') || h.includes('_ep_') || /\/ep[-_]?\d+/i.test(h) || h.match(/-ep\d+/i);
  return !!hasEpWord;
};

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
  const noSeason = title.replace(/\s*(season\s*\d+|s\d+|part\s*\d+|\d+(?:st|nd|rd|th)\s*season)/gi, '').trim();
  if (noSeason !== title) base.push(noSeason);
  const words = title.split(' ');
  if (words.length > 3) base.push(words.slice(0, 3).join(' '));
  return [...new Set(base)].map(v => v.replace(/[:,\-–]+$/, '').trim()).filter(Boolean);
};

const raceScrapers = (promises) => {
  return new Promise((resolve) => {
    let finishedCount = 0;
    let resolved = false;

    if (!promises || promises.length === 0) {
      return resolve([]);
    }

    promises.forEach((p) => {
      p.then((res) => {
        if (resolved) return;
        if (res && res.length > 0) {
          resolved = true;
          resolve(res);
        } else {
          finishedCount++;
          if (finishedCount === promises.length) {
            resolve([]);
          }
        }
      }).catch(() => {
        if (resolved) return;
        finishedCount++;
        if (finishedCount === promises.length) {
          resolve([]);
        }
      });
    });
  });
};

// ═══════════════════════════════════════
// SCRAPERS — AnimeKhor, Lucifer, MisterDonghua
// ═══════════════════════════════════════

const scrapeAnimeKhor = async (title) => {
  try {
    for (const variant of titleVariants(title)) {
      const slug = toSlug(variant);
      const searchUrl = `https://animekhor.xyz/?s=${encodeURIComponent(variant)}`;
      console.log(`[AnimeKhor] Searching: "${variant}"`);

      const searchRes = await axios.get(searchUrl, { headers: SCRAPER_HEADERS, timeout: 3000 });
      const $ = cheerio.load(searchRes.data);

      let seriesUrl = null;
      $('article a[href], .result-item a[href], h2 a[href], .title a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('animekhor') && !href.includes('page') && !seriesUrl) {
          seriesUrl = href;
        }
      });

      if (!seriesUrl) {
        const directUrl = `https://animekhor.xyz/${slug}/`;
        try {
          const testRes = await axios.head(directUrl, { headers: SCRAPER_HEADERS, timeout: 2000 });
          if (testRes.status === 200) seriesUrl = directUrl;
        } catch (_) {}
      }

      if (seriesUrl) {
        console.log(`[AnimeKhor] Found series: ${seriesUrl}`);
        const pageRes = await axios.get(seriesUrl, { headers: SCRAPER_HEADERS, timeout: 3000 });
        const $p = cheerio.load(pageRes.data);
        const episodes = [];

        $p('a[href], .episodios a, #episodes_list a, .epcurrent a').each((i, el) => {
          let href = $p(el).attr('href');
          if (!isValidEpisodeUrl(href)) return;
          if (href && !href.startsWith('http')) {
            href = new URL(href, seriesUrl).href;
          }
          const epMatch = href.match(/episode[-_]?(\d+)/i) || $p(el).text().match(/(\d+)/);
          const epNum = epMatch ? parseInt(epMatch[1], 10) : (i + 1);
          const id = encodeId('animekhor', href);
          if (!episodes.some((e) => e.number === epNum)) {
            episodes.push({ id, number: epNum, url: `/watch/${encodeURIComponent(id)}` });
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
          const res = await axios.get(url, { headers: SCRAPER_HEADERS, timeout: 3000 });
          const $ = cheerio.load(res.data);
          const episodes = [];

          $('.eplister ul li a, .listing-chapters_wrap a, .episodelist a, li.slide-up a').each((i, el) => {
            let href = $(el).attr('href');
            if (!isValidEpisodeUrl(href)) return;
            if (href && !href.startsWith('http')) {
              href = new URL(href, url).href;
            }
            const numText = $(el).find('.epl-num').text().trim() || $(el).text().trim();
            const epNum = parseInt(numText.match(/\d+/)?.[0] || (i + 1), 10);
            const id = encodeId('lucifer', href);
            if (!episodes.some((e) => e.number === epNum)) {
              episodes.push({ id, number: epNum, url: `/watch/${encodeURIComponent(id)}` });
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
          timeout: 3000,
        });
        const $s = cheerio.load(searchRes.data);
        let found = null;
        $s('.result-item a, article a, h2 a').each((i, el) => {
          const href = $s(el).attr('href');
          if (href && href.includes('luciferdonghua') && !found) found = href;
        });

        if (found) {
          const pageRes = await axios.get(found, { headers: SCRAPER_HEADERS, timeout: 3000 });
          const $p = cheerio.load(pageRes.data);
          const episodes = [];
          $p('.eplister ul li a, .listing-chapters_wrap a, .episodelist a').each((i, el) => {
            let href = $p(el).attr('href');
            if (!isValidEpisodeUrl(href)) return;
            if (href && !href.startsWith('http')) {
              href = new URL(href, found).href;
            }
            const numText = $p(el).find('.epl-num').text().trim() || $p(el).text().trim();
            const epNum = parseInt(numText.match(/\d+/)?.[0] || (i + 1), 10);
            const id = encodeId('lucifer', href);
            if (!episodes.some((e) => e.number === epNum)) {
              episodes.push({ id, number: epNum, url: `/watch/${encodeURIComponent(id)}` });
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
          const res = await axios.get(url, { headers: SCRAPER_HEADERS, timeout: 3000 });
          const $ = cheerio.load(res.data);
          const episodes = [];

          $('.eplister ul li a, .listing-chapters_wrap a, .episodelist a, li a[href*="episode"]').each((i, el) => {
            let href = $(el).attr('href');
            if (!isValidEpisodeUrl(href)) return;
            if (href && !href.startsWith('http')) {
              href = new URL(href, url).href;
            }
            const numText = $(el).find('.epl-num').text().trim() || $(el).text().trim();
            const epNum = parseInt(numText.match(/\d+/)?.[0] || (i + 1), 10);
            const id = encodeId('misterdonghua', href);
            if (!episodes.some((e) => e.number === epNum)) {
              episodes.push({ id, number: epNum, url: `/watch/${encodeURIComponent(id)}` });
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
// Dailymotion Full Episode List Builder
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
            const hasEpNum = t.includes(`episode ${epNum}`) || t.includes(`ep ${epNum}`) || t.includes(`ep.${epNum}`) || t.includes(` ${epNum} `);
            const isTrailer = TRAILER_KEYWORDS.some((kw) => t.includes(kw));
            const isLongEnough = !v.duration || v.duration >= 600;
            return hasEpNum && !isTrailer && isLongEnough;
          });

          if (list.length > 0) {
            const best = list[0];
            const dmSlug = `dm-${best.id}-ep${epNum}`;
            const id = `dailymotion:${dmSlug}`;
            episodes.push({
              id,
              number: epNum,
              dmVideoId: best.id,
              url: `/watch/${encodeURIComponent(id)}`,
            });
            found = true;
          }
        } catch (_) {}
      }

      if (!found) {
        const slug = toSlug(title);
        const id = `dailymotion:search-${slug}-episode-${epNum}`;
        episodes.push({
          id,
          number: epNum,
          url: `/watch/${encodeURIComponent(id)}`,
        });
      }
    }
  } catch (e) {
    console.warn('[Dailymotion] Episode build failed:', e.message);
  }
  return episodes;
};

// ═══════════════════════════════════════
// DYNAMIC EPISODE RESOLVER ON FALLBACK
// ═══════════════════════════════════════
const searchAndGetEpisodeUrl = async (provider, animeTitle, episodeNum) => {
  try {
    console.log(`[Dynamic Search] Finding Ep ${episodeNum} for "${animeTitle}" on ${provider}`);
    let eps = [];
    if (provider === 'animekhor') eps = await scrapeAnimeKhor(animeTitle);
    if (provider === 'lucifer') eps = await scrapeLuciferDonghua(animeTitle);
    if (provider === 'misterdonghua') eps = await scrapeMisterDonghua(animeTitle);

    const match = eps.find((e) => e.number === Number(episodeNum));
    if (match) {
      const colonIdx = match.id.indexOf(':');
      const url = decodeId(match.id.substring(colonIdx + 1));
      console.log(`[Dynamic Search] Found URL: ${url}`);
      return url;
    }
  } catch (e) {
    console.warn('[Dynamic Search] Failed:', e.message);
  }
  return null;
};

// ═══════════════════════════════════════
// STREAM RESOLVERS
// ═══════════════════════════════════════

const resolveAnimeKhorStream = async (watchUrl) => {
  try {
    console.log(`[AnimeKhor] Resolving stream: ${watchUrl}`);
    const res = await axios.get(watchUrl, { headers: SCRAPER_HEADERS, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const sources = [];

    $('iframe[src], .player-embed iframe, #player iframe').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.length > 10 && !isAdUrl(src) && !TRAILER_KEYWORDS.some((kw) => src.toLowerCase().includes(kw))) {
        sources.push({ url: src, quality: `Server ${i + 1}`, isM3U8: src.includes('.m3u8') });
      }
    });

    const html = res.data;
    const fileMatches = html.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/gi) || [];
    for (const m of fileMatches) {
      const url = m.match(/["']([^"']+)["']/)?.[1];
      if (url && !isAdUrl(url) && !sources.some((s) => s.url === url)) {
        sources.push({ url, quality: 'HLS Stream', isM3U8: true });
      }
    }

    if (sources.length > 0) {
      return { success: true, videoUrl: sources[0].url, isM3U8: sources[0].isM3U8, quality: sources[0].quality, sources, headers: {} };
    }
  } catch (e) {
    console.warn('[AnimeKhor] Stream resolve failed:', e.message);
  }
  return null;
};

const resolveLuciferStream = async (watchUrl) => {
  try {
    console.log(`[LuciferDonghua] Resolving stream: ${watchUrl}`);
    const res = await axios.get(watchUrl, { headers: SCRAPER_HEADERS, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const sources = [];

    $('iframe[src], .player iframe, #player iframe, .video-player iframe').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.length > 10 && !isAdUrl(src)) {
        sources.push({ url: src, quality: `Mirror ${i + 1}`, isM3U8: src.includes('.m3u8') });
      }
    });

    const html = res.data;
    const m3u8Matches = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g) || [];
    for (const url of m3u8Matches) {
      if (url && !isAdUrl(url) && !sources.some((s) => s.url === url)) {
        sources.push({ url, quality: 'HLS', isM3U8: true });
      }
    }

    $('.server-item, .mirror-opt, [data-embed], [data-value]').each((i, el) => {
      const val = $(el).attr('data-embed') || $(el).attr('data-value') || $(el).attr('data-src');
      if (val) {
        try {
          const decoded = Buffer.from(val, 'base64').toString('utf8');
          const match = decoded.match(/src=["']([^"']+)["']/i) || decoded.match(/https?:\/\/[^\s"']+/);
          const url = match?.[1] || match?.[0];
          if (url && !isAdUrl(url) && !sources.some((s) => s.url === url)) {
            sources.push({ url, quality: `Server ${i + 1}`, isM3U8: url.includes('.m3u8') });
          }
        } catch (_) {}
      }
    });

    if (sources.length > 0) {
      return { success: true, videoUrl: sources[0].url, isM3U8: sources[0].isM3U8, quality: sources[0].quality, sources, headers: {} };
    }
  } catch (e) {
    console.warn('[LuciferDonghua] Stream resolve failed:', e.message);
  }
  return null;
};

const resolveMisterDonghuaStream = async (watchUrl) => {
  try {
    console.log(`[MisterDonghua] Resolving stream: ${watchUrl}`);
    const res = await axios.get(watchUrl, { headers: SCRAPER_HEADERS, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const sources = [];

    $('iframe[src], .player iframe, video source[src]').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.length > 10 && !isAdUrl(src)) {
        sources.push({ url: src, quality: `Source ${i + 1}`, isM3U8: src.includes('.m3u8') });
      }
    });

    const html = res.data;
    const m3u8Matches = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g) || [];
    for (const url of m3u8Matches) {
      if (url && !isAdUrl(url) && !sources.some((s) => s.url === url)) {
        sources.push({ url, quality: 'HLS', isM3U8: true });
      }
    }

    if (sources.length > 0) {
      return { success: true, videoUrl: sources[0].url, isM3U8: sources[0].isM3U8, quality: sources[0].quality, sources, headers: {} };
    }
  } catch (e) {
    console.warn('[MisterDonghua] Stream resolve failed:', e.message);
  }
  return null;
};

const resolveDailymotionStream = async (targetId) => {
  try {
    const directMatch = targetId.match(/^dm-([a-z0-9]+)-ep\d+$/i);
    if (directMatch) {
      const embedUrl = `https://www.dailymotion.com/embed/video/${directMatch[1]}?autoplay=1`;
      return { success: true, videoUrl: embedUrl, isM3U8: false, quality: 'Dailymotion HD', sources: [{ url: embedUrl, quality: 'Dailymotion', isM3U8: false }], headers: {} };
    }

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
          const isLongEnough = !v.duration || v.duration >= 600;
          return hasEpNum && !isTrailer && isLongEnough;
        });

        if (list.length > 0) {
          const best = list[0];
          const embedUrl = `https://www.dailymotion.com/embed/video/${best.id}?autoplay=1`;
          console.log(`[Dailymotion] ✅ Full episode found: "${best.title}"`);
          return { success: true, videoUrl: embedUrl, isM3U8: false, quality: 'Dailymotion', sources: [{ url: embedUrl, quality: 'Dailymotion Full Episode', isM3U8: false }], headers: {} };
        }
      } catch (_) {}
    }
  } catch (e) {
    console.warn('[Dailymotion] Stream resolve failed:', e.message);
  }
  return null;
};

const parseEpisodeInfo = (id) => {
  let cleanId = id;
  if (isBase64Url(id)) {
    const decodedUrl = decodeId(id);
    const parts = decodedUrl.split('/');
    cleanId = parts.pop() || parts.pop() || '';
  }

  let episodeNum = '1';
  let animeName = cleanId.replace(/-/g, ' ');

  const match = cleanId.match(/(?:episode|ep)[-_]?(\d+)/i);
  if (match) {
    episodeNum = match[1];
    const index = cleanId.toLowerCase().indexOf(match[0]);
    animeName = cleanId.substring(0, index).replace(/-/g, ' ').trim();
  } else {
    const parts = cleanId.replace(/-(sub|subbed|dub|english|eng|raw|cn|chinese)/gi, '').split('-');
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
      let searchTitle = resolvedId.replace(/-/g, ' ');
      if (isBase64Url(resolvedId)) {
        const decodedUrl = decodeId(resolvedId);
        const parts = decodedUrl.split('/');
        const slug = parts.pop() || parts.pop() || '';
        const parsed = parseEpisodeInfo(slug);
        searchTitle = parsed.animeName;
      } else if (resolvedId.startsWith('search-') || resolvedId.startsWith('dm-')) {
        const parsed = parseEpisodeInfo(resolvedId);
        searchTitle = parsed.animeName;
      }

      console.log(`[Info] Searching AniList for: "${searchTitle}"`);
      const data = await anilistQuery(
        `query ($search: String) {
          Page(page: 1, perPage: 1) {
            media(type: ANIME, search: $search, countryOfOrigin: "CN") { ${MEDIA_FIELDS} }
          }
        }`,
        { search: searchTitle }
      );
      item = data?.data?.Page?.media?.[0];
    }

    if (!item) return res.status(404).json({ success: false, message: 'Donghua not found' });

    const mapped = mapAniListAnime(item);
    const mainTitle = mapped.title;
    const romajiTitle = item.title?.romaji;
    const totalEps = mapped.episodes || 12;
    let episodes = [];

    console.log(`[Info] Scraping episodes in parallel for "${mainTitle}"`);
    const scrapePromises = [
      scrapeAnimeKhor(mainTitle).catch(() => []),
      scrapeLuciferDonghua(mainTitle).catch(() => []),
      scrapeMisterDonghua(mainTitle).catch(() => []),
    ];

    if (romajiTitle && romajiTitle !== mainTitle) {
      scrapePromises.push(scrapeAnimeKhor(romajiTitle).catch(() => []));
      scrapePromises.push(scrapeLuciferDonghua(romajiTitle).catch(() => []));
    }

    const results = await raceScrapers(scrapePromises);
    if (results && results.length > 0) {
      episodes = results;
    }

    if (episodes.length === 0) {
      episodes = await getDailymotionFullEpisodes(mainTitle, totalEps);
    }

    if (episodes.length === 0) {
      const slug = toSlug(mainTitle);
      for (let i = 1; i <= totalEps; i++) {
        const id = `dailymotion:search-${slug}-episode-${i}`;
        episodes.push({ id, number: i, url: `/watch/${encodeURIComponent(id)}` });
      }
    }

    // Deduplicate & Re-sequence
    const epMap = new Map();
    for (const ep of episodes) {
      const existing = epMap.get(ep.number);
      if (!existing) {
        epMap.set(ep.number, ep);
      } else {
        const existingIsReal = existing.dmVideoId || (!existing.id.includes('search-') && !existing.id.includes('placeholder'));
        const newIsReal = ep.dmVideoId || (!ep.id.includes('search-') && !ep.id.includes('placeholder'));
        if (newIsReal && !existingIsReal) epMap.set(ep.number, ep);
      }
    }

    let cleanEpisodes = Array.from(epMap.values()).sort((a, b) => a.number - b.number);
    cleanEpisodes = cleanEpisodes.map((ep, idx) => ({ ...ep, number: idx + 1 }));

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
        totalEpisodes: mapped.episodes || cleanEpisodes.length,
        score: mapped.score,
        year: mapped.year,
        season: mapped.season,
        type: mapped.type,
        studio: mapped.studio,
        countryOfOrigin: mapped.countryOfOrigin,
        episodes: cleanEpisodes,
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

    console.log(`[Watch] Requested Provider: "${provider}", Target: "${targetId}"`);

    // Resolve watchUrl (if it's a URL-safe Base64 encoded URL, decode it; if not, dynamic search)
    let watchUrl = null;
    if (isBase64Url(targetId)) {
      watchUrl = decodeId(targetId);
      console.log(`[Watch] Decoded direct URL: "${watchUrl}"`);
    } else {
      // Dynamic fallback search (e.g. from Dailymotion slug or user server switch)
      const { animeName, episodeNum } = parseEpisodeInfo(targetId);
      watchUrl = await searchAndGetEpisodeUrl(provider, animeName, episodeNum);
      if (!watchUrl && provider !== 'dailymotion' && provider !== 'youtube') {
        console.log(`[Watch] Dynamic URL not found for ${provider}. Trying fallback...`);
      }
    }

    // ── AnimeKhor ──────────────────────────────────────────────
    if (provider === 'animekhor' && watchUrl) {
      const stream = await resolveAnimeKhorStream(watchUrl);
      if (stream) return res.json(stream);
    }

    // ── LuciferDonghua ─────────────────────────────────────────
    if (provider === 'lucifer' && watchUrl) {
      const stream = await resolveLuciferStream(watchUrl);
      if (stream) return res.json(stream);
    }

    // ── MisterDonghua ──────────────────────────────────────────
    if (provider === 'misterdonghua' && watchUrl) {
      const stream = await resolveMisterDonghuaStream(watchUrl);
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
    // AUTO-HEALING CHAIN — try every source in order using parsed details
    // ═══════════════════════════════════════════════════════════
    console.log(`[Auto-Heal] Primary provider "${provider}" failed. Trying fallback chain...`);
    const { animeName, episodeNum } = parseEpisodeInfo(targetId);

    // 1. AnimeKhor
    try {
      const fallbackUrl = await searchAndGetEpisodeUrl('animekhor', animeName, episodeNum);
      if (fallbackUrl) {
        const stream = await resolveAnimeKhorStream(fallbackUrl);
        if (stream) { console.log('[Auto-Heal] ✅ AnimeKhor'); return res.json(stream); }
      }
    } catch (_) {}

    // 2. LuciferDonghua
    try {
      const fallbackUrl = await searchAndGetEpisodeUrl('lucifer', animeName, episodeNum);
      if (fallbackUrl) {
        const stream = await resolveLuciferStream(fallbackUrl);
        if (stream) { console.log('[Auto-Heal] ✅ LuciferDonghua'); return res.json(stream); }
      }
    } catch (_) {}

    // 3. MisterDonghua
    try {
      const fallbackUrl = await searchAndGetEpisodeUrl('misterdonghua', animeName, episodeNum);
      if (fallbackUrl) {
        const stream = await resolveMisterDonghuaStream(fallbackUrl);
        if (stream) { console.log('[Auto-Heal] ✅ MisterDonghua'); return res.json(stream); }
      }
    } catch (_) {}

    // 4. Dailymotion
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

const getCatalog = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const genre = req.query.genre || null;
    const sort = req.query.sort || 'POPULARITY_DESC';
    const search = req.query.search || null;

    let queryParams = '$page: Int, $perPage: Int, $sort: [MediaSort]';
    const variables = { page, perPage: 24, sort: [sort] };

    if (genre) {
      queryParams += ', $genre: String';
      variables.genre = genre;
    }
    if (search) {
      queryParams += ', $search: String';
      variables.search = search;
    }

    const query = `query (${queryParams}) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          perPage
          currentPage
          lastPage
          hasNextPage
        }
        media(type: ANIME, countryOfOrigin: "CN"${genre ? ', genre: $genre' : ''}${search ? ', search: $search' : ''}, sort: $sort) {
          ${MEDIA_FIELDS}
        }
      }
    }`;

    const data = await anilistQuery(query, variables);
    res.json({
      success: true,
      pageInfo: data?.data?.Page?.pageInfo || {},
      results: (data?.data?.Page?.media || []).map(mapAniListAnime),
    });
  } catch (e) {
    console.error('Catalog error:', e.message);
    res.status(500).json({ success: false, message: 'Failed to fetch catalog' });
  }
};

module.exports = { getTrending, getPopular, searchAnime, getAnimeInfo, getWatchUrl, getCatalog };
