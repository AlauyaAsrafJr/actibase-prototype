// Coach Module — plain HTML/CSS/vanilla JS implementation.
// Same architecture as js/app.js: one mutable `state`, template-string
// render functions, and `data-action` event delegation. No framework.

const PAGE_TITLES = {
  dashboard: ['Coach dashboard', 'Overview of your team, sessions and evaluations'],
  roster: ['My players', 'Your ' + COACH_SPORT + ' team roster'],
  sessions: ['Training sessions', 'Schedule and track practices, scrimmages and games'],
  activities: ['Activities & drills', 'A library of exercises you can assign to any session'],
  attendance: ['Attendance', 'Mark attendance for a training session'],
  evaluations: ['Evaluations', 'Structured performance feedback for your players'],
  reports: ['Reports', 'Generate and export reports for your team'],
  profile: ['My profile', 'Your coaching profile and contact details'],
  settings: ['Settings', 'Account and system configuration'],
};

const state = {
  page: 'dashboard', profileOpen: false, notifOpen: false,

  roster: makeRoster(), sessions: makeSessions(), evaluations: makeEvaluations(), reports: makeCoachReports(),
  activities: makeActivities(), activitiesCategoryFilter: 'all',

  addActivityOpen: false, addActivityForm: { name: '', category: 'Ball Handling', customCategory: '', duration: '', difficulty: 'Beginner', description: '' },
  customCategories: [],

  assignModal: null,
  attendanceSession: 's0', attendanceMarks: {},
  scheduleSessionOpen: false, scheduleForm: { date: '', time: '', type: 'Practice', location: 'Main Gym' },
  evalModal: null,
  genReportOpen: false, genReportForm: { name: '' },
  toast: null,

  profile: { ...INITIAL_PROFILE },
  profileEditing: false, profileDraft: null,
};
let toastTimer = null;

// ---- utils ----

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function findPlayer(id) { return state.roster.find((p) => p.id === id); }
function findSession(id) { return state.sessions.find((s) => s.id === id); }
function findActivity(id) { return state.activities.find((a) => a.id === id); }
function findReport(id) { return state.reports.find((r) => r.id === id); }

function showToast(msg) {
  clearTimeout(toastTimer);
  state.toast = msg;
  toastTimer = setTimeout(() => { state.toast = null; render(); }, 2500);
}

function setMark(sessionId, playerId, status) {
  const cur = state.attendanceMarks[sessionId] || {};
  state.attendanceMarks = { ...state.attendanceMarks, [sessionId]: { ...cur, [playerId]: status } };
}

// ---- derived data ----

function getAttendanceRows() {
  const sessionId = state.attendanceSession;
  const marks = state.attendanceMarks[sessionId] || {};
  return state.roster.map((p) => {
    const status = marks[p.id] || 'present';
    return { id: p.id, name: p.name, position: p.position, status };
  });
}

// ---- render: sidebar / topbar ----

