# Transform AniStream → DonghuaStream (Chinese Anime Site)

## Overview

Your current site **AniStream** is built for **Japanese anime** — it uses:
- **Jikan API** (MyAnimeList data) which returns mostly Japanese anime
- **HiAnime / AnimePahe** scrapers — Japanese anime sources
- **Anime4i** scraper — also Japanese anime

The goal is to transform the entire site into a **Chinese Donghua** anime site called **DonghuaStream**, where:
1. All metadata (anime titles, genres, etc.) comes from **AniList API** filtered to `countryOfOrigin: "CN"` (Chinese productions)
2. Episodes are scraped from **Donghua-focused sources** (Dailymotion Chinese channels, YouTube official channels like Tencent/Bilibili/iQIYI)
3. The site branding, theme colors, and UI text all reflect Chinese anime culture

---

## Proposed Changes

### 🔴 Backend — Core Logic Overhaul

#### [MODIFY] [animeController.js](file:///d:/Gsoc/Animesite/backend/controllers/animeController.js)

**Replace Jikan API with AniList GraphQL API:**
- `getTrending` → Query AniList for trending Chinese anime (`countryOfOrigin: "CN"`, `sort: TRENDING_DESC`)
- `getPopular` → Query AniList for popular Chinese anime (`sort: POPULARITY_DESC`)
- `searchAnime` → Query AniList for Chinese anime search with `countryOfOrigin: "CN"`
- `getAnimeInfo` → Fetch full anime details + episode count from AniList

**Replace Japanese scrapers with Donghua scrapers:**
- Remove: Jikan API, AnimePahe, HiAnime scrapers, Anime4i scraper
- Add: `getDonghuaEpisodes()` — scrapes episode list from **donghua.io** or similar
- Add: `getDailymotionDonghuaStream()` — searches Dailymotion for Chinese dubbed episodes (Tencent Video/Bilibili officially upload to Dailymotion)
- Add: `getYouTubeOfficialEmbed()` — uses YouTube oEmbed to find official channel videos
- Fallback chain: Donghua.io → Dailymotion official channel search → YouTube embed

**Map function updated:**
- `mapAniListAnime()` replaces `mapJikanAnime()` — maps AniList response fields to our schema

#### [MODIFY] [index.js](file:///d:/Gsoc/Animesite/backend/index.js)
- Update startup log messages from "Anime Backend" to "Donghua Backend"

---

### 🎨 Frontend — Branding & Theme Overhaul

#### [MODIFY] [Navbar.js](file:///d:/Gsoc/Animesite/frontend/src/components/Navbar.js)
- Rename logo from **AniStream** → **DonghuaStream**
- Update logo icon from `▶` to custom SVG dragon/crest
- Update search placeholder: "Search anime..." → "Search donghua..."
- Add "Donghua" nav label context

#### [MODIFY] [Footer.js](file:///d:/Gsoc/Animesite/frontend/src/components/Footer.js)
- Rename brand to **DonghuaStream**
- Update description to focus on Chinese anime/donghua
- Update copyright text

#### [MODIFY] [HomePage.js](file:///d:/Gsoc/Animesite/frontend/src/pages/HomePage.js)
- Update section subtitle: "Currently airing and most popular anime" → "Top trending Chinese donghua series"
- Update hero badge: "🔥 Trending" → "🐉 Trending Donghua"

#### [MODIFY] [HeroSection.js](file:///d:/Gsoc/Animesite/frontend/src/components/HeroSection.js)
- Update trending badge to show "🐉 Trending Donghua"

#### [MODIFY] [WatchPage.js](file:///d:/Gsoc/Animesite/frontend/src/pages/WatchPage.js)
- Update server buttons to reflect Chinese sources:
  - Server Alpha: "Official Bilibili/Tencent Stream"
  - Server Beta: "Dailymotion Chinese Source"
  - Server Gamma: "Donghua.io Scraper"
  - Server Delta: "YouTube Official Channel"

#### [MODIFY] CSS files (index.css, Navbar.css, HeroSection.css)
- Switch color palette from purple/violet → **red + gold** (traditional Chinese color scheme)
- Update gradient accents to use `#C0392B` (dragon red) + `#F39C12` (imperial gold)

---

## Implementation Strategy

### AniList API (Free, No Key Required)
```graphql
query ($page: Int, $sort: [MediaSort], $search: String) {
  Page(page: $page, perPage: 24) {
    media(
      type: ANIME,
      countryOfOrigin: "CN",
      sort: $sort,
      search: $search
    ) {
      id
      title { romaji english native }
      coverImage { large extraLarge }
      averageScore
      episodes
      status
      genres
      startDate { year }
      season
      format
      description
    }
  }
}
```

### Episode Scraping Strategy (Tiered)
1. **Tier 1: Donghua.io scraper** — similar to existing Anime4i scraper
2. **Tier 2: Dailymotion API search** — search `"{title} episode {n} english sub"` from official Tencent/Bilibili channels
3. **Tier 3: Generate dummy episode list** with Dailymotion fallback per episode

---

## Verification Plan

### Automated Tests
- Start backend: `cd backend && npm run dev`
- Test AniList trending: `curl http://localhost:5000/api/anime/trending`
- Test search: `curl "http://localhost:5000/api/anime/search?q=fog+hill"`
- Start frontend: `cd frontend && npm run dev`

### Manual Verification
- Homepage loads Chinese anime (Fog Hill of Five Elements, Battle Through the Heavens, etc.)
- Search returns Chinese anime only
- Episode list appears on anime detail page
- Watch page loads video player with stream
- Branding shows "DonghuaStream" with red/gold theme throughout

---

## Open Questions

> [!IMPORTANT]
> **Site Name**: I'm proposing `DonghuaStream` as the new brand name. Is this what you want, or do you have another name in mind?

> [!NOTE]
> **Episode Streaming**: Chinese anime official streams (Tencent, Bilibili, iQIYI) are region-locked and DRM-protected — direct HLS streams cannot be scraped the same way as Japanese anime sites. The approach will use:
> - **Dailymotion official channels** (many Chinese studios post freely here)
> - **YouTube official embeds** from Tencent Video Animation / Bilibili channels
> - This is a legal gray area, but it's the same approach your existing site uses (scraping from aggregators)

> [!NOTE]
> **AniList vs Jikan**: AniList has better Chinese anime data than MyAnimeList/Jikan. The switch gives us accurate `countryOfOrigin: "CN"` filtering, so only real donghua appears.
