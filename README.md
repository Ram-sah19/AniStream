# AniStream

An anime streaming web app with a React frontend and Node.js/Express backend. Fetches anime metadata from Jikan (MyAnimeList) and streams episodes via Consumet providers.

## Tech Stack

- **Frontend**: React 19, React Router v7, HLS.js, Axios
- **Backend**: Node.js, Express, Mongoose, @consumet/extensions v1.8.8, Axios, Cheerio
- **Metadata API**: Jikan (MyAnimeList public API)
- **Stream Providers**: Hianime, AnimeKai (via Consumet)

## Project Structure

```
Animesite/
├── backend/          # Express API server (port 5000)
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   └── config/
└── frontend/         # React app (port 3000)
    └── src/
        ├── api/
        ├── components/
        └── pages/
```

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:5000`.

## Features

- Browse trending and popular anime
- Search anime by title
- Anime detail pages with episode lists
- Video streaming with HLS.js and iframe embed fallback
- Auto-play next episode toggle
- Multiple stream server switcher
- Watchlist and favorites (stored in localStorage + MongoDB)
- Scroll-aware navbar, dark theme

## Environment Variables

Create `backend/.env` based on `backend/.env.example`:

```
MONGO_URI=<your_mongodb_connection_string>
PORT=5000
```

## Roadmap & Future Improvements

### Authentication & User Accounts
- [ ] JWT-based auth (register/login)
- [ ] Per-user watchlist and favorites synced to MongoDB instead of localStorage
- [ ] Watch history with resume position (store timestamp per episode)

### Streaming Improvements
- [ ] Integrate working Consumet providers (Hianime, AnimeKai) for reliable HLS streams
- [ ] Replace scraper-based episode resolution with a stable provider API
- [ ] Subtitle/caption support (.vtt / .srt) in the video player
- [ ] Quality selector tied to real HLS level switching (480p / 720p / 1080p)
- [ ] Picture-in-picture and theatre mode

### Metadata & Discovery
- [ ] Migrate metadata source from AniList to Jikan (MyAnimeList) to avoid firewall blocks
- [ ] Genre filter and sort on HomePage
- [ ] Season/year browser
- [ ] Related anime recommendations on detail page
- [ ] Ratings and community reviews

### Performance
- [ ] Server-side caching (Redis) for trending/popular/search responses
- [ ] Image lazy loading and CDN delivery
- [ ] Code splitting and lazy-loaded routes
- [ ] Service worker for offline episode caching

### DevOps & Deployment
- [ ] Dockerise frontend and backend
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Deploy backend to AWS EC2 / Railway / Render
- [ ] Deploy frontend to Vercel / Netlify
- [ ] Environment-based config (dev / staging / prod)

### UI/UX
- [ ] Mobile-responsive layout improvements
- [ ] Keyboard shortcuts for the video player
- [ ] Continue watching row on HomePage
- [ ] Notifications for new episode releases

## License

MIT

                                MADE FOR THE ANIME LOVER 