function renderSidebar() {
  const navItems = [
    ['dashboard', 'Dashboard', 'dashboard'],
    ['roster', 'My Players', 'players'],
    ['sessions', 'Training Sessions', 'sessions'],
    ['activities', 'Activities', 'drills'],
    ['attendance', 'Attendance', 'attendance'],
    ['evaluations', 'Evaluations', 'evaluations'],
    ['reports', 'Reports', 'reports'],
    ['profile', 'My Profile', 'profile'],
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
  return `
    <header class="topbar">
      <div class="topbar-heading">
        <h1>${esc(title)}</h1>
        <div class="topbar-subtitle">${esc(subtitle)}</div>
      </div>
      <div class="menu-anchor">
        <button type="button" class="icon-btn" data-action="toggle-notif" aria-label="Notifications">
          ${ICONS.bell()}
          <span class="badge-dot"></span>
        </button>
        ${state.notifOpen ? `
          <div class="menu-panel notif-panel">
            <div class="menu-panel-title">Notifications</div>
            <div class="menu-panel-item">Practice scheduled today at 4:00 PM — Main Gym.</div>
            <div class="menu-panel-item">3 players are due for a performance evaluation.</div>
            <div class="menu-panel-item">Team performance report finished generating.</div>
          </div>
        ` : ''}
      </div>
      <div class="menu-anchor">
        <button type="button" class="profile-btn" data-action="toggle-profile">
          <div class="avatar">MB</div>
          <div class="profile-name-block">
            <div class="profile-name">${esc(state.profile.name)}</div>
            <div class="profile-role">${esc(state.profile.sport)} Coach</div>
          </div>
          ${ICONS.chevronDown()}
        </button>
        ${state.profileOpen ? `
          <div class="menu-panel profile-panel">
            <button type="button" class="menu-btn" data-action="go-page" data-page="profile">My profile</button>
            <button type="button" class="menu-btn" data-action="go-page" data-page="settings">Account settings</button>
            <button type="button" class="menu-btn danger" data-action="logout">Log out</button>
          </div>
        ` : ''}
      </div>
    </header>
  `;
}

// ---- render: pages ----

function renderDashboard() {
  const completedSessions = state.sessions.filter((sn) => sn.status === 'Completed');
  const avgAttendanceRate = completedSessions.length ? Math.round(completedSessions.reduce((sum, x) => sum + x.rate, 0) / completedSessions.length) : 0;
  const evaluatedPlayerIds = new Set(state.evaluations.map((e) => e.playerId));
  const pendingEvaluations = state.roster.filter((p) => !evaluatedPlayerIds.has(p.id)).length;
  const upcomingTraining = state.sessions.filter((sn) => sn.status === 'Scheduled').length;
  const todaysSessions = state.sessions.filter((sn) => sn.date === 'Jul 14, 2026').length;

  const statCards = [
    { label: 'My Players', value: state.roster.length, icon: 'players' },
    { label: "Today's Sessions", value: todaysSessions, icon: 'sessions' },
    { label: 'Attendance Rate', value: avgAttendanceRate + '%', icon: 'attendance' },
    { label: 'Pending Evaluations', value: pendingEvaluations, icon: 'evaluations' },
    { label: 'Upcoming Training', value: upcomingTraining, icon: 'sessions' },
    { label: 'Recent Feedback', value: state.evaluations.length, icon: 'feedback' },
  ];

  const trendSessions = completedSessions.slice(0, 4).reverse();
  const attendanceTrend = trendSessions.map((sn, i) => {
    const x = i * 98 + 8;
    const h = sn.rate * 1.4;
    return { x, y: 160 - h, h, lx: x + 26, label: sn.date.replace(', 2026', '').replace('Jul ', '7/') };
  });

  const teamPerformance = EVAL_CATEGORIES.map((cat) => {
    const vals = state.evaluations.map((e) => e.scores[cat.key]);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { label: cat.label, value: avg.toFixed(1), pct: Math.round((avg / 5) * 100) + '%' };
  });

  const playerProgress = state.roster.map((p) => ({
    name: p.name,
    pct: p.attendance + '%',
    tagClass: p.attendance >= 90 ? 'tag tag-neutral' : (p.attendance >= 76 ? 'tag tag-outline' : 'tag tag-accent'),
  }));

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
          ${attendanceTrend.map((b) => `
            <g>
              <rect x="${b.x}" y="${b.y}" width="52" height="${b.h}" fill="var(--color-accent)"></rect>
              <text x="${b.lx}" y="152" font-size="11" fill="var(--color-text)" opacity="0.6" text-anchor="middle" font-family="var(--font-body)">${esc(b.label)}</text>
            </g>
          `).join('')}
        </svg>
      </div>
      <div class="card elev-sm dashboard-card">
        <div class="card-title" style="margin-bottom:14px">Team performance overview</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${teamPerformance.map((p) => `
            <div>
              <div class="progress-row"><span>${esc(p.label)}</span><span class="progress-row-value">${esc(p.value)}/5</span></div>
              <div class="progress-track"><div class="progress-fill" style="width:${p.pct}"></div></div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="card elev-sm dashboard-card">
      <div class="card-title" style="margin-bottom:14px">Individual player progress</div>
      <div>
        ${playerProgress.map((pp) => `
          <div class="player-progress-row">
            <div class="player-progress-name">${esc(pp.name)}</div>
            <div class="progress-track player-progress-track"><div class="progress-fill" style="width:${pp.pct}"></div></div>
            <span class="${pp.tagClass}">${pp.pct}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderRoster() {
  const rows = state.roster.map((p) => ({
    ...p,
    attendanceTagClass: p.attendance >= 90 ? 'tag tag-neutral' : (p.attendance >= 76 ? 'tag tag-outline' : 'tag tag-accent'),
  }));
  return `
    <div class="card elev-sm table-card">
      <table class="table">
        <thead><tr><th>Name</th><th>Year</th><th>Position</th><th>Attendance</th><th>Last evaluation</th><th style="width:140px">Actions</th></tr></thead>
        <tbody>
          ${rows.map((p) => `
            <tr>
              <td style="font-weight:600">${esc(p.name)}</td>
              <td style="opacity:0.75">${esc(p.year)}</td>
              <td style="opacity:0.75">${esc(p.position)}</td>
              <td><span class="${p.attendanceTagClass}">${p.attendance}%</span></td>
              <td style="opacity:0.65">${esc(p.lastEval)}</td>
              <td><button type="button" class="btn btn-secondary" data-action="open-evaluate" data-id="${p.id}">Evaluate</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderSessions() {
  const rows = state.sessions.map((sn) => ({
    ...sn,
    statusTagClass: sn.status === 'Scheduled' ? 'tag tag-outline' : 'tag tag-accent',
    activitiesLabel: state.activities.filter((a) => a.assignedSessionIds.includes(sn.id)).map((a) => a.name).join(', ') || '—',
  }));
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button type="button" class="btn btn-primary" data-action="open-schedule-session">${ICONS.plus()} Schedule session</button>
    </div>
    <div class="card elev-sm table-card">
      <table class="table">
        <thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Location</th><th>Status</th><th>Activities</th></tr></thead>
        <tbody>
          ${rows.map((s) => `
            <tr>
              <td style="font-weight:600">${esc(s.date)}</td>
              <td style="opacity:0.75">${esc(s.time)}</td>
              <td style="opacity:0.75">${esc(s.type)}</td>
              <td style="opacity:0.75">${esc(s.location)}</td>
              <td><span class="${s.statusTagClass}">${esc(s.status)}</span></td>
              <td style="opacity:0.65;max-width:240px">${esc(s.activitiesLabel)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderActivities() {
  const difficultyTagClass = { Beginner: 'tag tag-outline', Intermediate: 'tag tag-neutral', Advanced: 'tag tag-accent' };
  const categories = [...ACTIVITY_CATEGORIES, ...state.customCategories];
  const rows = state.activities
    .filter((a) => state.activitiesCategoryFilter === 'all' || a.category === state.activitiesCategoryFilter)
    .map((a) => ({
      ...a,
      difficultyTagClass: difficultyTagClass[a.difficulty] || 'tag tag-neutral',
      assignedLabel: a.assignedSessionIds.length ? a.assignedSessionIds.length + ' session(s) assigned' : 'Not assigned',
    }));

  return `
    <div class="filter-bar">
      <select class="input" data-action="activities-category-filter">
        <option value="all" ${state.activitiesCategoryFilter === 'all' ? 'selected' : ''}>All categories</option>
        ${categories.map((c) => `<option value="${esc(c)}" ${state.activitiesCategoryFilter === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
      </select>
      <div class="filter-spacer"></div>
      <button type="button" class="btn btn-primary" data-action="open-add-activity">${ICONS.plus()} Add activity</button>
    </div>
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
          <div class="activity-card-footer">
            <span style="font-size:12px;opacity:0.55">${esc(a.assignedLabel)}</span>
            <button type="button" class="btn btn-secondary" data-action="open-assign-activity" data-id="${a.id}">Assign to session</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAttendance() {
  const rows = getAttendanceRows();
  const presentCount = rows.filter((r) => r.status === 'present').length;
  const lateCount = rows.filter((r) => r.status === 'late').length;
  const absentCount = rows.filter((r) => r.status === 'absent').length;

  return `
    <div class="filter-bar">
      <select class="input" style="max-width:260px" data-action="select-attendance-session">
        ${state.sessions.map((sn) => `<option value="${sn.id}" ${state.attendanceSession === sn.id ? 'selected' : ''}>${esc(sn.date + ' · ' + sn.type)}</option>`).join('')}
      </select>
      <div class="filter-spacer"></div>
      <button type="button" class="btn btn-secondary" data-action="mark-all-present">Mark all present</button>
    </div>
    <div class="card elev-sm table-card">
      <table class="table">
        <thead><tr><th>Player</th><th>Position</th><th style="width:300px">Status</th></tr></thead>
        <tbody>
          ${rows.map((r) => {
            const player = findPlayer(r.id);
            return `
              <tr>
                <td style="font-weight:600">${esc(r.name)}</td>
                <td style="opacity:0.75">${esc(player.position)}</td>
                <td>
                  <div class="seg">
                    <label class="seg-opt"><input type="radio" name="att-${r.id}" data-action="attendance-mark" data-id="${r.id}" data-status="present" ${r.status === 'present' ? 'checked' : ''} />Present</label>
                    <label class="seg-opt"><input type="radio" name="att-${r.id}" data-action="attendance-mark" data-id="${r.id}" data-status="late" ${r.status === 'late' ? 'checked' : ''} />Late</label>
                    <label class="seg-opt"><input type="radio" name="att-${r.id}" data-action="attendance-mark" data-id="${r.id}" data-status="absent" ${r.status === 'absent' ? 'checked' : ''} />Absent</label>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div class="table-footer">
        <span class="table-footer-label">${presentCount} present · ${lateCount} late · ${absentCount} absent</span>
        <button type="button" class="btn btn-primary" data-action="save-attendance">Save attendance</button>
      </div>
    </div>
  `;
}

function renderEvaluations() {
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button type="button" class="btn btn-primary" data-action="open-new-evaluation">${ICONS.plus()} New evaluation</button>
    </div>
    <div class="card elev-sm table-card">
      <table class="table">
        <thead><tr><th>Player</th><th>Date</th><th>Skill</th><th>Effort</th><th>Teamwork</th><th>Attitude</th><th>Comment</th></tr></thead>
        <tbody>
          ${state.evaluations.map((e) => `
            <tr>
              <td style="font-weight:600">${esc(e.playerName)}</td>
              <td style="opacity:0.65">${esc(e.date)}</td>
              <td>${e.scores.skill}/5</td>
              <td>${e.scores.effort}/5</td>
              <td>${e.scores.teamwork}/5</td>
              <td>${e.scores.attitude}/5</td>
              <td style="opacity:0.75;max-width:220px">${esc(e.comment)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderReports() {
  const rows = state.reports.map((r) => ({ ...r, tagClass: r.status === 'Ready' ? 'tag tag-accent' : 'tag tag-outline' }));
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button type="button" class="btn btn-primary" data-action="open-generate-report">${ICONS.plus()} Generate report</button>
    </div>
    <div class="card elev-sm table-card">
      <table class="table">
        <thead><tr><th>Report</th><th>Range</th><th>Generated</th><th>Status</th><th style="width:150px">Export</th></tr></thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td style="font-weight:600">${esc(r.name)}</td>
              <td style="opacity:0.75">${esc(r.range)}</td>
              <td style="opacity:0.65">${esc(r.generatedOn)}</td>
              <td><span class="${r.tagClass}">${esc(r.status)}</span></td>
              <td>
                <div class="row-actions-wide">
                  <button type="button" class="btn btn-secondary" data-action="export-pdf" data-id="${r.id}">PDF</button>
                  <button type="button" class="btn btn-secondary" data-action="export-csv" data-id="${r.id}">CSV</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderProfile() {
  const p = state.profile;
  const initials = p.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return `
    <div class="card elev-sm profile-card">
      <div class="profile-card-header">
        <div class="profile-avatar-lg">${esc(initials)}</div>
        <div>
          <div class="card-title" style="margin:0">${esc(p.name)}</div>
          <div style="opacity:0.65;font-size:13.5px">${esc(p.sport)} Coach · ${esc(p.yearsCoaching)} years coaching</div>
        </div>
      </div>

      ${state.profileEditing ? `
        <div class="dialog-field-stack">
          <div class="field"><label>Full name</label><input id="profileDraftName" type="text" class="input" value="${esc(state.profileDraft.name)}" data-action="profile-draft-name" /></div>
          <div class="field"><label>Sport</label><input id="profileDraftSport" type="text" class="input" value="${esc(state.profileDraft.sport)}" data-action="profile-draft-sport" /></div>
          <div class="field"><label>Email</label><input id="profileDraftEmail" type="text" class="input" value="${esc(state.profileDraft.email)}" data-action="profile-draft-email" /></div>
          <div class="field"><label>Phone</label><input id="profileDraftPhone" type="text" class="input" value="${esc(state.profileDraft.phone)}" data-action="profile-draft-phone" /></div>
          <div class="field"><label>Years coaching</label><input id="profileDraftYears" type="text" class="input" value="${esc(state.profileDraft.yearsCoaching)}" data-action="profile-draft-years" /></div>
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
          <div class="detail-row"><span class="detail-row-key">Years coaching</span><span class="detail-row-value">${esc(p.yearsCoaching)}</span></div>
        </div>
        <p class="card-body" style="margin-bottom:18px">${esc(p.bio)}</p>
        <button type="button" class="btn btn-primary" data-action="edit-profile">Edit profile</button>
      `}
    </div>
  `;
}

function renderSettings() {
  return `
    <div class="card elev-sm settings-card">
      <div class="card-kicker">Account</div>
      <div class="card-title" style="margin-bottom:8px">Coach settings</div>
      <p class="card-body">Profile, notification preferences and security configuration are managed here. This section is not part of the current prototype scope.</p>
    </div>
  `;
}

function renderPage() {
  switch (state.page) {
    case 'dashboard': return renderDashboard();
    case 'roster': return renderRoster();
    case 'sessions': return renderSessions();
    case 'activities': return renderActivities();
    case 'attendance': return renderAttendance();
    case 'evaluations': return renderEvaluations();
    case 'reports': return renderReports();
    case 'profile': return renderProfile();
    case 'settings': return renderSettings();
    default: return '';
  }
}

// ---- render: modals + toast ----

function renderModals() {
  let html = '';

  if (state.scheduleSessionOpen) {
    const f = state.scheduleForm;
    html += `
      <div class="dialog-backdrop" data-action="close-schedule-session">
        <div class="dialog" data-action="stop-prop">
          <div class="dialog-title">Schedule training session</div>
          <div class="dialog-field-stack">
            <div class="field"><label>Date</label><input id="scheduleDateInput" type="text" class="input" placeholder="e.g. Jul 20, 2026" value="${esc(f.date)}" data-action="schedule-date" /></div>
            <div class="field"><label>Time</label><input id="scheduleTimeInput" type="text" class="input" placeholder="e.g. 4:00 PM" value="${esc(f.time)}" data-action="schedule-time" /></div>
            <div class="field"><label>Type</label>
              <div class="seg">
                <label class="seg-opt"><input type="radio" name="schedule-type" data-action="schedule-type" data-value="Practice" ${f.type === 'Practice' ? 'checked' : ''} />Practice</label>
                <label class="seg-opt"><input type="radio" name="schedule-type" data-action="schedule-type" data-value="Scrimmage" ${f.type === 'Scrimmage' ? 'checked' : ''} />Scrimmage</label>
                <label class="seg-opt"><input type="radio" name="schedule-type" data-action="schedule-type" data-value="Game" ${f.type === 'Game' ? 'checked' : ''} />Game</label>
              </div>
            </div>
            <div class="field"><label>Location</label><input id="scheduleLocationInput" type="text" class="input" value="${esc(f.location)}" data-action="schedule-location" /></div>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" data-action="close-schedule-session">Cancel</button>
            <button type="button" class="btn btn-primary" data-action="submit-schedule-session">Schedule</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.evalModal) {
    const m = state.evalModal;
    html += `
      <div class="dialog-backdrop" data-action="close-eval-modal">
        <div class="dialog" data-action="stop-prop">
          <div class="dialog-title">Performance evaluation</div>
          <div class="field" style="margin-bottom:12px"><label>Player</label>
            <select class="input" data-action="eval-player-change">
              ${state.roster.map((p) => `<option value="${p.id}" ${m.playerId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px">
            ${EVAL_CATEGORIES.map((cat) => `
              <div>
                <div class="eval-category-label">${esc(cat.label)}</div>
                <div class="eval-score-row">
                  ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="${m.scores[cat.key] === n ? 'btn btn-primary' : 'btn btn-secondary'}" data-action="eval-score" data-cat="${cat.key}" data-n="${n}">${n}</button>`).join('')}
                </div>
              </div>
            `).join('')}
            <div class="field"><label>Comment</label><textarea id="evalCommentInput" class="input" rows="3" data-action="eval-comment">${esc(m.comment)}</textarea></div>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" data-action="close-eval-modal">Cancel</button>
            <button type="button" class="btn btn-primary" data-action="submit-evaluation">Save evaluation</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.addActivityOpen) {
    const f = state.addActivityForm;
    const categories = [...ACTIVITY_CATEGORIES, ...state.customCategories];
    const isCustom = f.category === '__custom__';
    html += `
      <div class="dialog-backdrop" data-action="close-add-activity">
        <div class="dialog" data-action="stop-prop">
          <div class="dialog-title">Add activity</div>
          <div class="dialog-field-stack">
            <div class="field"><label>Name</label><input id="addActivityNameInput" type="text" class="input" value="${esc(f.name)}" data-action="add-activity-name" /></div>
            <div class="field"><label>Category</label>
              <select class="input" data-action="add-activity-category">
                ${categories.map((c) => `<option value="${esc(c)}" ${f.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                <option value="__custom__" ${isCustom ? 'selected' : ''}>Write my own…</option>
              </select>
            </div>
            ${isCustom ? `
              <div class="field"><label>New category name</label><input id="addActivityCustomCategoryInput" type="text" class="input" placeholder="e.g. Footwork" value="${esc(f.customCategory)}" data-action="add-activity-custom-category" /></div>
            ` : ''}
            <div class="field"><label>Duration</label><input id="addActivityDurationInput" type="text" class="input" placeholder="e.g. 15 min" value="${esc(f.duration)}" data-action="add-activity-duration" /></div>
            <div class="field"><label>Difficulty</label>
              <select class="input" data-action="add-activity-difficulty">
                <option value="Beginner" ${f.difficulty === 'Beginner' ? 'selected' : ''}>Beginner</option>
                <option value="Intermediate" ${f.difficulty === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                <option value="Advanced" ${f.difficulty === 'Advanced' ? 'selected' : ''}>Advanced</option>
              </select>
            </div>
            <div class="field"><label>Description</label><textarea id="addActivityDescriptionInput" class="input" rows="3" data-action="add-activity-description">${esc(f.description)}</textarea></div>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" data-action="close-add-activity">Cancel</button>
            <button type="button" class="btn btn-primary" data-action="submit-add-activity">Add activity</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.assignModal) {
    const m = state.assignModal;
    html += `
      <div class="dialog-backdrop" data-action="close-assign-modal">
        <div class="dialog" data-action="stop-prop">
          <div class="dialog-title">Assign "${esc(m.activityName)}"</div>
          <div class="field"><label>Session</label>
            <select class="input" data-action="assign-session-change">
              ${state.sessions.map((sn) => `<option value="${sn.id}" ${m.sessionId === sn.id ? 'selected' : ''}>${esc(sn.date + ' · ' + sn.type)}</option>`).join('')}
            </select>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" data-action="close-assign-modal">Cancel</button>
            <button type="button" class="btn btn-primary" data-action="submit-assign">Assign</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.genReportOpen) {
    html += `
      <div class="dialog-backdrop" data-action="close-generate-report">
        <div class="dialog" data-action="stop-prop">
          <div class="dialog-title">Generate report</div>
          <div class="field"><label>Report name</label><input id="genReportNameInput" type="text" class="input" value="${esc(state.genReportForm.name)}" data-action="gen-report-name" /></div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" data-action="close-generate-report">Cancel</button>
            <button type="button" class="btn btn-primary" data-action="submit-generate-report">Generate</button>
          </div>
        </div>
      </div>
    `;
  }

  return html;
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
    ${renderModals()}
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
  'logout': () => showToast('Logged out (demo)'),
  'stop-prop': (el, e) => e.stopPropagation(),

  // roster
  'open-evaluate': (el) => {
    const p = findPlayer(el.dataset.id);
    state.evalModal = { playerId: p.id, playerName: p.name, scores: { skill: 3, effort: 3, teamwork: 3, attitude: 3 }, comment: '' };
  },

  // sessions
  'open-schedule-session': () => { state.scheduleForm = { date: '', time: '', type: 'Practice', location: 'Main Gym' }; state.scheduleSessionOpen = true; },
  'close-schedule-session': () => { state.scheduleSessionOpen = false; },
  'schedule-date': (el) => { state.scheduleForm.date = el.value; },
  'schedule-time': (el) => { state.scheduleForm.time = el.value; },
  'schedule-location': (el) => { state.scheduleForm.location = el.value; },
  'schedule-type': (el) => { state.scheduleForm.type = el.dataset.value; },
  'submit-schedule-session': () => {
    if (!state.scheduleForm.date.trim()) return;
    state.sessions = [{ id: 's' + Date.now(), ...state.scheduleForm, status: 'Scheduled' }, ...state.sessions];
    state.scheduleSessionOpen = false;
    showToast('Session scheduled');
  },

  // activities
  'activities-category-filter': (el) => { state.activitiesCategoryFilter = el.value; },
  'open-add-activity': () => { state.addActivityForm = { name: '', category: 'Ball Handling', customCategory: '', duration: '', difficulty: 'Beginner', description: '' }; state.addActivityOpen = true; },
  'close-add-activity': () => { state.addActivityOpen = false; },
  'add-activity-name': (el) => { state.addActivityForm.name = el.value; },
  'add-activity-category': (el) => { state.addActivityForm.category = el.value; },
  'add-activity-custom-category': (el) => { state.addActivityForm.customCategory = el.value; },
  'add-activity-duration': (el) => { state.addActivityForm.duration = el.value; },
  'add-activity-difficulty': (el) => { state.addActivityForm.difficulty = el.value; },
  'add-activity-description': (el) => { state.addActivityForm.description = el.value; },
  'submit-add-activity': () => {
    const f = state.addActivityForm;
    if (!f.name.trim()) return;
    const isCustom = f.category === '__custom__';
    const category = isCustom ? (f.customCategory.trim() || 'Uncategorized') : f.category;
    state.activities = [{ id: 'a' + Date.now(), name: f.name, category, duration: f.duration, difficulty: f.difficulty, description: f.description, assignedSessionIds: [] }, ...state.activities];
    if (isCustom && !ACTIVITY_CATEGORIES.includes(category) && !state.customCategories.includes(category)) {
      state.customCategories = [...state.customCategories, category];
    }
    state.addActivityOpen = false;
    showToast(`"${f.name}" added to the library`);
  },
  'open-assign-activity': (el) => {
    const a = findActivity(el.dataset.id);
    state.assignModal = { activityId: a.id, activityName: a.name, sessionId: state.sessions[0] ? state.sessions[0].id : '' };
  },
  'close-assign-modal': () => { state.assignModal = null; },
  'assign-session-change': (el) => { state.assignModal.sessionId = el.value; },
  'submit-assign': () => {
    const m = state.assignModal;
    state.activities = state.activities.map((a) => a.id === m.activityId
      ? { ...a, assignedSessionIds: a.assignedSessionIds.includes(m.sessionId) ? a.assignedSessionIds : [...a.assignedSessionIds, m.sessionId] }
      : a);
    state.assignModal = null;
    const sn = findSession(m.sessionId);
    showToast(`Assigned "${m.activityName}" to ${sn ? sn.date : 'session'}`);
  },

  // attendance
  'select-attendance-session': (el) => { state.attendanceSession = el.value; },
  'mark-all-present': () => { state.attendanceMarks = { ...state.attendanceMarks, [state.attendanceSession]: {} }; },
  'attendance-mark': (el) => { setMark(state.attendanceSession, el.dataset.id, el.dataset.status); },
  'save-attendance': () => {
    const rows = getAttendanceRows();
    const present = rows.filter((r) => r.status === 'present').length;
    const late = rows.filter((r) => r.status === 'late').length;
    const absent = rows.filter((r) => r.status === 'absent').length;
    const rate = Math.round(((present + late) / rows.length) * 100);
    const sessionId = state.attendanceSession;
    state.sessions = state.sessions.map((sn) => sn.id === sessionId ? { ...sn, status: 'Completed', present: present + late, absent, rate } : sn);
    showToast('Attendance saved');
  },

  // evaluations
  'open-new-evaluation': () => {
    const p = state.roster[0];
    state.evalModal = { playerId: p ? p.id : '', playerName: p ? p.name : '', scores: { skill: 3, effort: 3, teamwork: 3, attitude: 3 }, comment: '' };
  },
  'close-eval-modal': () => { state.evalModal = null; },
  'eval-player-change': (el) => {
    const p = findPlayer(el.value);
    state.evalModal.playerId = el.value;
    state.evalModal.playerName = p ? p.name : '';
  },
  'eval-score': (el) => { state.evalModal.scores[el.dataset.cat] = Number(el.dataset.n); },
  'eval-comment': (el) => { state.evalModal.comment = el.value; },
  'submit-evaluation': () => {
    const m = state.evalModal;
    state.evaluations = [{ id: 'e' + Date.now(), playerId: m.playerId, playerName: m.playerName, date: 'Jul 14, 2026', scores: m.scores, comment: m.comment }, ...state.evaluations];
    state.roster = state.roster.map((p) => p.id === m.playerId ? { ...p, lastEval: 'Jul 14, 2026' } : p);
    state.evalModal = null;
    showToast(`Evaluation saved for ${m.playerName}`);
  },

  // reports
  'open-generate-report': () => { state.genReportForm = { name: '' }; state.genReportOpen = true; },
  'close-generate-report': () => { state.genReportOpen = false; },
  'gen-report-name': (el) => { state.genReportForm.name = el.value; },
  'submit-generate-report': () => {
    const name = state.genReportForm.name.trim() || 'Untitled report';
    state.reports = [{ id: 'r' + Date.now(), name, range: 'Custom', generatedOn: 'Jul 14, 2026', status: 'Ready' }, ...state.reports];
    state.genReportOpen = false;
    showToast(`"${name}" generated`);
  },
  'export-pdf': (el) => { const r = findReport(el.dataset.id); showToast(`Exported "${r.name}" as PDF`); },
  'export-csv': (el) => { const r = findReport(el.dataset.id); showToast(`Exported "${r.name}" as CSV`); },

  // profile
  'edit-profile': () => { state.profileDraft = { ...state.profile }; state.profileEditing = true; },
  'cancel-edit-profile': () => { state.profileEditing = false; state.profileDraft = null; },
  'save-profile': () => { state.profile = { ...state.profileDraft }; state.profileEditing = false; state.profileDraft = null; showToast('Profile updated'); },
  'profile-draft-name': (el) => { state.profileDraft.name = el.value; },
  'profile-draft-sport': (el) => { state.profileDraft.sport = el.value; },
  'profile-draft-email': (el) => { state.profileDraft.email = el.value; },
  'profile-draft-phone': (el) => { state.profileDraft.phone = el.value; },
  'profile-draft-years': (el) => { state.profileDraft.yearsCoaching = el.value; },
  'profile-draft-bio': (el) => { state.profileDraft.bio = el.value; },
};

// ---- event delegation ----

document.addEventListener('click', (e) => {
  let changed = false;
  if (e.target.closest('.content') && (state.profileOpen || state.notifOpen)) {
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
