/* ══════════════════════════════════════════
   HABIT TRACKER — script.js
   Full-Stack Version — API-driven via api.js
══════════════════════════════════════════ */

let currentUser     = null;
let habits          = [];
let pendingDeleteId = null;
let chartInstance   = null;
let weeklyChart     = null;
let calViewDate     = new Date();
let selectedDateStr = null;
let calendarCache   = {};
let weeklyCache     = null;
let selectedSnapHabits = [];

/* ══════════════════════════════════════════
   MOTIVATION QUOTES
══════════════════════════════════════════ */
const QUOTES = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Motivation gets you going, but discipline keeps you growing.", author: "John C. Maxwell" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "The secret of your future is hidden in your daily routine.", author: "Mike Murdock" },
  { text: "You don't rise to the level of your goals, you fall to the level of your systems.", author: "James Clear" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { text: "Chains of habit are too light to be felt until they are too heavy to be broken.", author: "Warren Buffett" },
  { text: "The difference between who you are and who you want to be is what you do.", author: "Bill Phillips" },
  { text: "It's not about having time, it's about making time.", author: "Unknown" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "First forget inspiration. Habit is more dependable.", author: "Octavia Butler" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "Consistency is the true foundation of trust.", author: "Roy T. Bennett" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent Van Gogh" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" }
];

let currentQuoteIdx = 0;
let quoteAutoTimer  = null;

function initMotivation() {
  const todaySeed = new Date().getDate() + new Date().getMonth() * 31;
  currentQuoteIdx = todaySeed % QUOTES.length;
  displayQuote(currentQuoteIdx, false);
  buildDots();
  startQuoteTimer();
}

function buildDots() {
  const dotsEl = document.getElementById('motivationDots');
  if (!dotsEl) return;
  dotsEl.innerHTML = '';
  QUOTES.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'motivation-dot' + (i === currentQuoteIdx ? ' active' : '');
    dot.addEventListener('click', () => { goToQuote(i); });
    dotsEl.appendChild(dot);
  });
}

function updateDots() {
  document.querySelectorAll('.motivation-dot').forEach((d, i) => {
    d.classList.toggle('active', i === currentQuoteIdx);
  });
}

function displayQuote(idx, animate = true) {
  const qEl = document.getElementById('motivationQuote');
  const aEl = document.getElementById('motivationAuthor');
  if (!qEl || !aEl) return;
  if (animate) {
    qEl.classList.add('fading');
    aEl.classList.add('fading');
    setTimeout(() => {
      qEl.textContent = QUOTES[idx].text;
      aEl.textContent = '— ' + QUOTES[idx].author;
      qEl.classList.remove('fading');
      aEl.classList.remove('fading');
    }, 400);
  } else {
    qEl.textContent = QUOTES[idx].text;
    aEl.textContent = '— ' + QUOTES[idx].author;
  }
  updateDots();
}

function goToQuote(idx) { currentQuoteIdx = idx; displayQuote(idx); restartQuoteTimer(); }
function refreshQuote() { currentQuoteIdx = (currentQuoteIdx + 1) % QUOTES.length; displayQuote(currentQuoteIdx); restartQuoteTimer(); }
function startQuoteTimer() { quoteAutoTimer = setInterval(() => { currentQuoteIdx = (currentQuoteIdx + 1) % QUOTES.length; displayQuote(currentQuoteIdx); }, 12000); }
function restartQuoteTimer() { clearInterval(quoteAutoTimer); startQuoteTimer(); }

/* ══════════════════════════════════════════
   RENDER — Uses in-memory habits array
══════════════════════════════════════════ */
async function loadHabitsFromServer() {
  try {
    const res = await api('/habits');
    habits = res.data.habits;
    if (res.data.user) currentUser = res.data.user;
  } catch (e) { habits = []; }
}

