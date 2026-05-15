/* ══════════════════════════════════════════
   ADMIN PANEL — admin.js
   Full-Stack Version — API-driven via api.js
══════════════════════════════════════════ */

// ── Chart instances ──
let pieChartInst      = null;
let barChartInst      = null;
let popularChartInst  = null;
let distChartInst     = null;

let pendingDeleteUser = null;
let currentSection    = "dashboard";
let adminUser         = null;
let adminExistsFlag   = false;

/* ══════════════════════════════════════════
   ADMIN AUTH — SIGNUP + LOGIN
══════════════════════════════════════════ */

function adminExists() { return adminExistsFlag; }

async function checkAdminExists() {
  try {
    const res = await api('/admin/check');
    adminExistsFlag = res.data.exists;
  } catch (e) { adminExistsFlag = false; }
}

function openAdminLogin() {
  if (!adminExistsFlag) {
    openModal('adminSignupModal');
  } else {
    openModal('adminLoginModal');
  }
}

// ── SIGNUP ──
async function doAdminSignup() {
  const u  = document.getElementById('signupAdminUser').value.trim();
  const p  = document.getElementById('signupAdminPass').value.trim();
  const p2 = document.getElementById('signupAdminPass2').value.trim();

  if (!u || !p || !p2) { showToast('Please fill all fields ⚠️', 'error'); return; }
  if (u.length < 3) { showToast('Username must be at least 3 characters', 'error'); return; }
  if (p.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  if (p !== p2) { showToast('Passwords do not match ❌', 'error'); return; }

  try {
    const res = await api('/admin/signup', { method: 'POST', body: JSON.stringify({ username: u, password: p }) });
    setToken(res.data.token);
    adminUser = res.data.admin;
    adminExistsFlag = true;

    document.getElementById('signupAdminUser').value = '';
    document.getElementById('signupAdminPass').value = '';
    document.getElementById('signupAdminPass2').value = '';

    closeModal('adminSignupModal');
    showAdminPanel();
    showToast(res.message, 'success');
    updateLoginGateUI();
  } catch (e) { /* toast shown by api() */ }
}

async function doAdminLogin() {
  const u = document.getElementById('adminLoginUser').value.trim();
  const p = document.getElementById('adminLoginPass').value.trim();

  if (!u || !p) { showToast('Please fill all fields ⚠️', 'error'); return; }

  try {
    const res = await api('/admin/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) });
    setToken(res.data.token);
    adminUser = res.data.admin;
    closeModal('adminLoginModal');
    showAdminPanel();
    showToast(res.message, 'success');
  } catch (e) { /* toast shown by api() */ }
}

// ── LOGOUT ──
function adminLogout() {
  clearToken();
  adminUser = null;
  // Redirect to unified login page (admin tab)
  window.location.href = '/login.html?role=admin';
}

function showAdminPanel() {
  document.getElementById('loginGate').style.display  = 'none';
  document.getElementById('adminPanel').style.display = '';
  document.getElementById('btnAdminLogin').style.display  = 'none';
  document.getElementById('btnAdminLogout').style.display = '';
  loadDashboard();
}

// Update the login gate copy based on whether admin account exists
function updateLoginGateUI() {
  const titleEl  = document.getElementById('loginGateTitle');
  const subEl    = document.getElementById('loginGateSub');
  const btnEl    = document.getElementById('loginGateBtn');
  if (!titleEl) return;
  if (adminExistsFlag) {
    titleEl.textContent = 'Admin Login Required';
    subEl.textContent   = 'Enter your admin credentials to access the control panel.';
    btnEl.innerHTML     = '<i class="bi bi-shield-lock"></i> Admin Login';
    const loginLink = document.getElementById('loginSignupLink');
    if (loginLink) loginLink.style.display = 'none';
    if (adminUser) {
      const settingUser = document.getElementById('settingAdminUser');
      if (settingUser) settingUser.value = adminUser.username;
    }
  } else {
    titleEl.textContent = 'Create Admin Account';
    subEl.textContent   = 'No admin account found. Set up your credentials to get started.';
    btnEl.innerHTML     = '<i class="bi bi-person-plus-fill"></i> Create Admin Account';
  }
}

/* ══════════════════════════════════════════
   SECTION NAVIGATION
══════════════════════════════════════════ */
function showSection(name) {
  currentSection = name;

  // Hide all sections
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  document.getElementById('section-' + name).style.display = '';

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navMap = { dashboard: 0, users: 1, habits: 2 };
  if (navMap[name] !== undefined) document.querySelectorAll('.nav-btn')[navMap[name]].classList.add('active');

  // Update sidebar menu items
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  const mi = document.getElementById('menu-' + name);
  if (mi) mi.classList.add('active');

  // Load section data
  if (name === 'dashboard')  loadDashboard();
  if (name === 'users')      loadUsers();
  if (name === 'habits')     loadHabits();
  if (name === 'analytics')  loadAnalytics();
  if (name === 'activity')   loadActivityLog();
}

/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const res = await api('/admin/dashboard');
    const d = res.data;

    document.getElementById('statTotalUsers').textContent     = d.totalUsers;
    document.getElementById('statTotalHabits').textContent    = d.totalHabits;
    document.getElementById('statCompletedToday').textContent = d.completedToday;
    document.getElementById('statAvgStreak').textContent      = d.avgStreak;

    document.getElementById('sidebarUsers').textContent  = d.totalUsers;
    document.getElementById('sidebarHabits').textContent = d.totalHabits;
    document.getElementById('sidebarActive').textContent = d.activeToday;

    document.getElementById('dashDate').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    buildPieChart(d.completedToday, d.totalHabits - d.completedToday);
    buildBarChart(d.habitsPerUser);
    buildTopStreakers(d.topStreakers);
  } catch (e) { /* toast shown by api() */ }
}

