// Bypass SSL certificate validation errors (e.g. self-signed certificate in chain) in development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const dns = require('dns');

// Configure global DNS resolver to bypass ISP DNS blocks and resolve Atlas SRV records
try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
  console.log('📡 System DNS configured to Cloudflare (1.1.1.1) and Google (8.8.8.8)');
} catch (dnsErr) {
  console.warn('⚠️ Failed to set custom DNS servers:', dnsErr.message);
}

const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Import routes
const animeRoutes = require('./routes/animeRoutes');
const userRoutes = require('./routes/userRoutes');

// Initialize Express
const app = express();

// ═══════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// ═══════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════
app.use('/api/anime', animeRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Anime Streaming API is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ═══════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB (non-blocking — server works even if DB fails)
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n🚀 Anime Backend API running on http://localhost:${PORT}`);
    console.log(`📡 Scraper: @consumet/extensions (built-in Hianime)`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health\n`);
  });
};

startServer();
