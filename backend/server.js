/* ══════════════════════════════════════════
   server.js — Express Application Entry Point
   
   • Connects to MongoDB Atlas (with retries)
   • Mounts REST API routes
   • Serves frontend as static files
   • Health check with DB status
   • Server starts even if DB connection fails
   
   Frontend accessible at:
     /user/   → User Habit Tracker
     /admin/  → Admin Control Panel
══════════════════════════════════════════ */

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const morgan    = require('morgan');
const path      = require('path');
const connectDB = require('./config/db');
const { getDBStatus } = require('./config/db');

// Import routes
const authRoutes  = require('./routes/authRoutes');
const habitRoutes = require('./routes/habitRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── Middleware ── */
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

/* ── API Routes ── */
app.use('/api/auth',   authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/admin',  adminRoutes);

/* ── Serve Frontend Static Files ── */
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Root → Landing page
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'landing.html')));

// Unified login page
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html')));

// Forgot password page
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'forgot-password.html')));

// Explicit routes — admin.html is not index.html, so serve it directly
app.get('/admin/',  (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'admin', 'admin.html')));
app.get('/admin',   (req, res) => res.redirect('/admin/'));
app.get('/user',    (req, res) => res.redirect('/user/'));

/* ── Health Check with DB status ── */
app.get('/api/health', (req, res) => {
  const dbOk = getDBStatus();
  res.status(dbOk ? 200 : 503).json({
    success: dbOk,
    message: dbOk ? 'Habit Tracker API is running 🚀' : 'Server running but database is disconnected ⚠️',
    database: dbOk ? 'connected' : 'disconnected'
  });
});

/* ── 404 for unknown API routes ── */
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

/* ── Global Error Handler ── */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

/* ── Start Server (only when running locally, not on Vercel) ── */
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║   🚀 Habit Tracker Server Running       ║
║                                          ║
║   Home:  http://localhost:${PORT}/        ║
║   Login: http://localhost:${PORT}/login   ║
║   API:   http://localhost:${PORT}/api      ║
║   User:  http://localhost:${PORT}/user/    ║
║   Admin: http://localhost:${PORT}/admin/   ║
╚══════════════════════════════════════════╝
    `);
  });
}

// Connect to DB (non-blocking — retries in background)
connectDB();

// Export for Vercel serverless
module.exports = app;
