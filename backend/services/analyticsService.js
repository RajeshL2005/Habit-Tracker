/* ══════════════════════════════════════════
   services/analyticsService.js — Analytics Calculations
   Computes weekly data, platform stats, and engagement metrics.
══════════════════════════════════════════ */

const User     = require('../models/User');
const Habit    = require('../models/Habit');
const Snapshot = require('../models/Snapshot');
const { getWeekDates, todayStr } = require('../utils/dateUtils');

/**
 * Get 7-day weekly data for a user's weekly streak graph.
 */
async function getWeeklyData(userId) {
  const weekDays = getWeekDates();
  const today    = todayStr();
  const habits   = await Habit.find({ userId });

  const days = [];
  for (const d of weekDays) {
    const dateStr = d.toDateString();
    const isFuture = d > new Date() && dateStr !== today;

    let done = 0, total = 0;
    if (dateStr === today) {
      done  = habits.filter(h => h.done).length;
      total = habits.length;
    } else if (!isFuture) {
      const snap = await Snapshot.findOne({ userId, date: dateStr });
      if (snap) {
        done  = snap.habits.filter(h => h.done).length;
        total = snap.habits.length;
      }
    }

    days.push({
      date: dateStr,
      dayName: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],
      dayNum: d.getDate(),
      done,
      total,
      isFuture,
      isToday: dateStr === today
    });
  }

  const totalCompleted = days.reduce((a, d) => a + d.done, 0);
  const sumTotals      = days.reduce((a, d) => a + d.total, 0);
  const completionPct  = sumTotals > 0 ? Math.round(totalCompleted / sumTotals * 100) : 0;

  return { days, totalCompleted, completionPct };
}

/**
 * Get platform-wide dashboard stats for admin.
 */
async function getPlatformStats() {
  const users     = await User.find({ role: 'user' }).select('-password');
  const allHabits = await Habit.find();

  const totalUsers      = users.length;
  const totalHabits     = allHabits.length;
  const completedToday  = allHabits.filter(h => h.done).length;
  const allStreaks       = allHabits.map(h => h.streak || 0);
  const avgStreak       = allStreaks.length
    ? (allStreaks.reduce((a, b) => a + b, 0) / allStreaks.length).toFixed(1)
    : 0;

  // Active users (at least one habit done today)
  const userHabitMap = {};
  allHabits.forEach(h => {
    if (!userHabitMap[h.userId]) userHabitMap[h.userId] = { habits: [], doneToday: 0 };
    userHabitMap[h.userId].habits.push(h);
    if (h.done) userHabitMap[h.userId].doneToday++;
  });
  const activeToday = Object.values(userHabitMap).filter(u => u.doneToday > 0).length;

  // Per-user habit counts (for bar chart)
  const habitsPerUser = [];
  for (const user of users) {
    const count = allHabits.filter(h => h.userId.toString() === user._id.toString()).length;
    habitsPerUser.push({ username: user.username, count });
  }

  // Top streakers
  const topStreakers = allHabits
    .filter(h => h.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);
  // Attach owner names
  const topStreakersWithNames = [];
  for (const h of topStreakers) {
    const owner = await User.findById(h.userId).select('username');
    topStreakersWithNames.push({
      name: h.name,
      owner: owner ? owner.username : 'Unknown',
      streak: h.streak
    });
  }

  return {
    totalUsers, totalHabits, completedToday,
    avgStreak: parseFloat(avgStreak),
    activeToday, habitsPerUser, topStreakers: topStreakersWithNames
  };
}

/**
 * Get analytics data for the admin analytics section.
 */
async function getAnalyticsData() {
  const users     = await User.find({ role: 'user' }).select('-password');
  const allHabits = await Habit.find();

  // Popular habits by name frequency
  const nameFreq = {};
  allHabits.forEach(h => { nameFreq[h.name] = (nameFreq[h.name] || 0) + 1; });
  const popularHabits = Object.entries(nameFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Completion distribution
  const done    = allHabits.filter(h => h.done).length;
  const pending = allHabits.length - done;
  const missed  = allHabits.filter(h => h.missed).length;

  // Engagement breakdown
  const total     = users.length;
  const active    = users.filter(u => {
    return allHabits.some(h => h.userId.toString() === u._id.toString() && h.done);
  }).length;
  const hasHabits = users.filter(u => {
    return allHabits.some(h => h.userId.toString() === u._id.toString());
  }).length;
  const streaking = users.filter(u => {
    return allHabits.some(h => h.userId.toString() === u._id.toString() && (h.streak || 0) >= 3);
  }).length;

  // Platform health
  const completionRate = allHabits.length > 0
    ? Math.round(done / allHabits.length * 100) : 0;
  const avgHabitsPerUser = total > 0
    ? (allHabits.length / total).toFixed(1) : '0';

  return {
    popularHabits,
    completion: { done, pending, missed },
    engagement: { total, active, hasHabits, streaking },
    health: {
      completionRate,
      totalUsers: total,
      avgHabitsPerUser: parseFloat(avgHabitsPerUser),
      totalHabits: allHabits.length
    }
  };
}

module.exports = { getWeeklyData, getPlatformStats, getAnalyticsData };
