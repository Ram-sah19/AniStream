## Backend
- [x] Rewrite animeController.js — AniList API + Donghua scrapers
- [x] Update backend/index.js — update log messages

## Frontend — Components
- [x] Navbar.js — rebrand to DonghuaStream, custom SVG logo & magnifying search
- [x] Footer.js — rebrand to DonghuaStream, custom SVG logo
- [x] HeroSection.js — update badge text
- [x] WatchPage.js — update server button labels, remove emojis

## Frontend — Pages
- [x] HomePage.js — update section text for donghua, remove emojis
- [x] PopularPage.js — update section text, remove emojis
- [x] CatalogPage.js — create browse catalog page, remove emojis

## Frontend — CSS / Theming
- [x] index.css — red/gold color palette + CSS variables
- [x] Navbar.css — red/gold accent
- [x] HeroSection.css — red/gold gradient + particles
- [x] AnimeCard.css — red/gold play button, type badge
- [x] Footer.css — red/gold logo
- [x] HomePage.css — view all button
- [x] AnimeDetailPage.css — badges, watch button, genre hover
- [x] WatchPage.css — server buttons, autoplay toggle
- [x] public/index.html — page title & SEO meta tags

## Gaps Fixed
- [x] Deduplicate & re-sequence scraped episodes to prevent overlapping lists/trailers (backend post-process)
- [x] Add `/catalog` route for complete AniList database browsing (backend controller & routes)
- [x] Create dedicated catalog page with search, sorting, and genre filter (frontend CatalogPage)
- [x] Add Browse links to Navbar and Footer for easy user access
- [x] Add Base64 parameter encoding to avoid router matching crashes with URLs
- [x] Filter out static/info pages like /a-z-lists, /dmca, or /terms from scraped episodes
- [x] Parallel racing engine `raceScrapers` to optimize scraper performance and avoid Axios timeouts
- [x] Decode Base64 strings (both URLs and slugs) during title resolution to enable robust server-switching fallbacks
- [x] Convert relative scraped urls to absolute urls to prevent localhost dev server 404 page loads
- [x] Remove all system emojis and replace them with high-quality, modern SVG paths
