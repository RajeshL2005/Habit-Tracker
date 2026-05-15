/* ══════════════════════════════════════════
   routes/habitRoutes.js — Habit CRUD & Data Endpoints
   All routes require authentication (protect middleware).
══════════════════════════════════════════ */

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getHabits, addHabit, deleteHabit,
  markDone, undoHabit,
  getWeekly, getSnapshotData, getCalendar
} = require('../controllers/habitController');

// Weekly and calendar MUST come before /:id routes to avoid conflicts
router.get('/weekly',                protect, getWeekly);
router.get('/snapshot/:date',        protect, getSnapshotData);
router.get('/calendar/:year/:month', protect, getCalendar);

router.get('/',       protect, getHabits);
router.post('/',      protect, addHabit);
router.delete('/:id', protect, deleteHabit);
router.put('/:id/done', protect, markDone);
router.put('/:id/undo', protect, undoHabit);

module.exports = router;
