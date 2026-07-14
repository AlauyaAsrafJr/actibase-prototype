// Player Module — plain HTML/CSS/vanilla JS implementation.
// Same architecture as js/app.js and js/coach-app.js: one mutable
// `state`, template-string render functions, `data-action` event
// delegation. No framework, no modals — mostly read-only views plus an
// editable profile.

const PAGE_TITLES = {
  dashboard: ['Dashboard', 'Your personal snapshot of attendance, activities and evaluations'],
  profile: ['My profile', 'Your player profile and contact details'],
  attendance: ['Attendance', 'Your session-by-session attendance record'],
  activities: ['Training activities', 'Drills and exercises assigned to you by your coach'],
  evaluations: ['Evaluations', 'Your coach’s performance feedback over time'],
  stats: ['Statistics', 'Your standing and progress across the season'],
  settings: ['Settings', 'Account and notification configuration'],
};

const state = {
  page: 'dashboard', profileOpen: false, notifOpen: false,

  attendance: makeAttendance(), activities: makePlayerActivities(), evaluations: makePlayerEvaluations(), teammates: makeTeammates(),
  dateFilter: 'all',

  profile: { ...INITIAL_PLAYER_PROFILE },
  profileEditing: false, profileDraft: null,

  toast: null,
};
let toastTimer = null;

// ---- utils ----

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showToast(msg) {
  clearTimeout(toastTimer);
  state.toast = msg;
  toastTimer = setTimeout(() => { state.toast = null; render(); }, 2500);
}

function getInitials(name) {
  return name.split(' ').map((w) => w[0]).join('');
}

// ---- render: sidebar / topbar ----

