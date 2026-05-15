/* ══════════════════════════════════════════
   services/streakService.js — Streak Business Logic
   Handles mark-done, undo, and streak calculations.
   RULE: done=true ONLY when user explicitly marks it.
══════════════════════════════════════════ */

const { todayStr, yesterdayStr } = require('../utils/dateUtils');

/**
 * Mark a habit as done for today.
 * Handles streak continuation, missed detection, and restores.
 *
 * @param {Object} habit   - Mongoose Habit document
 * @param {Object} user    - Mongoose User document
 * @param {Boolean} useRestore - Whether user chose to use a restore
 * @returns {Object} { habit, user } — updated documents (not yet saved)
 */
function handleMarkDone(habit, user, useRestore = false) {
  const today     = todayStr();
  const yesterday = yesterdayStr();

  // Already done today — no-op
  if (habit.done) {
    return { habit, user, changed: false };
  }

  // ── MISSED: habit was not done yesterday ──
  if (habit.missed) {
    if (useRestore && user.restores > 0) {
      // Use a restore — continue streak
      user.restores -= 1;
      habit.streak += 1;
    } else {
      // No restore — reset streak to 1
      habit.streak = 1;
    }
    habit.done     = true;
    habit.lastDone = today;
    habit.missed   = false;
    return { habit, user, changed: true };
  }

  // ── NORMAL: calculate streak ──
  let newStreak = 1;
  if (habit.lastDone) {
    const last  = new Date(habit.lastDone);
    const now   = new Date(today);
    last.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now - last) / 86400000);

    if (diffDays === 0) {
      newStreak = habit.streak; // same day, keep streak
    } else if (diffDays === 1) {
      newStreak = habit.streak + 1; // consecutive day
    } else {
      newStreak = 1; // gap — reset
    }
  }

  habit.streak   = newStreak;
  habit.done     = true;
  habit.lastDone = today;
  habit.missed   = false;

  return { habit, user, changed: true };
}

/**
 * Undo a habit completion — only allowed for today.
 *
 * @param {Object} habit - Mongoose Habit document
 * @returns {Object} { habit, allowed }
 */
function handleUndo(habit) {
  const today     = todayStr();
  const yesterday = yesterdayStr();

  if (!habit.done) {
    return { habit, allowed: false, reason: 'Habit is not marked as done' };
  }

  if (habit.lastDone !== today) {
    return { habit, allowed: false, reason: 'Undo only allowed for today' };
  }

  // Revert
  habit.done   = false;
  habit.streak = Math.max(0, habit.streak - 1);
  habit.lastDone = habit.streak > 0 ? yesterday : null;
  habit.missed = false;

  return { habit, allowed: true };
}

module.exports = { handleMarkDone, handleUndo };
