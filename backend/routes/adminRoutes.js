/* ══════════════════════════════════════════
   routes/adminRoutes.js — Admin Panel Endpoints
   Public: signup, login, check
   Protected: all management routes (admin only)
══════════════════════════════════════════ */

const express = require('express');
const router  = express.Router();
const { protect }   = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const {
  adminSignup, adminLogin, checkAdminExists,
  getDashboardStats, getAllUsers, getUserDetail, deleteUser,
  getAllHabits, deleteHabitAdmin,
  getAnalytics, getActivityLog, clearActivityLog,
  resetAllHabits, updateSettings
} = require('../controllers/adminController');

// Public (no auth needed)
router.post('/signup', adminSignup);
router.post('/login',  adminLogin);
router.get('/check',   checkAdminExists);

// Protected + Admin only
router.get('/dashboard',      protect, adminOnly, getDashboardStats);
router.get('/users',          protect, adminOnly, getAllUsers);
router.get('/users/:id',      protect, adminOnly, getUserDetail);
router.delete('/users/:id',   protect, adminOnly, deleteUser);
router.get('/habits',         protect, adminOnly, getAllHabits);
router.delete('/habits/:id',  protect, adminOnly, deleteHabitAdmin);
router.get('/analytics',      protect, adminOnly, getAnalytics);
router.get('/logs',           protect, adminOnly, getActivityLog);
router.delete('/logs',        protect, adminOnly, clearActivityLog);
router.post('/reset-habits',  protect, adminOnly, resetAllHabits);
router.put('/settings',       protect, adminOnly, updateSettings);

module.exports = router;
