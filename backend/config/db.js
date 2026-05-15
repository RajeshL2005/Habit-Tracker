/* ══════════════════════════════════════════
   config/db.js — MongoDB Atlas Connection
   Connects with auto-retry (up to 5 attempts).
   Server starts even if DB fails initially.
══════════════════════════════════════════ */

const mongoose = require('mongoose');

let isConnected = false;
let retryCount = 0;
const MAX_RETRIES = 5;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });
    isConnected = true;
    retryCount = 0;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    retryCount++;
    console.error(`❌ MongoDB Connection Error (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`);

    if (retryCount < MAX_RETRIES) {
      const delay = Math.min(retryCount * 3000, 15000);
      console.log(`🔄 Retrying in ${delay / 1000}s...`);
      setTimeout(connectDB, delay);
    } else {
      console.error('❌ Max retries reached. Server running WITHOUT database.');
      console.error('   Fix: Go to MongoDB Atlas → Network Access → Add your current IP');
    }
  }
};

// Listen for disconnect events and auto-reconnect
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
  isConnected = false;
});

mongoose.connection.on('connected', () => {
  isConnected = true;
});

const getDBStatus = () => isConnected;

module.exports = connectDB;
module.exports.getDBStatus = getDBStatus;
