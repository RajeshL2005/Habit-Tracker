/* ══════════════════════════════════════════
   services/snapshotService.js — Snapshot Management
   Snapshots are ARCHIVAL data only.
   They NEVER overwrite live Habit documents.
══════════════════════════════════════════ */

const Snapshot = require('../models/Snapshot');
const Habit    = require('../models/Habit');

/**
 * Save or update a snapshot for a given user and date.
 * Called after habit changes and during daily reset.
 *
 * @param {String} userId - User's MongoDB _id
 * @param {String} dateStr - Date string (e.g. "Tue May 13 2026")
 * @param {Array}  habits  - Array of habit documents to snapshot
 */
async function saveSnapshot(userId, dateStr, habits) {
  const habitData = habits.map(h => ({
    name:     h.name,
    streak:   h.streak,
    done:     h.done,
    lastDone: h.lastDone,
    missed:   h.missed
  }));

  await Snapshot.findOneAndUpdate(
    { userId, date: dateStr },
    { userId, date: dateStr, habits: habitData },
    { upsert: true, new: true }
  );
}

/**
 * Get a snapshot for a specific date.
 * Returns null if no snapshot exists.
 */
async function getSnapshot(userId, dateStr) {
  return Snapshot.findOne({ userId, date: dateStr });
}

/**
 * Get calendar summary data for a month.
 * Returns a map of dateStr → { done, total } for rendering the calendar.
 * For today, uses LIVE habit data (not snapshot).
 */
async function getCalendarData(userId, year, month) {
  const { todayStr } = require('../utils/dateUtils');
  const today = todayStr();

  // Get all snapshots for the given month
  // Snapshots have date as dateString, so we filter in JS
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);

  const snapshots = await Snapshot.find({ userId });
  const calendar  = {};

  // Process snapshots for the target month
  for (const snap of snapshots) {
    const snapDate = new Date(snap.date);
    if (snapDate >= firstDay && snapDate <= lastDay) {
      const done  = snap.habits.filter(h => h.done).length;
      const total = snap.habits.length;
      calendar[snap.date] = { done, total };
    }
  }

  // For today (if it falls in the requested month), use live data
  const todayDate = new Date(today);
  if (todayDate.getFullYear() === year && todayDate.getMonth() === month) {
    const liveHabits = await Habit.find({ userId });
    const done  = liveHabits.filter(h => h.done).length;
    const total = liveHabits.length;
    if (total > 0) {
      calendar[today] = { done, total };
    }
  }

  return calendar;
}

module.exports = { saveSnapshot, getSnapshot, getCalendarData };
