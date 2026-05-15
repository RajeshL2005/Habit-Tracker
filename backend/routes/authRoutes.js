/* ══════════════════════════════════════════
   routes/authRoutes.js — User Auth Endpoints
══════════════════════════════════════════ */

const express = require('express');
const router  = express.Router();
const { signup, login, getProfile, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getProfile);

module.exports = router;
