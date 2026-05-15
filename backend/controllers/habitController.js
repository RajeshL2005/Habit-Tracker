/* ══════════════════════════════════════════
   controllers/habitController.js — Habit CRUD & Data
   Handles habit operations, weekly data, snapshots, calendar.
   RULE: done=true ONLY from explicit user action (markDone).
══════════════════════════════════════════ */

const Habit = require('../models/Habit');
const User  = require('../models/User');
const { handleMarkDone, handleUndo } = require('../services/streakService');
const { performDailyReset } = require('../services/resetService');
const { saveSnapshot, getSnapshot, getCalendarData } = require('../services/snapshotService');
const { getWeeklyData }  = require('../services/analyticsService');
const { validateHabitName } = require('../utils/validators');
const { todayStr } = require('../utils/dateUtils');

/** GET /api/habits — Get all habits for logged-in user */
const getHabits = async (req, res) => {
  try {
    // Run daily reset if needed
    await performDailyReset(req.user._id);

    const habits = await Habit.find({ userId: req.user._id });

    // Reload user for updated restores
    const user = await User.findById(req.user._id).select('-password');

    res.json({
      success: true,
      data: {
        habits,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          restores: user.restores
        }
      }
    });
  } catch (error) {
    console.error('getHabits error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch habits' });
  }
};

/** POST /api/habits — Add a new habit */
const addHabit = async (req, res) => {
  try {
    const { name } = req.body;
    const err = validateHabitName(name);
    if (err) return res.status(400).json({ success: false, message: err });

    const habit = await Habit.create({
      userId: req.user._id,
      name: name.trim()
    });

    // Update today's snapshot
    const allHabits = await Habit.find({ userId: req.user._id });
    await saveSnapshot(req.user._id, todayStr(), allHabits);

    res.status(201).json({
      success: true,
      message: `Habit "${name.trim()}" added ✨`,
      data: { habit }
    });
  } catch (error) {
    console.error('addHabit error:', error);
    res.status(500).json({ success: false, message: 'Failed to add habit' });
  }
};

/** DELETE /api/habits/:id — Delete a habit */
const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    const name = habit.name;
    await Habit.deleteOne({ _id: habit._id });

    // Update today's snapshot
    const remaining = await Habit.find({ userId: req.user._id });
    await saveSnapshot(req.user._id, todayStr(), remaining);

    res.json({
      success: true,
      message: `🗑️ "${name}" deleted.`
    });
  } catch (error) {
    console.error('deleteHabit error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete habit' });
  }
};

/** PUT /api/habits/:id/done — Mark habit as done */
const markDone = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    const user = await User.findById(req.user._id);
    const useRestore = req.body.useRestore || false;

    const result = handleMarkDone(habit, user, useRestore);
    if (!result.changed) {
      return res.json({ success: true, message: 'Already done', data: { habit } });
    }

    await habit.save();
    await user.save();

    // Update today's snapshot
    const allHabits = await Habit.find({ userId: req.user._id });
    await saveSnapshot(req.user._id, todayStr(), allHabits);

    res.json({
      success: true,
      data: {
        habit,
        user: { restores: user.restores }
      }
    });
  } catch (error) {
    console.error('markDone error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark habit done' });
  }
};

/** PUT /api/habits/:id/undo — Undo today's completion */
const undoHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    const result = handleUndo(habit);
    if (!result.allowed) {
      return res.status(400).json({ success: false, message: result.reason });
    }

    await habit.save();

    // Update today's snapshot
    const allHabits = await Habit.find({ userId: req.user._id });
    await saveSnapshot(req.user._id, todayStr(), allHabits);

    res.json({
      success: true,
      data: { habit }
    });
  } catch (error) {
    console.error('undoHabit error:', error);
    res.status(500).json({ success: false, message: 'Failed to undo habit' });
  }
};

/** GET /api/habits/weekly — Weekly streak graph data */
const getWeekly = async (req, res) => {
  try {
    const data = await getWeeklyData(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('getWeekly error:', error);
    res.status(500).json({ success: false, message: 'Failed to get weekly data' });
  }
};

/** GET /api/habits/snapshot/:date — Get snapshot for a specific date */
const getSnapshotData = async (req, res) => {
  try {
    const snapshot = await getSnapshot(req.user._id, req.params.date);
    res.json({
      success: true,
      data: { snapshot }
    });
  } catch (error) {
    console.error('getSnapshot error:', error);
    res.status(500).json({ success: false, message: 'Failed to get snapshot' });
  }
};

/** GET /api/habits/calendar/:year/:month — Calendar data for a month */
const getCalendar = async (req, res) => {
  try {
    const year  = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const calendar = await getCalendarData(req.user._id, year, month);
    res.json({ success: true, data: { calendar } });
  } catch (error) {
    console.error('getCalendar error:', error);
    res.status(500).json({ success: false, message: 'Failed to get calendar data' });
  }
};

module.exports = {
  getHabits, addHabit, deleteHabit,
  markDone, undoHabit,
  getWeekly, getSnapshotData, getCalendar
};