function renderSidebar() {
  const navItems = [
    ['dashboard', 'Dashboard', 'dashboard'],
    ['profile', 'My Profile', 'profile'],
    ['attendance', 'Attendance', 'attendance'],
    ['activities', 'Training Activities', 'trainingActivities'],
    ['evaluations', 'Evaluations', 'evaluations'],
    ['stats', 'Statistics', 'activities'],
    ['settings', 'Settings', 'settings'],
  ];
  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-mark">A</div>
        <div class="sidebar-brand-name">ACTIBASE</div>
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(([key, label, icon]) => `
          <button type="button" class="nav-btn${state.page === key ? ' is-active' : ''}" data-action="go-page" data-page="${key}">
            ${ICONS[icon]()}
            ${esc(label)}
          </button>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <button type="button" class="logout-btn" data-action="logout">
          ${ICONS.logout()}
          Log out
        </button>
      </div>
    </aside>
  `;
}

function renderTopbar() {
  const [title, subtitle] = PAGE_TITLES[state.page];
  const initials = getInitials(state.profile.name);
  return `
    <header class="topbar">
      <div class="topbar-heading">
        <h1>${esc(title)}</h1>
        <div class="topbar-subtitle">${esc(subtitle)}</div>
      </div>
      <div class="menu-anchor">
        <button type="button" class="icon-btn" data-action="toggle-notif" aria-label="Notifications" aria-haspopup="true" aria-expanded="${state.notifOpen}" aria-controls="notifMenu">
          ${ICONS.bell()}
          <span class="badge-dot"></span>
        </button>
        ${state.notifOpen ? `
          <div class="menu-panel notif-panel" id="notifMenu" role="menu">
            <div class="menu-panel-title">Notifications</div>
            <div class="menu-panel-item">Practice scheduled today at 4:00 PM — Main Gym.</div>
            <div class="menu-panel-item">Coach Bailey posted a new evaluation for you.</div>
            <div class="menu-panel-item">Your attendance rate improved this week.</div>
          </div>
        ` : ''}
      </div>
      <div class="menu-anchor">
        <button type="button" class="profile-btn" data-action="toggle-profile" aria-haspopup="true" aria-expanded="${state.profileOpen}" aria-controls="profileMenu">
          <div class="avatar">${esc(initials)}</div>
          <div class="profile-name-block">
            <div class="profile-name">${esc(state.profile.name)}</div>
            <div class="profile-role">${esc(state.profile.position)} · ${esc(state.profile.sport)}</div>
          </div>
          ${ICONS.chevronDown()}
        </button>
        ${state.profileOpen ? `
          <div class="menu-panel profile-panel" id="profileMenu" role="menu">
            <button type="button" class="menu-btn" data-action="go-page" data-page="profile" role="menuitem">My profile</button>
            <button type="button" class="menu-btn" data-action="go-page" data-page="settings" role="menuitem">Account settings</button>
            <button type="button" class="menu-btn danger" data-action="logout" role="menuitem">Log out</button>
          </div>
        ` : ''}
      </div>
    </header>
  `;
}

// ---- render: pages ----

function renderDashboard() {
  const presentSessions = state.attendance.filter((a) => a.status === 'Present' || a.status === 'Late');
  const countedSessions = state.attendance.filter((a) => a.status !== 'Upcoming');
  const rateNum = Math.round((presentSessions.length / countedSessions.length) * 100);
  const upcomingSessions = state.attendance.filter((a) => a.status === 'Upcoming').length;
  const latestEval = state.evaluations[0];
  const latestEvalAvg = latestEval ? (Object.values(latestEval.scores).reduce((a, b) => a + b, 0) / 4).toFixed(1) : '—';
  const teamSorted = [...state.teammates].sort((a, b) => b.attendance - a.attendance);
  const myRank = teamSorted.findIndex((t) => t.name === state.profile.name) + 1;

  const statCards = [
    { label: 'Attendance Rate', value: rateNum + '%', icon: 'attendance' },
    { label: 'Sessions Attended', value: presentSessions.length, icon: 'sessions' },
    { label: 'Upcoming Sessions', value: upcomingSessions, icon: 'clock' },
    { label: 'Latest Evaluation Score', value: latestEvalAvg + '/5', icon: 'evaluations' },
    { label: 'Activities Completed', value: state.activities.length, icon: 'activities' },
    { label: 'Overall Rank', value: '#' + myRank + ' of ' + teamSorted.length, icon: 'rank' },
  ];

  const trendSource = state.attendance.filter((a) => a.status !== 'Upcoming').slice(0, 6).reverse();
  const trendVals = trendSource.map((a) => (a.status === 'Present' ? 100 : (a.status === 'Late' ? 70 : 0)));
  const attendanceTrendBars = trendSource.map((a, i) => {
    const x = i * 66 + 8;
    const h = trendVals[i] * 1.3;
    return { x, y: 150 - h, h, lx: x + 20, label: a.date.replace(', 2026', '').replace('Jul ', '7/').replace('Jun ', '6/') };
  });

  const evalSource = [...state.evaluations].reverse();
  const evalAvgs = evalSource.map((e) => Object.values(e.scores).reduce((a, b) => a + b, 0) / 4);
  const evalTrendDots = evalSource.map((e, i) => {
    const x = i * 120 + 40;
    const y = 150 - (evalAvgs[i] / 5) * 130;
    return { x, y, label: e.date.replace(', 2026', '').replace('Jul ', '7/').replace('Jun ', '6/').replace('May ', '5/') };
  });
  const evalTrendPoints = evalTrendDots.map((d) => d.x + ',' + d.y).join(' ');

  const catCounts = {};
  state.activities.forEach((a) => { catCounts[a.category] = (catCounts[a.category] || 0) + 1; });
  const maxCat = Math.max(...Object.values(catCounts), 1);
  const activityBreakdown = Object.keys(catCounts).map((cat) => ({ category: cat, count: catCounts[cat], pct: Math.round((catCounts[cat] / maxCat) * 100) + '%' }));

  return `
    <div class="stat-grid" style="--cols:3">
      ${statCards.map((c) => `
        <div class="card elev-sm stat-card">
          <div class="stat-card-icon">${ICONS[c.icon]()}</div>
          <div class="card-title stat-card-value">${esc(c.value)}</div>
          <div class="stat-card-label">${esc(c.label)}</div>
        </div>
      `).join('')}
    </div>

    <div class="split-grid">
      <div class="card elev-sm dashboard-card">
        <div class="card-title" style="margin-bottom:14px">Attendance trend</div>
        <svg width="100%" height="160" viewBox="0 0 400 160" style="overflow:visible">
          ${attendanceTrendBars.map((b) => `
            <g>
              <rect x="${b.x}" y="${b.y}" width="40" height="${b.h}" fill="var(--color-accent)"></rect>
              <text x="${b.lx}" y="152" font-size="11" fill="var(--color-text)" opacity="0.6" text-anchor="middle" font-family="var(--font-body)">${esc(b.label)}</text>
            </g>
          `).join('')}
        </svg>
      </div>
      <div class="card elev-sm dashboard-card">
        <div class="card-title" style="margin-bottom:14px">Evaluation scores over time</div>
        <svg width="100%" height="160" viewBox="0 0 400 160" style="overflow:visible">
          <polyline points="${evalTrendPoints}" fill="none" stroke="var(--color-accent)" stroke-width="3"></polyline>
          ${evalTrendDots.map((d) => `
            <g>
              <circle cx="${d.x}" cy="${d.y}" r="4" fill="var(--color-accent)"></circle>
              <text x="${d.x}" y="152" font-size="11" fill="var(--color-text)" opacity="0.6" text-anchor="middle" font-family="var(--font-body)">${esc(d.label)}</text>
            </g>
          `).join('')}
        </svg>
      </div>
    </div>

    <div class="card elev-sm dashboard-card">
      <div class="card-title" style="margin-bottom:14px">Activity participation breakdown</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${activityBreakdown.map((a) => `
          <div>
            <div class="progress-row"><span>${esc(a.category)}</span><span class="progress-row-value">${a.count} sessions</span></div>
            <div class="progress-track"><div class="progress-fill" style="width:${a.pct}"></div></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderProfile() {
  const p = state.profile;
  const initials = getInitials(p.name);

  return `
    <div class="card elev-sm profile-card">
      <div class="profile-card-header">
        <div class="profile-avatar-lg">${esc(initials)}</div>
        <div>
          <div class="card-title" style="margin:0">${esc(p.name)}</div>
          <div style="opacity:0.65;font-size:13.5px">${esc(p.year)} · ${esc(p.position)} · ${esc(p.sport)}</div>
        </div>
      </div>

      ${state.profileEditing ? `
        <div class="dialog-field-stack">
          <div class="field"><label>Full name</label><input id="profileDraftName" type="text" class="input" value="${esc(state.profileDraft.name)}" data-action="profile-draft-name" /></div>
          <div class="field"><label>Position</label><input id="profileDraftPosition" type="text" class="input" value="${esc(state.profileDraft.position)}" data-action="profile-draft-position" /></div>
          <div class="field"><label>Email</label><input id="profileDraftEmail" type="text" class="input" value="${esc(state.profileDraft.email)}" data-action="profile-draft-email" /></div>
          <div class="field"><label>Phone</label><input id="profileDraftPhone" type="text" class="input" value="${esc(state.profileDraft.phone)}" data-action="profile-draft-phone" /></div>
          <div class="field"><label>Bio</label><textarea id="profileDraftBio" class="input" rows="3" data-action="profile-draft-bio">${esc(state.profileDraft.bio)}</textarea></div>
        </div>
        <div class="dialog-actions" style="padding:0;margin-top:18px">
          <button type="button" class="btn btn-secondary" data-action="cancel-edit-profile">Cancel</button>
          <button type="button" class="btn btn-primary" data-action="save-profile">Save changes</button>
        </div>
      ` : `
        <div class="detail-rows" style="margin-bottom:18px">
          <div class="detail-row"><span class="detail-row-key">Email</span><span class="detail-row-value">${esc(p.email)}</span></div>
          <div class="detail-row"><span class="detail-row-key">Phone</span><span class="detail-row-value">${esc(p.phone)}</span></div>
          <div class="detail-row"><span class="detail-row-key">Coach</span><span class="detail-row-value">${esc(p.coach)}</span></div>
          <div class="detail-row"><span class="detail-row-key">Attendance rate</span><span class="detail-row-value">${p.attendance}%</span></div>
        </div>
        <p class="card-body" style="margin-bottom:18px">${esc(p.bio)}</p>
        <button type="button" class="btn btn-primary" data-action="edit-profile">Edit profile</button>
      `}
    </div>
  `;
}

function renderAttendance() {
  const statusTagClass = { Present: 'tag tag-accent', Late: 'tag tag-outline', Absent: 'tag tag-neutral', Upcoming: 'tag tag-outline' };
  const filtered = state.attendance
    .filter((a) => state.dateFilter === 'all' || a.date === 'Jul 14, 2026' || a.date === 'Jul 12, 2026' || a.date === 'Jul 9, 2026')
    .map((a) => ({ ...a, statusTagClass: statusTagClass[a.status] || 'tag tag-neutral' }));

  return `
    <div class="filter-bar">
      <div class="seg">
        <label class="seg-opt"><input type="radio" name="date-filter" data-action="date-all" ${state.dateFilter === 'all' ? 'checked' : ''} />All dates</label>
        <label class="seg-opt"><input type="radio" name="date-filter" data-action="date-week" ${state.dateFilter === 'week' ? 'checked' : ''} />This week</label>
      </div>
    </div>
    <div class="card elev-sm table-card">
      <div class="table-scroll"><table class="table">
        <thead><tr><th>Date</th><th>Type</th><th>Location</th><th>Status</th></tr></thead>
        <tbody>
          ${filtered.map((a) => `
            <tr>
              <td style="font-weight:600">${esc(a.date)}</td>
              <td style="opacity:0.75">${esc(a.type)}</td>
              <td style="opacity:0.75">${esc(a.location)}</td>
              <td><span class="${a.statusTagClass}">${esc(a.status)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>
    </div>
  `;
}

function renderActivities() {
  const difficultyTagClass = { Beginner: 'tag tag-outline', Intermediate: 'tag tag-neutral', Advanced: 'tag tag-accent' };
  const rows = state.activities.map((a) => ({ ...a, difficultyTagClass: difficultyTagClass[a.difficulty] || 'tag tag-neutral' }));

  return `
    <div class="activities-grid">
      ${rows.map((a) => `
        <div class="card elev-sm activity-card">
          <div class="activity-card-header">
            <div class="card-title" style="margin:0">${esc(a.name)}</div>
            <span class="${a.difficultyTagClass}">${esc(a.difficulty)}</span>
          </div>
          <div class="activity-card-tags">
            <span class="tag tag-neutral">${esc(a.category)}</span>
            <span class="tag tag-outline">${esc(a.duration)}</span>
          </div>
          <p class="card-body" style="margin:0">${esc(a.description)}</p>
          <div style="font-size:12px;opacity:0.55">Assigned ${esc(a.date)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderEvaluations() {
  const rows = state.evaluations.map((e) => ({
    ...e,
    categoryScores: PLAYER_EVAL_CATEGORIES.map((cat) => ({ label: cat.label, score: e.scores[cat.key], pct: Math.round((e.scores[cat.key] / 5) * 100) + '%' })),
  }));

  return `
    <div style="display:flex;flex-direction:column;gap:14px">
      ${rows.map((e) => `
        <div class="card elev-sm dashboard-card">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
            <div class="card-title" style="margin:0">${esc(e.date)}</div>
            <span style="font-size:12px;opacity:0.55">By ${esc(e.coach)}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px">
            ${e.categoryScores.map((cs) => `
              <div>
                <div style="font-size:12px;opacity:0.6;margin-bottom:4px">${esc(cs.label)}</div>
                <div class="progress-track"><div class="progress-fill" style="width:${cs.pct}"></div></div>
                <div style="font-size:12px;margin-top:3px;font-weight:600">${cs.score}/5</div>
              </div>
            `).join('')}
          </div>
          <p class="card-body" style="margin:0">${esc(e.comment)}</p>
        </div>
      `).join('')}
    </div>
  `;
}

function renderStats() {
  const presentSessions = state.attendance.filter((a) => a.status === 'Present' || a.status === 'Late');
  const countedSessions = state.attendance.filter((a) => a.status !== 'Upcoming');
  const rateNum = Math.round((presentSessions.length / countedSessions.length) * 100);
  const latestEval = state.evaluations[0];
  const latestEvalAvg = latestEval ? (Object.values(latestEval.scores).reduce((a, b) => a + b, 0) / 4).toFixed(1) : '—';
  const teamSorted = [...state.teammates].sort((a, b) => b.attendance - a.attendance);
  const myRank = teamSorted.findIndex((t) => t.name === state.profile.name) + 1;

  const quickStats = [
    { label: 'Attendance Rate', value: rateNum + '%' },
    { label: 'Sessions Attended', value: presentSessions.length },
    { label: 'Avg Evaluation', value: latestEvalAvg + '/5' },
    { label: 'Team Rank', value: '#' + myRank },
  ];
  const teamStandings = teamSorted.map((t, i) => ({
    ...t,
    rankLabel: '#' + (i + 1),
    tagClass: t.attendance >= 90 ? 'tag tag-neutral' : (t.attendance >= 76 ? 'tag tag-outline' : 'tag tag-accent'),
  }));

  return `
    <div class="stat-grid" style="--cols:4">
      ${quickStats.map((q) => `
        <div class="card elev-sm stat-card">
          <div class="card-title" style="font-size:26px">${esc(q.value)}</div>
          <div class="stat-card-label">${esc(q.label)}</div>
        </div>
      `).join('')}
    </div>
    <div class="card elev-sm table-card">
      <div class="table-scroll"><table class="table">
        <thead><tr><th>Teammate</th><th>Attendance</th></tr></thead>
        <tbody>
          ${teamStandings.map((t) => `
            <tr>
              <td style="font-weight:600">${esc(t.rankLabel)} ${esc(t.name)}</td>
              <td><span class="${t.tagClass}">${t.attendance}%</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>
    </div>
  `;
}

function renderSettings() {
  return `
    <div class="card elev-sm settings-card">
      <div class="card-kicker">Account</div>
      <div class="card-title" style="margin-bottom:8px">Player settings</div>
      <p class="card-body">Notification preferences and security configuration are managed here. This section is not part of the current prototype scope.</p>
    </div>
  `;
}

function renderPage() {
  switch (state.page) {
    case 'dashboard': return renderDashboard();
    case 'profile': return renderProfile();
    case 'attendance': return renderAttendance();
    case 'activities': return renderActivities();
    case 'evaluations': return renderEvaluations();
    case 'stats': return renderStats();
    case 'settings': return renderSettings();
    default: return '';
  }
}

function renderToast() {
  if (!state.toast) return '';
  return `<div class="toast">${esc(state.toast)}</div>`;
}

function renderApp() {
  return `
    <div class="app-shell">
      ${renderSidebar()}
      <div class="main-column">
        ${renderTopbar()}
        <main class="content">${renderPage()}</main>
      </div>
    </div>
    ${renderToast()}
  `;
}

// ---- render loop with focus preservation ----

const root = document.getElementById('root');

function captureFocus() {
  const el = document.activeElement;
  if (!el || !el.id) return null;
  const sel = el.selectionStart !== undefined && el.selectionStart !== null ? { start: el.selectionStart, end: el.selectionEnd } : null;
  return { id: el.id, sel };
}

function restoreFocus(focus) {
  if (!focus) return;
  const el = document.getElementById(focus.id);
  if (!el) return;
  el.focus();
  if (focus.sel && el.setSelectionRange) {
    try { el.setSelectionRange(focus.sel.start, focus.sel.end); } catch { /* not a text-selectable input */ }
  }
}

function render() {
  const focus = captureFocus();
  root.innerHTML = renderApp();
  restoreFocus(focus);
}

// ---- actions (state mutators; render is triggered by the caller) ----

const actions = {
  'go-page': (el) => { state.page = el.dataset.page; state.profileOpen = false; state.notifOpen = false; },
  'toggle-notif': (el, e) => { e.stopPropagation(); state.notifOpen = !state.notifOpen; state.profileOpen = false; },
  'toggle-profile': (el, e) => { e.stopPropagation(); state.profileOpen = !state.profileOpen; state.notifOpen = false; },
  'logout': () => { showToast('Logged out (demo)'); setTimeout(() => { window.location.href = 'index.html'; }, 700); },
  'stop-prop': (el, e) => e.stopPropagation(),

  'date-all': () => { state.dateFilter = 'all'; },
  'date-week': () => { state.dateFilter = 'week'; },

  'edit-profile': () => { state.profileDraft = { ...state.profile }; state.profileEditing = true; },
  'cancel-edit-profile': () => { state.profileEditing = false; state.profileDraft = null; },
  'save-profile': () => { state.profile = { ...state.profileDraft }; state.profileEditing = false; state.profileDraft = null; showToast('Profile updated'); },
  'profile-draft-name': (el) => { state.profileDraft.name = el.value; },
  'profile-draft-position': (el) => { state.profileDraft.position = el.value; },
  'profile-draft-email': (el) => { state.profileDraft.email = el.value; },
  'profile-draft-phone': (el) => { state.profileDraft.phone = el.value; },
  'profile-draft-bio': (el) => { state.profileDraft.bio = el.value; },
};

// ---- event delegation ----

document.addEventListener('click', (e) => {
  let changed = false;
  if (!e.target.closest('.menu-anchor') && (state.profileOpen || state.notifOpen)) {
    state.profileOpen = false;
    state.notifOpen = false;
    changed = true;
  }
  const el = e.target.closest('[data-action]');
  if (el) {
    const handler = actions[el.dataset.action];
    if (handler) { handler(el, e); changed = true; }
  }
  if (changed) render();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (state.profileOpen || state.notifOpen)) {
    state.profileOpen = false;
    state.notifOpen = false;
    render();
  }
});

document.addEventListener('input', (e) => {
  const isTextInput = e.target.tagName === 'INPUT' && e.target.type === 'text';
  const isTextarea = e.target.tagName === 'TEXTAREA';
  if (!isTextInput && !isTextarea) return;
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const handler = actions[el.dataset.action];
  if (handler) { handler(el, e); render(); }
});

document.addEventListener('change', (e) => {
  const isTextInput = e.target.tagName === 'INPUT' && e.target.type === 'text';
  const isTextarea = e.target.tagName === 'TEXTAREA';
  if (isTextInput || isTextarea) return;
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const handler = actions[el.dataset.action];
  if (handler) { handler(el, e); render(); }
});

render();
