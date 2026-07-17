const mongoose = require('mongoose');

const connectDB = async () => {
  const atlasUri = process.env.MONGO_URI;

  // Ensure the URI includes a database name
  // Atlas URIs often end with /?appName=... — we need to insert a DB name
  let connectionUri = atlasUri;
  if (atlasUri && atlasUri.includes('mongodb+srv://') && !atlasUri.match(/\.net\/[a-zA-Z]/)) {
    // Insert database name before the query params
    connectionUri = atlasUri.replace('.net/', '.net/animesite');
  }

  try {
    const conn = await mongoose.connect(connectionUri);
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Atlas Connection Error: ${error.message}`);
    // Fallback: try localhost if Atlas fails
    try {
      const fallback = await mongoose.connect('mongodb://localhost:27017/animesite');
      console.log(`✅ MongoDB Fallback Connected (localhost): ${fallback.connection.host}`);
      console.log(`   Database: ${fallback.connection.name}`);
    } catch (fallbackError) {
      console.error(`❌ MongoDB Fallback also failed: ${fallbackError.message}`);
      console.warn('⚠️  Server running without database. Watchlist/Favorites will not work.');
    }
  }

  // Connection event listeners
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });
};

module.exports = connectDB;