function buildPieChart(done, pending) {
  if (pieChartInst) { pieChartInst.destroy(); pieChartInst = null; }
  const canvas = document.getElementById('adminPieChart');
  if (!canvas) return;
  const total = done + pending;
  pieChartInst = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{ data: [done||0.001, pending||0.001], backgroundColor: ['#22c55e','#374151'], borderWidth: 2, borderColor: '#111827' }]
    },
    options: { cutout: '65%', plugins: { legend: { display: false } } }
  });

  const pct = total > 0 ? Math.round(done/total*100) : 0;
  document.getElementById('adminPieLegend').innerHTML = `
    <div class="pie-legend-item">
      <span style="display:flex;align-items:center"><span class="pie-legend-dot" style="background:#22c55e"></span>Completed</span>
      <strong>${done}</strong>
    </div>
    <div class="pie-legend-item">
      <span style="display:flex;align-items:center"><span class="pie-legend-dot" style="background:#374151"></span>Pending</span>
      <strong>${pending}</strong>
    </div>
    <div class="pie-legend-item">
      <span style="display:flex;align-items:center"><span class="pie-legend-dot" style="background:#3b82f6"></span>Rate</span>
      <strong>${pct}%</strong>
    </div>
  `;
}

function buildBarChart(habitsPerUser) {
  if (barChartInst) { barChartInst.destroy(); barChartInst = null; }
  const canvas = document.getElementById('adminBarChart');
  if (!canvas) return;
  const users  = habitsPerUser || [];
  const labels = users.map(u => u.username);
  const data   = users.map(u => u.count);
  const colors = data.map((_, i) => `hsl(${210 + i*30}, 70%, 55%)`);
  const maxVal = Math.max(...data, 1);

  barChartInst = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Habits', data, backgroundColor: colors, borderRadius: 6, borderSkipped: false }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 8, bottom: 0, left: 0, right: 0 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          borderColor: '#374151',
          borderWidth: 1,
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          callbacks: { label: item => `  ${item.raw} habit${item.raw !== 1 ? 's' : ''}` }
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { family: 'Poppins', size: 11 } },
          grid: { display: false },
          border: { color: 'transparent' }
        },
        y: {
          beginAtZero: true,
          min: 0,
          suggestedMax: maxVal,   /* suggestedMax lets tallest bar reach near top without dead space */
          ticks: {
            color: '#94a3b8',
            stepSize: maxVal <= 5 ? 1 : Math.ceil(maxVal / 5),
            precision: 0,
            font: { family: 'Poppins', size: 11 }
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
          border: { color: 'transparent' }
        }
      }
    }
  });
}