function render() {
  const list  = document.getElementById('habitList');
  const count = document.getElementById('habitCount');
  list.innerHTML = '';

  const isHistory   = !!selectedDateStr;
  let displayHabits = habits;

  if (isHistory) {
    displayHabits = selectedSnapHabits || [];
  }

  displayHabits.forEach(h => {
    const hId = h._id || h.id;
    const card = document.createElement('div');
    card.className = 'habit-card' + (h.done ? ' completed' : '') + (isHistory ? ' readonly' : '');
    card.innerHTML = `
      <div class="habit-info">
        <div class="habit-name">${escHtml(h.name)}</div>
        <span class="streak-badge">🔥 Streak: ${h.streak} days</span>
      </div>
      ${!isHistory ? `
      <div class="habit-actions">
        <button class="btn-done ${h.done ? 'active' : ''}" onclick="markDone('${hId}')">
          <i class="bi ${h.done ? 'bi-arrow-counterclockwise' : 'bi-check2'}"></i>
          ${h.done ? 'Undo' : 'Done'}
        </button>
        <button class="btn-delete" onclick="askDelete('${hId}')">
          <i class="bi bi-trash3"></i> Delete
        </button>
      </div>` : `
      <div class="habit-actions" style="display:flex;gap:6px;pointer-events:none;">
        <span style="font-size:0.78rem;padding:6px 12px;border-radius:8px;background:${h.done ? '#15803d' : '#374151'};color:#fff;font-weight:600;">
          ${h.done ? '✔ Done' : '✗ Not done'}
        </span>
      </div>`}
    `;
    list.appendChild(card);
  });

  if (displayHabits.length > 0) {
    count.innerHTML = `${isHistory ? 'Tracked' : 'You have'} ${displayHabits.length} habit${displayHabits.length > 1 ? 's' : ''}
      <span class="check-icon"><i class="bi bi-check2"></i></span>`;
  } else {
    count.innerHTML = isHistory ? `No habits existed on this day 📅` : `No habits yet. Add one above! 🌱`;
  }

  const addRow = document.getElementById('addHabitRow');
  if (addRow) addRow.style.display = isHistory ? 'none' : '';

  const banner = document.getElementById('dateViewBanner');
  const label  = document.getElementById('dateViewLabel');
  if (banner) {
    if (isHistory) { banner.style.display = ''; label.textContent = `Viewing: ${selectedDateStr}`; }
    else banner.style.display = 'none';
  }

  updateProgressHome(displayHabits);
  renderCalendar();
  renderWeeklyGraph();
}

/* ══════════════════════════════════════════
   ADD HABIT
══════════════════════════════════════════ */
async function addHabit() {
  if (!currentUser) { showToast("Please login first 🔒", "error"); openLogin(); return; }
  const input = document.getElementById('habitInput');
  const name  = input.value.trim();
  if (!name) return;
  try {
    const res = await api('/habits', { method: 'POST', body: JSON.stringify({ name }) });
    habits.push(res.data.habit);
    input.value = '';
    render();
  } catch (e) { /* toast shown by api() */ }
}

async function addFromTip(habitName) {
  if (!currentUser) { showToast("Please login first 🔒", "error"); openLogin(); return; }
  const exists = habits.some(h => h.name.toLowerCase() === habitName.toLowerCase());
  if (exists) { showToast('Habit already added!', 'error'); return; }
  try {
    const res = await api('/habits', { method: 'POST', body: JSON.stringify({ name: habitName }) });
    habits.push(res.data.habit);
    render();
    showToast(`"${habitName}" added from tips! ✨`, 'success');
  } catch (e) { /* toast shown by api() */ }
}

