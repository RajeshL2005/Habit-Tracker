/* ══════════════════════════════════════════
   services/resetService.js — Daily Reset Logic
   Runs once per day per user.
   RULES:
   ✅ done always resets to false on a new day
   ✅ streak is NEVER touched here
   ✅ lastDone is NEVER touched here
   ✅ missed is computed from lastDone vs yesterday
   ✅ Snapshots are saved BEFORE resetting done flags
══════════════════════════════════════════ */

const Habit    = require('../models/Habit');
const User     = require('../models/User');
const { todayStr } = require('../utils/dateUtils');
const { saveSnapshot } = require('./snapshotService');

/**
 * Perform daily reset for a user if a new day has started.
 * Called automatically when user fetches habits or logs in.
 *
 * @param {String} userId - The user's MongoDB _id
 */
async function performDailyReset(userId) {
  const today = todayStr();
  const user  = await User.findById(userId);
  if (!user) return;

  // ── SAME DAY: skip entirely ──
  if (user.lastResetDate === today) return;

  // ── FIRST TIME: set baseline, don't reset ──
  if (!user.lastResetDate) {
    user.lastResetDate = today;
    await user.save();
    return;
  }

  // ── NEW DAY: perform reset ──

  // 1. Save snapshot of yesterday's state BEFORE resetting done flags
  const habits = await Habit.find({ userId });
  const previousDate = user.lastResetDate; // this is yesterday (or the last active day)
  if (habits.length > 0) {
    await saveSnapshot(userId, previousDate, habits);
  }

  // 2. Monthly restore refresh
  const currentMonth = new Date().getMonth();
  if (user.lastRestoreMonth !== currentMonth) {
    user.restores = 2;
    user.lastRestoreMonth = currentMonth;
  }

  // 3. Build yesterday date for missed check
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // 4. Reset each habit: done=false, compute missed
  for (const habit of habits) {
    if (habit.lastDone) {
      const last = new Date(habit.lastDone);
      last.setHours(0, 0, 0, 0);
      habit.missed = last < yesterday;
    } else {
      habit.missed = false;
    }
    // ✅ Only reset done — streak and lastDone are UNTOUCHED
    habit.done = false;
    await habit.save();
  }

  // 5. Update user's last reset date
  user.lastResetDate = today;
  await user.save();
}

module.exports = { performDailyReset };