function buildTopStreakers(allHabits) {
  const el = document.getElementById('topStreakers');
  if (!el) return;
  const sorted = [...allHabits].filter(h => h.streak > 0).sort((a,b) => b.streak - a.streak).slice(0, 5);

  if (!sorted.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔥</div>No active streaks yet.</div>';
    return;
  }

  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
  el.innerHTML = sorted.map((h, i) => `
    <div class="streaker-row">
      <div class="streaker-rank">${medals[i]}</div>
      <div class="streaker-info">
        <div class="streaker-name">${escHtml(h.name)}</div>
        <div class="streaker-habit">by @${escHtml(h.owner)}</div>
      </div>
      <span class="streaker-streak">🔥 ${h.streak} days</span>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════
   USERS
══════════════════════════════════════════ */
let allUsersCache = [];

async function loadUsers() {
  try {
    const res = await api('/admin/users');
    allUsersCache = res.data.users || [];
    renderUsersTable(allUsersCache);
    populateUserFilter();
  } catch (e) { /* toast shown by api() */ }
}

function renderUsersTable(users) {
  const tbody  = document.getElementById('usersTableBody');
  const badge  = document.getElementById('usersCountBadge');
  badge.textContent = users.length;

  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">👤</div>No users found.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = users.map((u, i) => {
    return `
      <tr>
        <td><strong>${i+1}</strong></td>
        <td><strong>@${escHtml(u.username)}</strong></td>
        <td style="color:#93c5fd">${escHtml(u.email)}</td>
        <td>${u.habitCount}</td>
        <td>${u.doneToday > 0 ? `<span class="table-badge badge-done">✔ ${u.doneToday} / ${u.habitCount}</span>` : `<span class="table-badge badge-pending">— 0</span>`}</td>
        <td><span class="streaker-streak" style="font-size:0.7rem">🔥 ${u.bestStreak} days</span></td>
        <td>${u.restores ?? 2}</td>
        <td>
          <div class="table-actions">
            <button class="btn-table view" onclick="viewUserDetail('${u._id}')"><i class="bi bi-eye"></i> View</button>
            <button class="btn-table del"  onclick="askDeleteUser('${u._id}')"><i class="bi bi-trash3"></i> Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterUsers() {
  const q = document.getElementById('userSearch').value.toLowerCase();
  const filtered = allUsersCache.filter(u =>
    u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
  renderUsersTable(filtered);
}

async function viewUserDetail(userId) {
  try {
    const res = await api(`/admin/users/${userId}`);
    const u = res.data.user;
    const habits = res.data.habits || [];
    const stats = res.data.stats;

    document.getElementById('detailUsername').textContent = u.username;
    document.getElementById('detailEmail').textContent    = u.email;
    document.getElementById('detailTotal').textContent    = stats.total;
    document.getElementById('detailBest').textContent     = stats.bestStreak + ' days';
    document.getElementById('detailDone').textContent     = stats.doneToday;
    document.getElementById('detailRestores').textContent = u.restores ?? 2;

    const habitsEl = document.getElementById('detailHabitsList');
    if (habits.length) {
      habitsEl.innerHTML = habits.map(h => `
        <div class="detail-habit-item">
          <span>${escHtml(h.name)}</span>
          <span>${h.done ? '<span style="color:#4ade80">✔ Done</span>' : '<span style="color:#94a3b8">Pending</span>'}</span>
        </div>
      `).join('');
    } else {
      habitsEl.innerHTML = '<div style="color:#6b7280;font-size:0.8rem;text-align:center;padding:12px">No habits yet</div>';
    }
    openModal('userDetailModal');
  } catch (e) { /* toast shown by api() */ }
}

function askDeleteUser(userId) {
  pendingDeleteUser = userId;
  openModal('deleteUserModal');
}

async function confirmDeleteUser() {
  if (!pendingDeleteUser) return;
  try {
    const res = await api(`/admin/users/${pendingDeleteUser}`, { method: 'DELETE' });
    showToast(res.message, 'error');
    pendingDeleteUser = null;
    closeModal('deleteUserModal');
    loadUsers();
    loadDashboard();
  } catch (e) {
    pendingDeleteUser = null;
    closeModal('deleteUserModal');
  }
}

/* ══════════════════════════════════════════
   HABITS
══════════════════════════════════════════ */
let allHabitsCache = [];

async function loadHabits() {
  try {
    const res = await api('/admin/habits');
    allHabitsCache = res.data.habits || [];
    renderHabitsTable(allHabitsCache);
    populateUserFilter();
  } catch (e) {}
}

function populateUserFilter() {
  const sel = document.getElementById('habitFilterUser');
  if (!sel) return;
  const existing = Array.from(sel.options).map(o => o.value);
  const owners = [...new Set(allHabitsCache.map(h => h.owner).concat(allUsersCache.map(u => u.username)))];
  owners.forEach(name => {
    if (!existing.includes(name)) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = '@' + name;
      sel.appendChild(opt);
    }
  });
}

function renderHabitsTable(habits) {
  const tbody = document.getElementById('habitsTableBody');
  const badge = document.getElementById('habitsCountBadge');
  badge.textContent = habits.length;
  if (!habits.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div>No habits found.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = habits.map((h, i) => {
    const lastDone = h.lastDone ? new Date(h.lastDone).toLocaleDateString() : '—';
    return `<tr>
      <td><strong>${i+1}</strong></td>
      <td><strong>${escHtml(h.name)}</strong></td>
      <td><span style="color:#93c5fd">@${escHtml(h.owner)}</span></td>
      <td><span class="streaker-streak" style="font-size:0.7rem">🔥 ${h.streak||0}</span></td>
      <td>${h.done ? '<span class="table-badge badge-done">✔ Done</span>' : '<span class="table-badge badge-pending">Pending</span>'}</td>
      <td style="color:#6b7280">${lastDone}</td>
      <td><div class="table-actions"><button class="btn-table del" onclick="deleteHabitAdmin('${h._id}')"><i class="bi bi-trash3"></i> Remove</button></div></td>
    </tr>`;
  }).join('');
}

function filterHabits() {
  const q    = document.getElementById('habitSearch').value.toLowerCase();
  const user = document.getElementById('habitFilterUser').value;
  const filtered = allHabitsCache.filter(h =>
    h.name.toLowerCase().includes(q) && (user === '' || h.owner === user)
  );
  renderHabitsTable(filtered);
}

async function deleteHabitAdmin(habitId) {
  if (!confirm('Remove this habit?')) return;
  try {
    const res = await api(`/admin/habits/${habitId}`, { method: 'DELETE' });
    showToast(res.message, 'error');
    loadHabits();
    loadDashboard();
  } catch (e) {}
}

/* ══════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════ */
async function loadAnalytics() {
  try {
    const res = await api('/admin/analytics');
    const d = res.data;
    const sortedNames = (d.popularHabits||[]).map(h => [h.name, h.count]);
    buildPopularChart(sortedNames);
    buildDistChartFromAPI(d.completion);
    buildEngagementFromAPI(d.engagement);
    buildHealthFromAPI(d.health);
  } catch (e) {}
}

function buildPopularChart(sortedNames) {
  if (popularChartInst) { popularChartInst.destroy(); popularChartInst = null; }
  const canvas = document.getElementById('popularHabitsChart');
  if (!canvas) return;

  popularChartInst = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: sortedNames.map(([n]) => n.length > 16 ? n.slice(0,16)+'…' : n),
      datasets: [{
        label: 'Users with this habit',
        data: sortedNames.map(([,c]) => c),
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8', font: { family: 'Poppins', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: 'transparent' } },
        y: { ticks: { color: '#94a3b8', font: { family: 'Poppins', size: 11 } }, grid: { display: false }, border: { color: 'transparent' } }
      }
    }
  });
}

function buildDistChartFromAPI(c) {
  if (distChartInst) { distChartInst.destroy(); distChartInst = null; }
  const canvas = document.getElementById('completionDistChart');
  if (!canvas) return;
  distChartInst = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: { labels: ['Completed','Pending','Missed'], datasets: [{ data: [c.done||0.001,c.pending||0.001,c.missed||0.001], backgroundColor: ['#22c55e','#3b82f6','#ef4444'], borderWidth: 2, borderColor: '#111827' }] },
    options: { cutout: '60%', plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Poppins', size: 11 }, padding: 14 } } } }
  });
}