/* ══════════════════════════════════════════
   MARK DONE / UNDO — Server-side streak logic
══════════════════════════════════════════ */
async function markDone(id) {
  const habit = habits.find(h => (h._id || h.id) === id);
  if (!habit) return;

  try {
    if (habit.done) {
      // UNDO
      const res = await api(`/habits/${id}/undo`, { method: 'PUT' });
      const idx = habits.findIndex(h => (h._id || h.id) === id);
      if (idx !== -1) habits[idx] = res.data.habit;
      render();
    } else {
      // MARK DONE
      let useRestore = false;
      if (habit.missed && currentUser && currentUser.restores > 0) {
        useRestore = confirm(
          `⚠️ You missed "${habit.name}" yesterday!\n\nUse 1 restore to continue your streak?\n(${currentUser.restores} left)`
        );
      }
      const res = await api(`/habits/${id}/done`, {
        method: 'PUT',
        body: JSON.stringify({ useRestore })
      });
      const idx = habits.findIndex(h => (h._id || h.id) === id);
      if (idx !== -1) habits[idx] = res.data.habit;
      if (res.data.user) currentUser.restores = res.data.user.restores;
      render();
    }
  } catch (e) { /* toast shown by api() */ }
}

/* ══════════════════════════════════════════
   DELETE
══════════════════════════════════════════ */
function askDelete(id) { pendingDeleteId = id; openModal('deleteModal'); }

async function confirmDelete() {
  if (!pendingDeleteId) return;
  const name = (habits.find(h => (h._id||h.id) === pendingDeleteId) || {}).name || 'Habit';
  try {
    await api(`/habits/${pendingDeleteId}`, { method: 'DELETE' });
    habits = habits.filter(h => (h._id||h.id) !== pendingDeleteId);
    pendingDeleteId = null;
    closeModal('deleteModal');
    render();
    showToast(`🗑️ "${name}" deleted.`, 'error');
  } catch (e) { closeModal('deleteModal'); }
}

/* ══════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.add('show'); }
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
  if (id === 'loginModal')  { document.getElementById('loginUser').value = ''; document.getElementById('loginPass').value = ''; }
  if (id === 'signupModal') { document.getElementById('signupName').value = ''; document.getElementById('signupEmail').value = ''; document.getElementById('signupPass').value = ''; }
}
function openLogin() {
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  openModal('loginModal');
}
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('show'); });
});

/* ══════════════════════════════════════════
   AUTH
══════════════════════════════════════════ */
async function doLogin() {
  const userInput = document.getElementById('loginUser').value.trim();
  const passInput = document.getElementById('loginPass').value.trim();
  if (!userInput || !passInput) { showToast('Please fill all fields', 'error'); return; }
  try {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: userInput, password: passInput })
    });
    setToken(res.data.token);
    currentUser = res.data.user;
    habits = res.data.habits || [];
    closeModal('loginModal');
    updateNavForLoggedIn();
    render();
    showToast(res.message);
  } catch (e) { /* toast shown by api() */ }
}

function openSignup() {
  document.getElementById('signupName').value = '';
  document.getElementById('signupEmail').value = '';
  document.getElementById('signupPass').value = '';
  openModal('signupModal');
}

async function doSignup() {
  const username = document.getElementById('signupName').value.trim();
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPass').value.trim();
  if (!username || !email || !password) { showToast('Please fill all fields', 'error'); return; }
  try {
    const res = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    setToken(res.data.token);
    currentUser = res.data.user;
    habits = [];
    closeModal('signupModal');
    updateNavForLoggedIn();
    render();
    showToast(res.message);
  } catch (e) { /* toast shown by api() */ }
}

function logout() {
  clearToken();
  currentUser = null;
  habits = [];
  selectedDateStr = null;
  calendarCache = {};
  weeklyCache = null;
  // Redirect to unified login page
  window.location.href = '/login.html';
}

function updateNavForLoggedIn() {
  document.getElementById('btnLogin').style.display   = 'none';
  document.getElementById('btnSignup').style.display  = 'none';
  document.getElementById('btnProfile').style.display = '';
  document.getElementById('btnLogout').style.display  = '';
}

function updateNavForLoggedOut() {
  document.getElementById('btnLogin').style.display   = '';
  document.getElementById('btnSignup').style.display  = '';
  document.getElementById('btnProfile').style.display = 'none';
  document.getElementById('btnLogout').style.display  = 'none';
}

