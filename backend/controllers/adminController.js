/* ══════════════════════════════════════════
   controllers/adminController.js — Admin Operations
   Dashboard stats, user/habit management, analytics, logs.
══════════════════════════════════════════ */

const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const Habit    = require('../models/Habit');
const Snapshot = require('../models/Snapshot');
const AdminLog = require('../models/AdminLog');
const { getPlatformStats, getAnalyticsData } = require('../services/analyticsService');

/** Helper: log an admin action */
async function logAction(message, dotColor = 'blue', actionType = 'general') {
  await AdminLog.create({ message, dotColor, actionType });
}

/** POST /api/admin/signup — Create first admin account */
const adminSignup = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if admin already exists
    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Admin account already exists. Please login.' });
    }

    const admin = await User.create({
      username: username.trim().toLowerCase(),
      email: `${username.trim().toLowerCase()}@admin.local`,
      password,
      role: 'admin',
      lastResetDate: new Date().toDateString()
    });

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAction(`Admin account created for @${admin.username}`, 'green', 'auth');

    res.status(201).json({
      success: true,
      message: `Admin account created! Welcome, ${admin.username} 🛡️`,
      data: { token, admin: { _id: admin._id, username: admin.username, role: 'admin' } }
    });
  } catch (error) {
    console.error('adminSignup error:', error);
    res.status(500).json({ success: false, message: 'Server error during admin signup' });
  }
};

/** POST /api/admin/login */
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please fill all fields ⚠️' });
    }

    const admin = await User.findOne({ username: username.trim().toLowerCase(), role: 'admin' });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials ❌' });
    }

    const isMatch = await admin.comparePassword(password.trim());
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials ❌' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAction(`Admin @${admin.username} logged in`, 'blue', 'auth');

    res.json({
      success: true,
      message: `Welcome back, ${admin.username}! 🛡️`,
      data: { token, admin: { _id: admin._id, username: admin.username, role: 'admin' } }
    });
  } catch (error) {
    console.error('adminLogin error:', error);
    res.status(500).json({ success: false, message: 'Server error during admin login' });
  }
};

/** GET /api/admin/check — Check if admin account exists */
const checkAdminExists = async (req, res) => {
  try {
    const admin = await User.findOne({ role: 'admin' });
    res.json({ success: true, data: { exists: !!admin } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** GET /api/admin/dashboard — Dashboard statistics */
const getDashboardStats = async (req, res) => {
  try {
    const stats = await getPlatformStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
};

/** GET /api/admin/users — All users list */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password');
    const result = [];

    for (const u of users) {
      const habits    = await Habit.find({ userId: u._id });
      const done      = habits.filter(h => h.done).length;
      const bestStreak = habits.length ? Math.max(...habits.map(h => h.streak || 0)) : 0;
      result.push({
        _id: u._id,
        username: u.username,
        email: u.email,
        habitCount: habits.length,
        doneToday: done,
        bestStreak,
        restores: u.restores
      });
    }

    res.json({ success: true, data: { users: result } });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

/** GET /api/admin/users/:id — Single user detail */
const getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const habits     = await Habit.find({ userId: user._id });
    const bestStreak = habits.length ? Math.max(...habits.map(h => h.streak || 0)) : 0;
    const done       = habits.filter(h => h.done).length;

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id, username: user.username, email: user.email,
          restores: user.restores
        },
        habits: habits.map(h => ({ name: h.name, done: h.done, streak: h.streak })),
        stats: { total: habits.length, bestStreak, doneToday: done }
      }
    });
  } catch (error) {
    console.error('getUserDetail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user detail' });
  }
};

/** DELETE /api/admin/users/:id — Delete user + all data */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const username = user.username;
    await Habit.deleteMany({ userId: user._id });
    await Snapshot.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });

    await logAction(`Deleted user @${username}`, 'red', 'delete');

    res.json({ success: true, message: `User @${username} deleted.` });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

/** GET /api/admin/habits — All habits across all users */
const getAllHabits = async (req, res) => {
  try {
    const habits = await Habit.find().populate('userId', 'username');
    const result = habits.map(h => ({
      _id: h._id,
      name: h.name,
      owner: h.userId ? h.userId.username : 'Unknown',
      ownerId: h.userId ? h.userId._id : null,
      streak: h.streak,
      done: h.done,
      lastDone: h.lastDone,
      missed: h.missed
    }));
    res.json({ success: true, data: { habits: result } });
  } catch (error) {
    console.error('getAllHabits error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch habits' });
  }
};

/** DELETE /api/admin/habits/:id — Admin remove any habit */
const deleteHabitAdmin = async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id).populate('userId', 'username');
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });

    const name  = habit.name;
    const owner = habit.userId ? habit.userId.username : 'Unknown';
    await Habit.deleteOne({ _id: habit._id });

    await logAction(`Removed habit "${name}" from @${owner}`, 'yellow', 'delete');

    res.json({ success: true, message: `Habit removed from @${owner}` });
  } catch (error) {
    console.error('deleteHabitAdmin error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove habit' });
  }
};

/** GET /api/admin/analytics — Platform analytics */
const getAnalytics = async (req, res) => {
  try {
    const data = await getAnalyticsData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('getAnalytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
};

/** GET /api/admin/logs — Activity log */
const getActivityLog = async (req, res) => {
  try {
    const logs = await AdminLog.find().sort({ timestamp: -1 }).limit(100);
    res.json({ success: true, data: { logs } });
  } catch (error) {
    console.error('getActivityLog error:', error);
    res.status(500).json({ success: false, message: 'Failed to load logs' });
  }
};

/** DELETE /api/admin/logs — Clear all logs */
const clearActivityLog = async (req, res) => {
  try {
    await AdminLog.deleteMany({});
    res.json({ success: true, message: 'Activity logs cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clear logs' });
  }
};

/** POST /api/admin/reset-habits — Force reset all habits */
const resetAllHabits = async (req, res) => {
  try {
    await Habit.updateMany({}, { done: false });
    await logAction('Admin force-reset all habits (done → false)', 'red', 'reset');
    res.json({ success: true, message: 'All habits reset ✅' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reset habits' });
  }
};

/** PUT /api/admin/settings — Update admin credentials */
const updateSettings = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await User.findById(req.user._id);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (username && username.trim()) admin.username = username.trim().toLowerCase();
    if (password && password.length >= 6) admin.password = password;
    await admin.save();

    await logAction('Admin credentials updated', 'blue', 'settings');
    res.json({ success: true, message: 'Settings saved ✅' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
};

module.exports = {
  adminSignup, adminLogin, checkAdminExists,
  getDashboardStats, getAllUsers, getUserDetail, deleteUser,
  getAllHabits, deleteHabitAdmin,
  getAnalytics, getActivityLog, clearActivityLog,
  resetAllHabits, updateSettings
};
