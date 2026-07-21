# AniStream — System Design

## Overview

AniStream is a full-stack anime streaming web app focused on Chinese Donghua. It separates concerns into a React frontend (port 3000) and an Express backend (port 5000). The backend acts as a middleware layer — fetching metadata from AniList GraphQL, scraping episode links from third-party sites, and resolving video streams before returning them to the frontend.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  React Frontend (port 3000)              │   │
│  │                                                          │   │
│  │  Pages: HomePage, AnimeDetailPage, WatchPage,            │   │
│  │         SearchPage, CatalogPage, WatchlistPage           │   │
│  │                                                          │   │
│  │  Components: Navbar, VideoPlayer, EpisodeList,           │   │
│  │              AnimeCard, HeroSection, Footer, AdSlot      │   │
│  │                                                          │   │
│  │  State: React useState/useEffect (no global store)       │   │
│  │  Routing: React Router v7                                │   │
│  │  HTTP: Axios (API: 15s timeout, WATCH_API: 60s timeout)  │   │
│  │  Video: HLS.js (m3u8) + iframe fallback (embeds)         │   │
│  │  Persistence: localStorage (watchlist, favorites)        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    REST API calls
                    GET /api/anime/*
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Express Backend (port 5000)                     │
│                                                                  │
│  Middleware: CORS, Morgan, express.json                          │
│  DNS: Cloudflare (1.1.1.1) + Google (8.8.8.8)                   │
│                                                                  │
│  Routes:                                                         │
│    /api/anime/trending     → getTrending                         │
│    /api/anime/popular      → getPopular                          │
│    /api/anime/search       → searchAnime                         │
│    /api/anime/catalog      → getCatalog                          │
│    /api/anime/info/:id     → getAnimeInfo                        │
│    /api/anime/watch/*      → getWatchUrl                         │
│    /api/anime/proxy        → CORS proxy for HLS segments         │
│    /api/user/*             → watchlist/favorites (MongoDB)       │
│    /api/health             → health check                        │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
  ┌──────────────┐   ┌──────────────────┐   ┌────────────┐
  │ AniList      │   │ Scraper Sites    │   │  MongoDB   │
  │ GraphQL API  │   │                  │   │  (Atlas)   │
  │              │   │ - AnimeKhor      │   │            │
  │ Metadata:    │   │ - LuciferDonghua │   │ Watchlist  │
  │ - trending   │   │ - MisterDonghua  │   │ Favorites  │
  │ - popular    │   │ - Dailymotion    │   │            │
  │ - search     │   │   API            │   └────────────┘
  │ - info       │   └──────────────────┘
  └──────────────┘
```

---

## Data Flow

### 1. Browse / Metadata Flow

```
User visits HomePage
  → fetchTrending() / fetchPopular()
  → GET /api/anime/trending
  → Backend: anilistQuery(TRENDING_DESC, countryOfOrigin: CN)
  → AniList GraphQL → returns media list
  → mapAniListAnime() normalises fields
  → Frontend renders AnimeCard grid
```

### 2. Anime Detail + Episode List Flow

```
User clicks anime → AnimeDetailPage
  → fetchAnimeInfo(animeId)
  → GET /api/anime/info/:animeId
  → Backend:
      1. AniList query by ID → get metadata
      2. Parallel scrape (Promise.all, 4s timeout each):
           scrapeAnimeKhor(title)
           scrapeLuciferDonghua(title)
           scrapeMisterDonghua(title)
      3. If no episodes found → getDailymotionFullEpisodes()
      4. If still empty → generate placeholder episode stubs
      5. Deduplicate + re-sequence episodes
  → Returns: anime metadata + episode list
  → Frontend renders detail page + EpisodeList
```

### 3. Watch / Stream Resolution Flow

```
User clicks episode → WatchPage
  → fetchWatchUrl(episodeId)  [60s timeout]
  → GET /api/anime/watch/:episodeId
  → Backend:
      1. Decode episodeId → provider + targetId
      2. parseEpisodeInfo(targetId) → animeName + episodeNum
      3. Parallel resolve (Promise.all, 10s timeout each):
           resolveAnimeKhorStream()
           resolveLuciferStream()
           resolveMisterDonghuaStream()
           resolveDailymotionStream()
      4. Score streams: m3u8 (100) > mp4 (80) > official embed (60) > other (40)
      5. Return best stream + allAvailableServers list
  → Frontend:
      - isM3U8=true  → HLS.js loads via /api/anime/proxy
      - isM3U8=false → iframe embed
      - onEnded → auto-play next episode (if toggle on)
```

### 4. HLS Proxy Flow

```
HLS.js requests m3u8 segment
  → GET /api/anime/proxy?url=<segment>&referer=<origin>
  → Backend proxies request with spoofed Referer + User-Agent
  → Rewrites relative .ts/.m3u8 URLs in manifest to go through proxy
  → Returns binary segment data to HLS.js
```

---

## Component Structure

```
frontend/src/
├── api/
│   └── index.js          — Axios instances (API 15s, WATCH_API 60s) + all endpoint functions
├── pages/
│   ├── HomePage.js        — Trending + Popular grids, HeroSection
│   ├── AnimeDetailPage.js — Metadata, genres, episode list, add to watchlist/favorites
│   ├── WatchPage.js       — Video player, server switcher, autoplay, episode sidebar
│   ├── SearchPage.js      — Search input + results grid
│   ├── CatalogPage.js     — Paginated catalog with genre/sort filters
│   ├── PopularPage.js     — Popular anime grid
│   └── WatchlistPage.js   — Watchlist + favorites (localStorage)
└── components/
    ├── Navbar.js          — Scroll-aware, active route links
    ├── VideoPlayer.js     — HLS.js + iframe, quality switcher, onEnded callback
    ├── EpisodeList.js     — Episode grid with current highlight
    ├── AnimeCard.js       — Poster card with hover overlay
    ├── HeroSection.js     — Featured anime banner
    ├── AdSlot.js          — Placeholder ad banner component
    └── Footer.js          — Site footer
```

---

## Backend Module Structure

```
backend/
├── index.js               — Express app, middleware, DNS config, server start
├── routes/
│   ├── animeRoutes.js     — Anime + proxy routes
│   └── userRoutes.js      — Watchlist/favorites routes
├── controllers/
│   ├── animeController.js — All scraping, stream resolution, AniList queries
│   └── userController.js  — MongoDB watchlist/favorites CRUD
├── models/
│   ├── Watchlist.js       — Mongoose schema
│   └── Favorite.js        — Mongoose schema
└── config/
    └── db.js              — Mongoose connection
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| AniList GraphQL for metadata | Rich anime data, free, no key required. Filtered to `countryOfOrigin: CN` for Donghua focus |
| Parallel scraping with `Promise.all` + timeout | Prevents one slow scraper from blocking the response. 4s per scraper on info, 10s on watch |
| URL-safe Base64 episode IDs | Episode URLs from scrapers contain slashes and special chars — encoding makes them safe for Express route params |
| Stream scoring (m3u8 > mp4 > embed) | Prioritises native HLS streams (ad-free, seekable) over iframe embeds |
| CORS proxy for HLS | CDN servers block direct browser requests via Referer checks — backend proxy spoofs headers |
| Dailymotion as fallback | Public API, no auth required, has many official Donghua uploads |
| localStorage for watchlist | Avoids auth requirement; MongoDB used optionally when `MONGO_URI` is set |
| Separate `WATCH_API` (60s timeout) | Stream resolution involves multiple sequential scrape + resolve steps that can take 20–40s |
| Custom DNS (Cloudflare + Google) | Bypasses ISP DNS blocks on MongoDB Atlas SRV records and external APIs |

---

## Episode ID Format

Episode IDs encode both the provider and the source URL:

```
Format:  <provider>:<base64url-encoded-source-url>
Example: animekhor:aHR0cHM6Ly9hbmltZWtob3IueHl6Ly4uLg

Providers: animekhor | lucifer | misterdonghua | dailymotion

Dailymotion special formats:
  dm-<videoId>-ep<N>-<slug>   → direct video ID known
  search-<slug>-episode-<N>   → placeholder, resolved at watch time
```

---

## Stream Resolution Pipeline

```
episodeId received
       │
       ▼
  Has colon? ──yes──► split provider:targetId
       │no
       ▼
  provider = 'dailymotion'
       │
       ▼
  isBase64Url(targetId)?
    yes → decode to direct watch URL
    no  → use as search slug
       │
       ▼
  parseEpisodeInfo() → animeName + episodeNum
       │
       ▼
  Promise.all([
    AnimeKhor resolver,
    LuciferDonghua resolver,
    MisterDonghua resolver,
    Dailymotion resolver
  ], 10s timeout each)
       │
       ▼
  Filter nulls → score streams → sort desc → return best
```

---

## Environment Variables

```
# backend/.env
MONGO_URI=<mongodb+srv://...>   # optional — app runs without DB
PORT=5000
```

---

## Limitations & Known Issues

- AniList GraphQL (`graphql.anilist.co`) is blocked on some networks (e.g. Sophos firewall) — returns 403
- Scraper sites (AnimeKhor, LuciferDonghua, MisterDonghua) may bot-detect and block requests
- `@consumet/extensions` v1.8.8 does not include `Gogoanime` — available providers: `Hianime`, `AnimeKai`, `AnimePahe`, `KickAssAnime`, `AnimeSaturn`, `AnimeUnity`, `AnimeSama`
- `AnimePahe` in v1.8.8 only exposes `fetchRecentEpisodes` — cannot be used for search or stream resolution
- No authentication system — user data is localStorage-only unless MongoDB is configured
- `NODE_TLS_REJECT_UNAUTHORIZED=0` is set globally in development (security risk in production)