/* ══════════════════════════════════════════
   PROGRESS DASHBOARD
══════════════════════════════════════════ */
function updateProgressHome(displayHabits) {
  const src       = displayHabits !== undefined ? displayHabits : habits;
  const completed = src.filter(h => h.done).length;
  const pending   = src.filter(h => !h.done).length;
  const total     = src.length;
  const labelsEl  = document.getElementById('chartLabelsHome');
  const legendEl  = document.getElementById('legendListHome');
  if (!labelsEl || !legendEl) return;
  labelsEl.innerHTML = `Completed: ${completed} &nbsp;&nbsp; Pending: ${pending}`;
  legendEl.innerHTML = `
    <div class="legend-item"><span class="legend-label"><span class="legend-dot" style="background:#22c55e"></span>Completed</span><span class="legend-val">${completed}</span></div>
    <div class="legend-item"><span class="legend-label"><span class="legend-dot" style="background:#ef4444"></span>Pending</span><span class="legend-val">${pending}</span></div>
    <div class="legend-item"><span class="legend-label"><span class="legend-dot" style="background:#3b82f6"></span>Total Habits</span><span class="legend-val">${total}</span></div>
  `;
  if (chartInstance) chartInstance.destroy();
  const canvas = document.getElementById('progressChartHome');
  if (!canvas) return;
  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'pie',
    data: { labels: ['Completed','Pending','Total'], datasets: [{ data: [completed||0.001, pending||0.001, total||0.001], backgroundColor: ['#22c55e','#ef4444','#3b82f6'], borderWidth: 2 }] },
    options: { plugins: { legend: { display: false } } }
  });
}

/* ══════════════════════════════════════════
   WEEKLY STREAK GRAPH
══════════════════════════════════════════ */
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

