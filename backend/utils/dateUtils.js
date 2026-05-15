/* ══════════════════════════════════════════
   utils/dateUtils.js — Date Helper Functions
══════════════════════════════════════════ */

/** Returns today's date as a dateString, e.g. "Tue May 13 2026" */
function todayStr() {
  return new Date().toDateString();
}

/** Returns yesterday's dateString */
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toDateString();
}

/** Returns an array of 7 Date objects for the current week (Sun–Sat) */
function getWeekDates() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }
  return days;
}

/** Check if two dates are the same calendar day */
function isSameDay(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return a.getTime() === b.getTime();
}

module.exports = { todayStr, yesterdayStr, getWeekDates, isSameDay };