function buildEngagementFromAPI(eng) {
  const el = document.getElementById('engagementBreakdown');
  if (!el) return;
  const rows = [
    { label: 'Active Today', val: eng.active, total: eng.total },
    { label: 'Have Habits', val: eng.hasHabits, total: eng.total },
    { label: '3+ Day Streak', val: eng.streaking, total: eng.total }
  ];
  el.innerHTML = rows.map(r => {
    const pct = r.total > 0 ? Math.round(r.val/r.total*100) : 0;
    return `<div class="engagement-item"><span style="font-size:0.82rem;min-width:130px">${r.label}</span><div class="engagement-bar-wrap"><div class="engagement-bar" style="width:${pct}%"></div></div><span style="font-size:0.78rem;font-weight:600;min-width:50px;text-align:right">${r.val} / ${r.total}</span></div>`;
  }).join('');
}

function buildHealthFromAPI(h) {
  const el = document.getElementById('platformHealth');
  if (!el) return;
  el.innerHTML = `
    <div class="health-item"><span><span class="health-icon">📊</span>Completion Rate</span><span class="health-status ${h.completionRate>=60?'status-good':h.completionRate>=30?'status-warn':'status-crit'}">${h.completionRate}%</span></div>
    <div class="health-item"><span><span class="health-icon">👥</span>Total Users</span><span class="health-status ${h.totalUsers>0?'status-good':'status-warn'}">${h.totalUsers}</span></div>
    <div class="health-item"><span><span class="health-icon">📋</span>Avg Habits / User</span><span class="health-status status-good">${h.avgHabitsPerUser}</span></div>
    <div class="health-item"><span><span class="health-icon">🔥</span>Total Habits</span><span class="health-status ${h.totalHabits>0?'status-good':'status-warn'}">${h.totalHabits}</span></div>
  `;
}