async function renderWeeklyGraph() {
  const section    = document.getElementById('weeklyGraphSection');
  const rangeEl    = document.getElementById('weeklyRangeLabel');
  const badgesEl   = document.getElementById('weeklyBadges');
  const dayStatsEl = document.getElementById('weeklyDayStats');
  if (!section || !currentUser) return;

  // Fetch weekly data from API
  try {
    if (!weeklyCache) {
      const res = await api('/habits/weekly');
      weeklyCache = res.data;
    }
  } catch (e) { return; }

  const wd = weeklyCache;
  const weekDays    = wd.days;
  const DAY_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const counts = weekDays.map(d => d.done);
  const totals = weekDays.map(d => d.total);
  const labels = weekDays.map(d => d.dayName);

  const firstD = new Date(weekDays[0].date); const lastD = new Date(weekDays[6].date);
  rangeEl.textContent = `${MONTH_SHORT[firstD.getMonth()]} ${firstD.getDate()} – ${MONTH_SHORT[lastD.getMonth()]} ${lastD.getDate()}, ${lastD.getFullYear()}`;

  const totalCompleted = counts.reduce((a, b) => a + b, 0);
  const bestDayIdx     = counts.indexOf(Math.max(...counts));
  const sumTotals      = totals.reduce((a, b) => a + b, 0);
  const completionPct  = sumTotals > 0 ? Math.round(totalCompleted / sumTotals * 100) : 0;

  badgesEl.innerHTML = `
    <span class="weekly-badge total"><i class="bi bi-check2-all"></i> ${totalCompleted} completed this week</span>
    <span class="weekly-badge rate"><i class="bi bi-percent"></i> ${completionPct}% completion rate</span>
    ${counts[bestDayIdx] > 0 ? `<span class="weekly-badge best">🏆 Best: ${labels[bestDayIdx]} (${counts[bestDayIdx]})</span>` : ''}
  `;

  const barColors = weekDays.map((d, i) => {
    if (d.isFuture) return 'rgba(55,65,81,0.6)';
    if (counts[i] === 0) return 'rgba(55,65,81,0.8)';
    if (i === bestDayIdx && counts[i] > 0 && !d.isToday) return 'rgba(251,191,36,0.85)';
    if (d.isToday) return 'rgba(59,130,246,0.9)';
    return 'rgba(34,197,94,0.85)';
  });
  const borderColors = barColors.map(c => c.replace(/[\d.]+\)$/, '1)'));

  if (weeklyChart) { weeklyChart.destroy(); weeklyChart = null; }
  const canvas = document.getElementById('weeklyStreakChart');
  if (!canvas) return;

  weeklyChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Habits Completed', data: counts, backgroundColor: barColors, borderColor: borderColors, borderWidth: 1.5, borderRadius: 8, borderSkipped: false }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937', borderColor: '#374151', borderWidth: 1,
          titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 10,
          callbacks: {
            title: items => { const d = weekDays[items[0].dataIndex]; return `${d.dayName}, ${d.date}`; },
            label: item => { const done = counts[item.dataIndex]; const total = totals[item.dataIndex]; return total === 0 ? '  No habits tracked' : `  ${done} / ${total} habits completed`; }
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#94a3b8', font: { family: 'Poppins', size: 11 } }, border: { color: 'rgba(255,255,255,0.06)' } },
        y: { beginAtZero: true, max: Math.max(...counts, 1) + 1, ticks: { color: '#94a3b8', font: { family: 'Poppins', size: 11 }, stepSize: 1, precision: 0 }, grid: { color: 'rgba(255,255,255,0.05)' }, border: { color: 'rgba(255,255,255,0.06)' } }
      }
    }
  });

  dayStatsEl.innerHTML = '';
  weekDays.forEach((d, i) => {
    const isBest    = i === bestDayIdx && counts[i] > 0 && !d.isFuture;
    const isAllDone = totals[i] > 0 && counts[i] === totals[i];

    let pipClass = 'pip-future';
    if (!d.isFuture) {
      if      (counts[i] === 0 && totals[i] > 0) pipClass = 'pip-none';
      else if (isAllDone)                         pipClass = 'pip-full';
      else if (counts[i] > 0)                     pipClass = 'pip-partial';
    }

    let cardClass = 'wday-card';
    if (d.isToday)  cardClass += ' wday-today';
    if (isBest)     cardClass += ' wday-best';
    if (isAllDone)  cardClass += ' wday-all-done';

    const card = document.createElement('div');
    card.className = cardClass;
    card.innerHTML = `
      <div class="wday-name">${d.dayName}</div>
      <div class="wday-date">${d.dayNum}</div>
      <div class="wday-count ${counts[i] === 0 ? 'wday-zero' : ''}">${d.isFuture ? '—' : counts[i]}</div>
      <div class="wday-label">${d.isFuture ? 'upcoming' : totals[i] > 0 ? `/ ${totals[i]}` : 'no habits'}</div>
      <span class="wday-pip ${pipClass}"></span>
    `;
    dayStatsEl.appendChild(card);
  });
}

/* ══════════════════════════════════════════
   CALENDAR
══════════════════════════════════════════ */
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function calPrevMonth() {
  calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1);
  renderCalendar();
}

function calNextMonth() {
  const now = new Date();
  if (calViewDate.getFullYear() > now.getFullYear() || (calViewDate.getFullYear() === now.getFullYear() && calViewDate.getMonth() >= now.getMonth())) return;
  calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 1);
  renderCalendar();
}

