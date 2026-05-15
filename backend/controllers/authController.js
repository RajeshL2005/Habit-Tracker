/* ══════════════════════════════════════════
   controllers/authController.js — User Authentication
   Handles signup, login, and profile retrieval.
══════════════════════════════════════════ */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const Habit = require('../models/Habit');
const { validateSignup, validateLogin } = require('../utils/validators');
const { performDailyReset } = require('../services/resetService');

/** Generate JWT token */
function generateToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/** POST /api/auth/signup */
const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    const errors = validateSignup({ username, email, password });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0] });
    }

    const name = username.trim().toLowerCase();
    const mail = email.trim().toLowerCase();

    // Check if user already exists
    const exists = await User.findOne({ $or: [{ username: name }, { email: mail }] });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists. Please login.'
      });
    }

    // Create user
    const user = await User.create({
      username: name,
      email: mail,
      password,
      lastResetDate: new Date().toDateString()
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: `Welcome ${name} 🎉`,
      data: {
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          restores: user.restores
        }
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
};

/** POST /api/auth/login */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    const errors = validateLogin({ username, password });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0] });
    }

    const input = username.trim().toLowerCase();

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: input }, { email: input }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please sign up first 📝'
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password.trim());
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password ❌'
      });
    }

    // Run daily reset before returning habits
    await performDailyReset(user._id);

    // Get user's habits (post-reset)
    const habits = await Habit.find({ userId: user._id });

    const token = generateToken(user);

    res.json({
      success: true,
      message: `Welcome back ${user.username} 👋`,
      data: {
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          restores: user.restores
        },
        habits
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

/** GET /api/auth/profile */
const getProfile = async (req, res) => {
  try {
    const habits    = await Habit.find({ userId: req.user._id });
    const maxStreak = habits.length ? Math.max(...habits.map(h => h.streak)) : 0;
    const curStreak = maxStreak;

    res.json({
      success: true,
      data: {
        user: {
          _id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          restores: req.user.restores
        },
        stats: {
          totalHabits: habits.length,
          currentStreak: curStreak,
          bestStreak: maxStreak
        }
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** POST /api/auth/reset-password */
const resetPassword = async (req, res) => {
  try {
    const { identity, newPassword } = req.body;

    if (!identity || !newPassword) {
      return res.status(400).json({ success: false, message: 'Username/email and new password are required' });
    }

    if (newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const input = identity.trim().toLowerCase();

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: input }, { email: input }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with that username or email 🔍'
      });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword.trim();
    await user.save();

    res.json({
      success: true,
      message: `Password reset successfully for @${user.username} ✅`
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error during password reset' });
  }
};

module.exports = { signup, login, getProfile, resetPassword };