/* ══════════════════════════════════════════
   ACTIVITY LOG
══════════════════════════════════════════ */
async function loadActivityLog() {
  const el = document.getElementById('activityLog');
  if (!el) return;
  try {
    const res = await api('/admin/logs');
    const logs = res.data.logs || [];
    if (!logs.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div>No activity recorded yet.</div>';
      return;
    }
    el.innerHTML = logs.map(a => {
      const d = new Date(a.timestamp);
      return `<div class="activity-item"><span class="activity-dot dot-${a.dotColor}"></span><span class="activity-text">${escHtml(a.message)}</span><span class="activity-time">${d.toLocaleDateString()} ${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>`;
    }).join('');
  } catch (e) {}
}

function refreshActivityLog() { loadActivityLog(); showToast('Activity log refreshed ✅', 'success'); }

/* ══════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════ */
async function saveAdminSettings() {
  const newUser = document.getElementById('settingAdminUser').value.trim();
  const newPass = document.getElementById('settingAdminPass').value.trim();
  if (!newUser) { showToast('Username cannot be empty', 'error'); return; }
  if (newPass && newPass.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  try {
    const body = {};
    if (newUser) body.username = newUser;
    if (newPass) body.password = newPass;
    await api('/admin/settings', { method: 'PUT', body: JSON.stringify(body) });
    document.getElementById('settingAdminPass').value = '';
    showToast('Settings saved ✅', 'success');
  } catch (e) {}
}

function saveToggle(el, key) {
  const settings = JSON.parse(localStorage.getItem('habitAdminSettings') || '{}');
  settings[key] = el.checked;
  localStorage.setItem('habitAdminSettings', JSON.stringify(settings));
  showToast('Setting updated', 'success');
}

function confirmResetAllHabits() {
  document.getElementById('dangerMsg').textContent = 'This will mark ALL habits as not done for all users. Streaks are preserved.';
  document.getElementById('dangerConfirmBtn').onclick = doResetAllHabits;
  openModal('dangerModal');
}

async function doResetAllHabits() {
  try {
    await api('/admin/reset-habits', { method: 'POST' });
    closeModal('dangerModal');
    showToast('All habits reset ✅', 'success');
    loadDashboard();
  } catch (e) { closeModal('dangerModal'); }
}

function confirmClearLogs() {
  document.getElementById('dangerMsg').textContent = 'This will permanently delete all activity logs.';
  document.getElementById('dangerConfirmBtn').onclick = doClearLogs;
  openModal('dangerModal');
}

async function doClearLogs() {
  try {
    await api('/admin/logs', { method: 'DELETE' });
    closeModal('dangerModal');
    showToast('Activity logs cleared', 'success');
  } catch (e) { closeModal('dangerModal'); }
}

/* ══════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('show'); });
});

/* ══════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ''; }, 3000);
}

function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; icon.innerHTML = '<i class="bi bi-eye-slash"></i>'; }
  else { input.type = 'password'; icon.innerHTML = '<i class="bi bi-eye"></i>'; }
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved toggle states (cosmetic, kept in localStorage)
  const settings = JSON.parse(localStorage.getItem('habitAdminSettings') || '{}');
  if (settings.registrations !== undefined) document.getElementById('toggleRegistrations').checked = settings.registrations;
  if (settings.deletion      !== undefined) document.getElementById('toggleDeletion').checked      = settings.deletion;
  if (settings.restores      !== undefined) document.getElementById('toggleRestores').checked      = settings.restores;

  // Check if admin account exists on the server
  await checkAdminExists();
  updateLoginGateUI();

  // Auto-open panel if token exists and valid
  const token = getToken();
  if (token) {
    try {
      // Verify token is still valid by making a test API call
      await api('/admin/dashboard');
      adminUser = { username: 'admin' };
      showAdminPanel();
    } catch (e) {
      clearToken();
    }
  }

  // Enter key support
  ['adminLoginUser','adminLoginPass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doAdminLogin(); });
  });
  ['signupAdminUser','signupAdminPass','signupAdminPass2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doAdminSignup(); });
  });
});