async function renderCalendar() {
  const grid    = document.getElementById('calGrid');
  const titleEl = document.getElementById('calMonthTitle');
  const nextBtn = document.getElementById('calNextBtn');
  if (!grid || !titleEl) return;

  const now      = new Date();
  const todayStr = now.toDateString();
  const yr = calViewDate.getFullYear();
  const mo = calViewDate.getMonth();

  titleEl.textContent = `${MONTH_NAMES[mo]} ${yr}`;

  if (nextBtn) {
    const atCurrent = yr > now.getFullYear() || (yr === now.getFullYear() && mo >= now.getMonth());
    nextBtn.style.opacity       = atCurrent ? '0.3' : '1';
    nextBtn.style.pointerEvents = atCurrent ? 'none' : '';
  }

  // Fetch calendar data from API
  if (currentUser) {
    try {
      const res = await api(`/habits/calendar/${yr}/${mo}`);
      calendarCache = res.data.calendar || {};
    } catch (e) { calendarCache = {}; }
  }

  const firstDay    = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  grid.innerHTML    = '';

  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement('div');
    e.className = 'cal-day cal-empty';
    grid.appendChild(e);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj    = new Date(yr, mo, d);
    const dateStr    = dateObj.toDateString();
    const isFuture   = dateObj > now && dateStr !== todayStr;
    const isToday    = dateStr === todayStr;
    const isSelected = selectedDateStr === dateStr;

    let statusClass = '';
    if (!isFuture) {
      const calEntry = calendarCache[dateStr];
      if (calEntry && calEntry.total > 0) {
        statusClass = calEntry.done === calEntry.total ? 'cal-full' : calEntry.done > 0 ? 'cal-partial' : 'cal-none';
      }
    }

    const cell = document.createElement('div');
    cell.className = ['cal-day', isToday ? 'cal-today' : '', isFuture ? 'cal-future' : '', isSelected ? 'cal-selected' : '', statusClass].filter(Boolean).join(' ');
    cell.innerHTML = `<span>${d}</span><span class="cal-status-dot"></span>`;
    if (!isFuture) cell.addEventListener('click', () => selectCalDate(dateStr, isToday));
    grid.appendChild(cell);
  }
}

async function selectCalDate(dateStr, isToday) {
  if (dateStr === new Date().toDateString()) { backToToday(); return; }
  if (!currentUser) { showToast("Please login to view history 🔒", "error"); return; }
  try {
    const res = await api(`/habits/snapshot/${encodeURIComponent(dateStr)}`);
    const snap = res.data.snapshot;
    selectedDateStr = dateStr;
    selectedSnapHabits = snap ? snap.habits : [];
    render();
    showToast(snap ? `📅 Showing habits for ${dateStr}` : "No habits on this day 📅", 'success');
  } catch (e) {
    selectedDateStr = dateStr;
    selectedSnapHabits = [];
    render();
  }
}

async function backToToday() {
  selectedDateStr = null;
  weeklyCache = null;
  calendarCache = {};
  await loadHabitsFromServer();
  calViewDate = new Date();
  render();
  showToast("Back to today's habits ✅", "success");
}

/* ══════════════════════════════════════════
   PROFILE
══════════════════════════════════════════ */
async function openProfile() {
  if (!currentUser) { showToast('Please log in to view your profile.', 'error'); return; }
  try {
    const res = await api('/auth/profile');
    document.getElementById('profileNameDisplay').textContent = res.data.user.username;
    document.getElementById('statTotal').textContent          = res.data.stats.totalHabits;
    document.getElementById('statCurrent').textContent = res.data.stats.currentStreak + ' days';
    document.getElementById('statBest').textContent    = res.data.stats.bestStreak + ' days';
    openModal('profileModal');
  } catch (e) { /* toast shown by api() */ }
}

/* ══════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════ */
function scrollToHome() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ''; }, 3000);
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === "password") { input.type = "text"; icon.innerHTML = '<i class="bi bi-eye-slash"></i>'; }
  else { input.type = "password"; icon.innerHTML = '<i class="bi bi-eye"></i>'; }
}

/* ══════════════════════════════════════════
   INIT — Backend handles daily reset automatically.
   We just check for a saved token and load data from API.
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

  const token = getToken();
  if (token) {
    try {
      // Token exists — fetch habits from API (daily reset runs server-side)
      const res = await api('/habits');
      habits = res.data.habits || [];
      currentUser = res.data.user;
      updateNavForLoggedIn();
    } catch (e) {
      // Token invalid — clear and show logged-out state
      clearToken();
      currentUser = null;
      habits = [];
      updateNavForLoggedOut();
    }
  } else {
    updateNavForLoggedOut();
  }

  document.getElementById('habitInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addHabit();
  });

  document.querySelectorAll('.tip-item').forEach(tip => {
    tip.addEventListener('click', () => { addFromTip(tip.querySelector('strong').innerText); });
  });

  calViewDate = new Date();
  initMotivation();
  render();
});
