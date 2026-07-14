// Actibase Admin Module — plain HTML/CSS/vanilla JS implementation.
// No framework, no build step: a single mutable `state` object plus a
// `render()` that rebuilds the DOM from template strings, wired up with
// event delegation via `data-action` attributes.

const PAGE_SIZE = 6;

const PAGE_TITLES = {
  dashboard: ['Dashboard', 'Overview of players, coaches and activity across the program'],
  users: ['User management', 'Manage administrator, coach and staff accounts'],
  players: ['Player management', 'View and manage varsity athlete records'],
  attendance: ['Attendance', 'Session-by-session attendance records'],
  reports: ['Reports & analytics', 'Generate and export program reports'],
  archive: ['Archive', 'Restore or permanently remove archived records'],
  settings: ['Settings', 'Account and system configuration'],
};

const state = {
  page: 'dashboard',
  profileOpen: false,
  notifOpen: false,

  users: makeUsers(),
  players: makePlayers(),
  sessions: makeSessions(),
  reports: makeReports(),
  archived: makeArchive(),

  usersSearch: '', usersRoleFilter: 'all', usersSort: 'name', usersSortDir: 'asc', usersSelected: [], usersPage: 1,
  playersSearch: '', playersSportFilter: 'all', playersSort: 'name', playersSortDir: 'asc', playersSelected: [], playersPage: 1,
  attendanceSportFilter: 'all', attendanceDateFilter: 'all',
  reportsSportFilter: 'all', reportsDateFilter: 'all',
  archiveTypeFilter: 'all',

  addUserOpen: false, addUserForm: { name: '', email: '', role: 'Coach' },
  genReportOpen: false, genReportForm: { name: '', format: 'PDF' },

  viewDialog: null,
  confirmDialog: null,
  toast: null,
};
let toastTimer = null;

// ---- utils ----

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sortList(list, key, dir) {
  return [...list].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === 'number' && typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av;
    return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
}

function arrow(sort, dir, key) {
  return sort === key ? (dir === 'asc' ? '▲' : '▼') : '';
}

function findUser(id) { return state.users.find((u) => u.id === id); }
function findPlayer(id) { return state.players.find((p) => p.id === id); }
function findReport(id) { return state.reports.find((r) => r.id === id); }
function findArchive(id) { return state.archived.find((a) => a.id === id); }

function showToast(msg) {
  clearTimeout(toastTimer);
  state.toast = msg;
  toastTimer = setTimeout(() => { state.toast = null; render(); }, 2500);
}

// ---- derived data (single source of truth, shared by render + handlers) ----

function usersPageSlice() {
  let list = state.users.filter(
    (u) => (state.usersRoleFilter === 'all' || u.role === state.usersRoleFilter) &&
      (u.name.toLowerCase().includes(state.usersSearch.toLowerCase()) || u.email.toLowerCase().includes(state.usersSearch.toLowerCase())),
  );
  list = sortList(list, state.usersSort, state.usersSortDir);
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(state.usersPage, totalPages);
  return { list, totalPages, page, slice: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}

function playersPageSlice() {
  let list = state.players.filter(
    (p) => (state.playersSportFilter === 'all' || p.sport === state.playersSportFilter) &&
      p.name.toLowerCase().includes(state.playersSearch.toLowerCase()),
  );
  list = sortList(list, state.playersSort, state.playersSortDir);
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(state.playersPage, totalPages);
  return { list, totalPages, page, slice: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}

// ---- render: sidebar / topbar ----

function renderSidebar() {
  const navItems = [
    ['dashboard', 'Dashboard', 'dashboard'],
    ['users', 'Users', 'users'],
    ['players', 'Players', 'players'],
    ['attendance', 'Attendance', 'attendance'],
    ['reports', 'Reports & Analytics', 'reports'],
    ['archive', 'Archive', 'archive'],
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
            <div class="menu-panel-item">3 attendance sessions pending review for Track &amp; Field.</div>
            <div class="menu-panel-item">Monthly engagement report finished generating.</div>
            <div class="menu-panel-item">2 new coach accounts awaiting approval.</div>
          </div>
        ` : ''}
      </div>
      <div class="menu-anchor">
        <button type="button" class="profile-btn" data-action="toggle-profile">
          <div class="avatar">DW</div>
          <div class="profile-name-block">
            <div class="profile-name">Dana Whitfield</div>
            <div class="profile-role">Head Administrator</div>
          </div>
          ${ICONS.chevronDown()}
        </button>
        ${state.profileOpen ? `
          <div class="menu-panel profile-panel">
            <button type="button" class="menu-btn" data-action="account-settings">Account settings</button>
            <button type="button" class="menu-btn danger" data-action="logout">Log out</button>
          </div>
        ` : ''}
      </div>
    </header>
  `;
}

// ---- render: pages ----

function renderDashboard() {
  const totalAttendanceRecords = state.sessions.reduce((sum, x) => sum + x.total, 0);
  const totalActivities = state.sessions.reduce((sum, x) => sum + x.activities, 0);
  const statCards = [
    { label: 'Total Players', value: state.players.length, icon: 'players', page: 'players' },
    { label: 'Total Coaches', value: state.users.filter((u) => u.role === 'Coach').length, icon: 'coaches', page: 'users' },
    { label: 'Total Activities', value: totalActivities, icon: 'activities', page: 'attendance' },
    { label: 'Total Attendance Records', value: totalAttendanceRecords, icon: 'attendance', page: 'attendance' },
    { label: 'Total Training Sessions', value: state.sessions.length, icon: 'sessions', page: 'attendance' },
    { label: 'Active Users', value: state.users.filter((u) => u.status === 'Active').length, icon: 'users', page: 'users' },
    { label: 'Archived Records', value: state.archived.length, icon: 'archive', page: 'archive' },
    { label: 'Recent Reports', value: state.reports.length, icon: 'reports', page: 'reports' },
  ];

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const acts = [14, 18, 12, 20, 16, 9, 7];
  const rates = [88, 92, 79, 95, 90, 70, 60];
  const chartBars = days.map((day, i) => {
    const x = i * 78 + 4;
    const h1 = acts[i] * 7;
    const h2 = rates[i] * 1.5;
    return { day, x, x2: x + 28, y1: 180 - h1, h1, y2: 180 - h2, h2, lx: x + 27 };
  });

  const recentReports = state.reports.slice(0, 5).map((r) => ({ ...r, tagClass: r.status === 'Ready' ? 'tag tag-accent' : 'tag tag-outline' }));

  return `
    <div class="stat-grid">
      ${statCards.map((c) => `
        <div class="card elev-sm stat-card">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div class="stat-card-icon">${ICONS[c.icon]()}</div>
          </div>
          <div class="card-title stat-card-value">${c.value}</div>
          <div class="stat-card-label">${esc(c.label)}</div>
          <button type="button" class="btn btn-ghost stat-card-link" data-action="go-page" data-page="${c.page}">Quick view →</button>
        </div>
      `).join('')}
    </div>

    <div class="dashboard-grid">
      <div class="card elev-sm dashboard-card">
        <div class="dashboard-card-header">
          <div class="card-title">Weekly activity &amp; attendance</div>
          <span class="tag tag-outline">This week</span>
        </div>
        <svg width="100%" height="200" viewBox="0 0 560 200" style="overflow:visible">
          ${chartBars.map((b) => `
            <g>
              <rect x="${b.x}" y="${b.y1}" width="26" height="${b.h1}" fill="var(--color-neutral-300)"></rect>
              <rect x="${b.x2}" y="${b.y2}" width="26" height="${b.h2}" fill="var(--color-accent)"></rect>
              <text x="${b.lx}" y="192" font-size="11" fill="var(--color-text)" opacity="0.6" text-anchor="middle" font-family="var(--font-body)">${esc(b.day)}</text>
            </g>
          `).join('')}
        </svg>
        <div class="chart-legend">
          <div class="chart-legend-item"><span class="chart-swatch" style="background:var(--color-neutral-300)"></span>Activities logged</div>
          <div class="chart-legend-item"><span class="chart-swatch" style="background:var(--color-accent)"></span>Attendance rate</div>
        </div>
      </div>

      <div class="card elev-sm dashboard-card" style="display:flex;flex-direction:column">
        <div class="reports-list-header">
          <div class="card-title">Recent reports</div>
          <button type="button" class="btn btn-ghost" style="padding-inline:0;font-size:12.5px" data-action="go-page" data-page="reports">View all →</button>
        </div>
        <div>
          ${recentReports.map((r) => `
            <div class="report-row">
              <div style="min-width:0">
                <div class="report-row-name">${esc(r.name)}</div>
                <div class="report-row-date">${esc(r.generatedOn)}</div>
              </div>
              <span class="${r.tagClass}">${esc(r.status)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderUsers() {
  const { list, totalPages, page, slice } = usersPageSlice();
  const allSelected = slice.length > 0 && slice.every((u) => state.usersSelected.includes(u.id));

  return `
    <div class="filter-bar">
      <input id="usersSearchInput" type="text" class="input" placeholder="Search users by name or email" value="${esc(state.usersSearch)}" data-action="users-search" />
      <select class="input" data-action="users-role-filter">
        <option value="all" ${state.usersRoleFilter === 'all' ? 'selected' : ''}>All roles</option>
        <option value="Admin" ${state.usersRoleFilter === 'Admin' ? 'selected' : ''}>Admin</option>
        <option value="Coach" ${state.usersRoleFilter === 'Coach' ? 'selected' : ''}>Coach</option>
        <option value="Staff" ${state.usersRoleFilter === 'Staff' ? 'selected' : ''}>Staff</option>
      </select>
      <div class="filter-spacer"></div>
      ${state.usersSelected.length > 0 ? `
        <span class="selection-note">${state.usersSelected.length} selected</span>
        <button type="button" class="btn btn-secondary" data-action="users-archive-selected">Archive selected</button>
      ` : ''}
      <button type="button" class="btn btn-primary" data-action="open-add-user">${ICONS.plus()} Add user</button>
    </div>

    <div class="card elev-sm table-card">
      <table class="table">
        <thead>
          <tr>
            <th style="width:36px"><input type="checkbox" data-action="users-toggle-all" ${allSelected ? 'checked' : ''} /></th>
            <th style="cursor:pointer" data-action="users-sort-name">Name ${arrow(state.usersSort, state.usersSortDir, 'name')}</th>
            <th>Email</th>
            <th style="cursor:pointer" data-action="users-sort-role">Role ${arrow(state.usersSort, state.usersSortDir, 'role')}</th>
            <th>Status</th>
            <th style="cursor:pointer" data-action="users-sort-last">Last active ${arrow(state.usersSort, state.usersSortDir, 'lastActive')}</th>
            <th style="width:120px">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${slice.map((u) => `
            <tr>
              <td><input type="checkbox" data-action="users-toggle-row" data-id="${u.id}" ${state.usersSelected.includes(u.id) ? 'checked' : ''} /></td>
              <td style="font-weight:600">${esc(u.name)}</td>
              <td style="opacity:0.75">${esc(u.email)}</td>
              <td><span class="tag tag-neutral">${esc(u.role)}</span></td>
              <td><span class="${u.status === 'Active' ? 'tag tag-accent' : 'tag tag-neutral'}">${esc(u.status)}</span></td>
              <td style="opacity:0.65">${esc(u.lastActive)}</td>
              <td>
                <div class="row-actions">
                  <button type="button" class="btn btn-ghost btn-icon" aria-label="View" data-action="users-view" data-id="${u.id}">${ICONS.eye()}</button>
                  <button type="button" class="btn btn-ghost btn-icon" aria-label="Archive" data-action="users-archive" data-id="${u.id}">${ICONS.archive(15)}</button>
                  <button type="button" class="btn btn-ghost btn-icon" aria-label="Delete" data-action="users-delete" data-id="${u.id}">${ICONS.trash()}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="table-footer">
        <span class="table-footer-label">Page ${page} of ${totalPages} · ${list.length} users</span>
        <div class="table-footer-actions">
          <button type="button" class="btn btn-secondary" data-action="users-prev-page" ${page <= 1 ? 'disabled' : ''}>Prev</button>
          <button type="button" class="btn btn-secondary" data-action="users-next-page" ${page >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    </div>
  `;
}

function renderPlayers() {
  const { list, totalPages, page, slice } = playersPageSlice();
  const allSelected = slice.length > 0 && slice.every((p) => state.playersSelected.includes(p.id));

  return `
    <div class="filter-bar">
      <input id="playersSearchInput" type="text" class="input" placeholder="Search players by name" value="${esc(state.playersSearch)}" data-action="players-search" />
      <select class="input" data-action="players-sport-filter">
        <option value="all" ${state.playersSportFilter === 'all' ? 'selected' : ''}>All sports</option>
        ${SPORTS.map((s) => `<option value="${esc(s)}" ${state.playersSportFilter === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
      </select>
      <div class="filter-spacer"></div>
      ${state.playersSelected.length > 0 ? `
        <span class="selection-note">${state.playersSelected.length} selected</span>
        <button type="button" class="btn btn-secondary" data-action="players-archive-selected">Archive selected</button>
      ` : ''}
    </div>

    <div class="card elev-sm table-card">
      <table class="table">
        <thead>
          <tr>
            <th style="width:36px"><input type="checkbox" data-action="players-toggle-all" ${allSelected ? 'checked' : ''} /></th>
            <th style="cursor:pointer" data-action="players-sort-name">Name ${arrow(state.playersSort, state.playersSortDir, 'name')}</th>
            <th>Sport / Team</th>
            <th>Year</th>
            <th>Coach</th>
            <th style="cursor:pointer" data-action="players-sort-attendance">Attendance ${arrow(state.playersSort, state.playersSortDir, 'attendance')}</th>
            <th>Status</th>
            <th style="width:120px">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${slice.map((p) => {
            const attClass = p.attendance >= 90 ? 'tag tag-neutral' : (p.attendance >= 76 ? 'tag tag-outline' : 'tag tag-accent');
            const statusClass = p.status === 'Active' ? 'tag tag-accent' : 'tag tag-neutral';
            return `
              <tr>
                <td><input type="checkbox" data-action="players-toggle-row" data-id="${p.id}" ${state.playersSelected.includes(p.id) ? 'checked' : ''} /></td>
                <td style="font-weight:600">${esc(p.name)}</td>
                <td style="opacity:0.75">${esc(p.sport)}</td>
                <td>${esc(p.year)}</td>
                <td style="opacity:0.75">${esc(p.coach)}</td>
                <td><span class="${attClass}">${p.attendance}%</span></td>
                <td><span class="${statusClass}">${esc(p.status)}</span></td>
                <td>
                  <div class="row-actions">
                    <button type="button" class="btn btn-ghost btn-icon" aria-label="View" data-action="players-view" data-id="${p.id}">${ICONS.eye()}</button>
                    <button type="button" class="btn btn-ghost btn-icon" aria-label="Archive" data-action="players-archive" data-id="${p.id}">${ICONS.archive(15)}</button>
                    <button type="button" class="btn btn-ghost btn-icon" aria-label="Delete" data-action="players-delete" data-id="${p.id}">${ICONS.trash()}</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div class="table-footer">
        <span class="table-footer-label">Page ${page} of ${totalPages} · ${list.length} players</span>
        <div class="table-footer-actions">
          <button type="button" class="btn btn-secondary" data-action="players-prev-page" ${page <= 1 ? 'disabled' : ''}>Prev</button>
          <button type="button" class="btn btn-secondary" data-action="players-next-page" ${page >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    </div>
  `;
}

function renderAttendance() {
  const filteredSessions = state.sessions
    .filter((sn) => state.attendanceSportFilter === 'all' || sn.sport === state.attendanceSportFilter)
    .map((sn) => ({ ...sn, rateTagClass: sn.rate >= 90 ? 'tag tag-neutral' : (sn.rate >= 75 ? 'tag tag-outline' : 'tag tag-accent') }));

  return `
    <div class="filter-bar">
      <select class="input" data-action="attendance-sport-filter">
        <option value="all" ${state.attendanceSportFilter === 'all' ? 'selected' : ''}>All sports</option>
        ${SPORTS.map((s) => `<option value="${esc(s)}" ${state.attendanceSportFilter === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
      </select>
      <div class="seg">
        <label class="seg-opt"><input type="radio" name="attendance-date" data-action="attendance-date-all" ${state.attendanceDateFilter === 'all' ? 'checked' : ''} />All dates</label>
        <label class="seg-opt"><input type="radio" name="attendance-date" data-action="attendance-date-week" ${state.attendanceDateFilter === 'week' ? 'checked' : ''} />This week</label>
      </div>
    </div>
    <div class="card elev-sm table-card">
      <table class="table">
        <thead><tr><th>Date</th><th>Sport / Team</th><th>Session</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead>
        <tbody>
          ${filteredSessions.map((s) => `
            <tr>
              <td>${esc(s.date)}</td>
              <td style="font-weight:600">${esc(s.sport)}</td>
              <td style="opacity:0.75">${esc(s.session)}</td>
              <td>${s.present}</td>
              <td>${s.absent}</td>
              <td><span class="${s.rateTagClass}">${s.rate}%</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderReports() {
  const filteredReports = state.reports
    .filter((r) => state.reportsSportFilter === 'all' || r.sport === state.reportsSportFilter || r.sport === 'All sports')
    .map((r) => ({ ...r, tagClass: r.status === 'Ready' ? 'tag tag-accent' : 'tag tag-outline' }));

  return `
    <div class="filter-bar">
      <select class="input" data-action="reports-sport-filter">
        <option value="all" ${state.reportsSportFilter === 'all' ? 'selected' : ''}>All sports</option>
        ${SPORTS.map((s) => `<option value="${esc(s)}" ${state.reportsSportFilter === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
      </select>
      <select class="input" data-action="reports-date-filter">
        <option value="all" ${state.reportsDateFilter === 'all' ? 'selected' : ''}>Any date range</option>
        <option value="week" ${state.reportsDateFilter === 'week' ? 'selected' : ''}>Last 7 days</option>
        <option value="month" ${state.reportsDateFilter === 'month' ? 'selected' : ''}>Last 30 days</option>
        <option value="term" ${state.reportsDateFilter === 'term' ? 'selected' : ''}>This term</option>
      </select>
      <div class="filter-spacer"></div>
      <button type="button" class="btn btn-primary" data-action="open-generate-report">${ICONS.plus()} Generate report</button>
    </div>
    <div class="card elev-sm table-card">
      <table class="table">
        <thead><tr><th>Report</th><th>Sport</th><th>Range</th><th>Generated</th><th>Status</th><th style="width:150px">Export</th></tr></thead>
        <tbody>
          ${filteredReports.map((r) => `
            <tr>
              <td style="font-weight:600">${esc(r.name)}</td>
              <td style="opacity:0.75">${esc(r.sport)}</td>
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

function renderArchive() {
  const filteredArchive = state.archived.filter((a) => state.archiveTypeFilter === 'all' || a.type === state.archiveTypeFilter);

  return `
    <div class="filter-bar">
      <div class="seg">
        <label class="seg-opt"><input type="radio" name="archive-filter" data-action="archive-filter-all" ${state.archiveTypeFilter === 'all' ? 'checked' : ''} />All</label>
        <label class="seg-opt"><input type="radio" name="archive-filter" data-action="archive-filter-player" ${state.archiveTypeFilter === 'Player' ? 'checked' : ''} />Players</label>
        <label class="seg-opt"><input type="radio" name="archive-filter" data-action="archive-filter-user" ${state.archiveTypeFilter === 'User' ? 'checked' : ''} />Users</label>
        <label class="seg-opt"><input type="radio" name="archive-filter" data-action="archive-filter-session" ${state.archiveTypeFilter === 'Session' ? 'checked' : ''} />Sessions</label>
      </div>
    </div>
    <div class="card elev-sm table-card">
      <table class="table">
        <thead><tr><th>Record</th><th>Type</th><th>Archived on</th><th>Archived by</th><th style="width:150px">Actions</th></tr></thead>
        <tbody>
          ${filteredArchive.map((a) => `
            <tr>
              <td style="font-weight:600">${esc(a.name)}</td>
              <td><span class="tag tag-neutral">${esc(a.type)}</span></td>
              <td style="opacity:0.65">${esc(a.archivedOn)}</td>
              <td style="opacity:0.65">${esc(a.archivedBy)}</td>
              <td>
                <div class="row-actions-wide">
                  <button type="button" class="btn btn-secondary" data-action="archive-restore" data-id="${a.id}">${ICONS.restore()} Restore</button>
                  <button type="button" class="btn btn-ghost btn-icon" aria-label="Delete permanently" data-action="archive-delete-forever" data-id="${a.id}">${ICONS.trash()}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderSettings() {
  return `
    <div class="card elev-sm settings-card">
      <div class="card-kicker">Account</div>
      <div class="card-title" style="margin-bottom:8px">Administrator settings</div>
      <p class="card-body">Profile, notification preferences and security configuration are managed here. This section is not part of the current prototype scope.</p>
    </div>
  `;
}

function renderPage() {
  switch (state.page) {
    case 'dashboard': return renderDashboard();
    case 'users': return renderUsers();
    case 'players': return renderPlayers();
    case 'attendance': return renderAttendance();
    case 'reports': return renderReports();
    case 'archive': return renderArchive();
    case 'settings': return renderSettings();
    default: return '';
  }
}

// ---- render: modals + toast ----

function renderModals() {
  let html = '';

  if (state.addUserOpen) {
    html += `
      <div class="dialog-backdrop" data-action="close-add-user">
        <div class="dialog" data-action="stop-prop">
          <div class="dialog-title">Add new user</div>
          <div class="dialog-field-stack">
            <div class="field"><label>Full name</label><input id="addUserNameInput" type="text" class="input" value="${esc(state.addUserForm.name)}" data-action="add-user-name" /></div>
            <div class="field"><label>Email</label><input id="addUserEmailInput" type="text" class="input" value="${esc(state.addUserForm.email)}" data-action="add-user-email" /></div>
            <div class="field"><label>Role</label>
              <select class="input" data-action="add-user-role">
                <option value="Admin" ${state.addUserForm.role === 'Admin' ? 'selected' : ''}>Admin</option>
                <option value="Coach" ${state.addUserForm.role === 'Coach' ? 'selected' : ''}>Coach</option>
                <option value="Staff" ${state.addUserForm.role === 'Staff' ? 'selected' : ''}>Staff</option>
              </select>
            </div>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" data-action="close-add-user">Cancel</button>
            <button type="button" class="btn btn-primary" data-action="submit-add-user">Add user</button>
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
          <div class="dialog-field-stack">
            <div class="field"><label>Report name</label><input id="genReportNameInput" type="text" class="input" value="${esc(state.genReportForm.name)}" data-action="gen-report-name" /></div>
            <div class="field"><label>Format</label>
              <div class="seg">
                <label class="seg-opt"><input type="radio" name="gen-format" data-action="gen-report-format-pdf" ${state.genReportForm.format === 'PDF' ? 'checked' : ''} />PDF</label>
                <label class="seg-opt"><input type="radio" name="gen-format" data-action="gen-report-format-csv" ${state.genReportForm.format === 'CSV' ? 'checked' : ''} />CSV</label>
              </div>
            </div>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" data-action="close-generate-report">Cancel</button>
            <button type="button" class="btn btn-primary" data-action="submit-generate-report">Generate</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.viewDialog) {
    html += `
      <div class="dialog-backdrop" data-action="close-view">
        <div class="dialog" data-action="stop-prop">
          <div class="dialog-title">${esc(state.viewDialog.title)}</div>
          <div class="detail-rows">
            ${state.viewDialog.rows.map((row) => `
              <div class="detail-row">
                <span class="detail-row-key">${esc(row.k)}</span>
                <span class="detail-row-value">${esc(row.v)}</span>
              </div>
            `).join('')}
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" data-action="close-view">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.confirmDialog) {
    html += `
      <div class="dialog-backdrop" data-action="close-confirm">
        <div class="dialog" data-action="stop-prop">
          <div class="dialog-title">${esc(state.confirmDialog.title)}</div>
          <div class="dialog-body">${esc(state.confirmDialog.body)}</div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" data-action="close-confirm">Cancel</button>
            <button type="button" class="btn btn-primary" data-action="run-confirm">${esc(state.confirmDialog.confirmLabel)}</button>
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
  'account-settings': () => { state.page = 'settings'; state.profileOpen = false; state.notifOpen = false; },
  'toggle-notif': (el, e) => { e.stopPropagation(); state.notifOpen = !state.notifOpen; state.profileOpen = false; },
  'toggle-profile': (el, e) => { e.stopPropagation(); state.profileOpen = !state.profileOpen; state.notifOpen = false; },
  'logout': () => showToast('Logged out (demo)'),
  'stop-prop': (el, e) => e.stopPropagation(),

  // users
  'users-search': (el) => { state.usersSearch = el.value; state.usersPage = 1; },
  'users-role-filter': (el) => { state.usersRoleFilter = el.value; state.usersPage = 1; },
  'users-sort-name': () => { state.usersSortDir = state.usersSort === 'name' && state.usersSortDir === 'asc' ? 'desc' : 'asc'; state.usersSort = 'name'; },
  'users-sort-role': () => { state.usersSortDir = state.usersSort === 'role' && state.usersSortDir === 'asc' ? 'desc' : 'asc'; state.usersSort = 'role'; },
  'users-sort-last': () => { state.usersSortDir = state.usersSort === 'lastActive' && state.usersSortDir === 'asc' ? 'desc' : 'asc'; state.usersSort = 'lastActive'; },
  'users-toggle-row': (el) => {
    const id = el.dataset.id;
    state.usersSelected = state.usersSelected.includes(id) ? state.usersSelected.filter((x) => x !== id) : [...state.usersSelected, id];
  },
  'users-toggle-all': () => {
    const { slice } = usersPageSlice();
    const ids = slice.map((u) => u.id);
    const allSel = ids.every((id) => state.usersSelected.includes(id));
    state.usersSelected = allSel ? state.usersSelected.filter((id) => !ids.includes(id)) : [...new Set([...state.usersSelected, ...ids])];
  },
  'users-view': (el) => {
    const u = findUser(el.dataset.id);
    state.viewDialog = { title: u.name, rows: [{ k: 'Email', v: u.email }, { k: 'Role', v: u.role }, { k: 'Status', v: u.status }, { k: 'Last active', v: u.lastActive }] };
  },
  'users-archive': (el) => {
    const u = findUser(el.dataset.id);
    state.confirmDialog = {
      title: 'Archive user?',
      body: `Move ${u.name} to the archive. They will lose access immediately.`,
      confirmLabel: 'Archive',
      run: () => {
        state.users = state.users.filter((x) => x.id !== u.id);
        state.archived = [{ id: 'arc' + Date.now(), name: u.name, type: 'User', archivedOn: 'Jul 14, 2026', archivedBy: 'Dana Whitfield' }, ...state.archived];
        showToast(`${u.name} archived`);
      },
    };
  },
  'users-delete': (el) => {
    const u = findUser(el.dataset.id);
    state.confirmDialog = {
      title: 'Delete user?',
      body: `Permanently delete ${u.name}. This cannot be undone.`,
      confirmLabel: 'Delete',
      run: () => { state.users = state.users.filter((x) => x.id !== u.id); showToast(`${u.name} deleted`); },
    };
  },
  'users-archive-selected': () => {
    const names = state.users.filter((u) => state.usersSelected.includes(u.id)).map((u) => u.name);
    state.users = state.users.filter((u) => !state.usersSelected.includes(u.id));
    state.archived = [...names.map((n) => ({ id: 'arc' + Date.now() + n, name: n, type: 'User', archivedOn: 'Jul 14, 2026', archivedBy: 'Dana Whitfield' })), ...state.archived];
    state.usersSelected = [];
    showToast(`${names.length} user(s) archived`);
  },
  'users-prev-page': () => { const { page } = usersPageSlice(); state.usersPage = Math.max(1, page - 1); },
  'users-next-page': () => { const { page, totalPages } = usersPageSlice(); state.usersPage = Math.min(totalPages, page + 1); },

  'open-add-user': () => { state.addUserForm = { name: '', email: '', role: 'Coach' }; state.addUserOpen = true; },
  'close-add-user': () => { state.addUserOpen = false; },
  'add-user-name': (el) => { state.addUserForm.name = el.value; },
  'add-user-email': (el) => { state.addUserForm.email = el.value; },
  'add-user-role': (el) => { state.addUserForm.role = el.value; },
  'submit-add-user': () => {
    if (!state.addUserForm.name.trim()) return;
    const nu = { id: 'u' + Date.now(), name: state.addUserForm.name, email: state.addUserForm.email || '—', role: state.addUserForm.role, status: 'Active', lastActive: 'Just now' };
    state.users = [nu, ...state.users];
    state.addUserOpen = false;
    showToast(`${nu.name} added`);
  },

  // players
  'players-search': (el) => { state.playersSearch = el.value; state.playersPage = 1; },
  'players-sport-filter': (el) => { state.playersSportFilter = el.value; state.playersPage = 1; },
  'players-sort-name': () => { state.playersSortDir = state.playersSort === 'name' && state.playersSortDir === 'asc' ? 'desc' : 'asc'; state.playersSort = 'name'; },
  'players-sort-attendance': () => { state.playersSortDir = state.playersSort === 'attendance' && state.playersSortDir === 'asc' ? 'desc' : 'asc'; state.playersSort = 'attendance'; },
  'players-toggle-row': (el) => {
    const id = el.dataset.id;
    state.playersSelected = state.playersSelected.includes(id) ? state.playersSelected.filter((x) => x !== id) : [...state.playersSelected, id];
  },
  'players-toggle-all': () => {
    const { slice } = playersPageSlice();
    const ids = slice.map((p) => p.id);
    const allSel = ids.every((id) => state.playersSelected.includes(id));
    state.playersSelected = allSel ? state.playersSelected.filter((id) => !ids.includes(id)) : [...new Set([...state.playersSelected, ...ids])];
  },
  'players-view': (el) => {
    const p = findPlayer(el.dataset.id);
    state.viewDialog = { title: p.name, rows: [{ k: 'Sport', v: p.sport }, { k: 'Year', v: p.year }, { k: 'Coach', v: p.coach }, { k: 'Attendance', v: p.attendance + '%' }, { k: 'Status', v: p.status }] };
  },
  'players-archive': (el) => {
    const p = findPlayer(el.dataset.id);
    state.confirmDialog = {
      title: 'Archive player?',
      body: `Move ${p.name} to the archive.`,
      confirmLabel: 'Archive',
      run: () => {
        state.players = state.players.filter((x) => x.id !== p.id);
        state.archived = [{ id: 'arc' + Date.now(), name: p.name, type: 'Player', archivedOn: 'Jul 14, 2026', archivedBy: 'Dana Whitfield' }, ...state.archived];
        showToast(`${p.name} archived`);
      },
    };
  },
  'players-delete': (el) => {
    const p = findPlayer(el.dataset.id);
    state.confirmDialog = {
      title: 'Delete player?',
      body: `Permanently delete ${p.name}. This cannot be undone.`,
      confirmLabel: 'Delete',
      run: () => { state.players = state.players.filter((x) => x.id !== p.id); showToast(`${p.name} deleted`); },
    };
  },
  'players-archive-selected': () => {
    const names = state.players.filter((p) => state.playersSelected.includes(p.id)).map((p) => p.name);
    state.players = state.players.filter((p) => !state.playersSelected.includes(p.id));
    state.archived = [...names.map((n) => ({ id: 'arc' + Date.now() + n, name: n, type: 'Player', archivedOn: 'Jul 14, 2026', archivedBy: 'Dana Whitfield' })), ...state.archived];
    state.playersSelected = [];
    showToast(`${names.length} player(s) archived`);
  },
  'players-prev-page': () => { const { page } = playersPageSlice(); state.playersPage = Math.max(1, page - 1); },
  'players-next-page': () => { const { page, totalPages } = playersPageSlice(); state.playersPage = Math.min(totalPages, page + 1); },

  // attendance
  'attendance-sport-filter': (el) => { state.attendanceSportFilter = el.value; },
  'attendance-date-all': () => { state.attendanceDateFilter = 'all'; },
  'attendance-date-week': () => { state.attendanceDateFilter = 'week'; },

  // reports
  'reports-sport-filter': (el) => { state.reportsSportFilter = el.value; },
  'reports-date-filter': (el) => { state.reportsDateFilter = el.value; },
  'open-generate-report': () => { state.genReportForm = { name: '', format: 'PDF' }; state.genReportOpen = true; },
  'close-generate-report': () => { state.genReportOpen = false; },
  'gen-report-name': (el) => { state.genReportForm.name = el.value; },
  'gen-report-format-pdf': () => { state.genReportForm.format = 'PDF'; },
  'gen-report-format-csv': () => { state.genReportForm.format = 'CSV'; },
  'submit-generate-report': () => {
    const name = state.genReportForm.name.trim() || 'Untitled report';
    state.reports = [{ id: 'rp' + Date.now(), name, sport: 'All sports', range: 'Custom', generatedOn: 'Jul 14, 2026', status: 'Ready' }, ...state.reports];
    state.genReportOpen = false;
    showToast(`"${name}" generated (${state.genReportForm.format})`);
  },
  'export-pdf': (el) => { const r = findReport(el.dataset.id); showToast(`Exported "${r.name}" as PDF`); },
  'export-csv': (el) => { const r = findReport(el.dataset.id); showToast(`Exported "${r.name}" as CSV`); },

  // archive
  'archive-filter-all': () => { state.archiveTypeFilter = 'all'; },
  'archive-filter-player': () => { state.archiveTypeFilter = 'Player'; },
  'archive-filter-user': () => { state.archiveTypeFilter = 'User'; },
  'archive-filter-session': () => { state.archiveTypeFilter = 'Session'; },
  'archive-restore': (el) => { const a = findArchive(el.dataset.id); state.archived = state.archived.filter((x) => x.id !== a.id); showToast(`${a.name} restored`); },
  'archive-delete-forever': (el) => {
    const a = findArchive(el.dataset.id);
    state.confirmDialog = {
      title: 'Delete permanently?',
      body: `This will permanently remove "${a.name}" from ACTIBASE. This cannot be undone.`,
      confirmLabel: 'Delete forever',
      run: () => { state.archived = state.archived.filter((x) => x.id !== a.id); showToast(`${a.name} permanently deleted`); },
    };
  },

  // modals
  'close-view': () => { state.viewDialog = null; },
  'close-confirm': () => { state.confirmDialog = null; },
  'run-confirm': () => { if (state.confirmDialog) state.confirmDialog.run(); state.confirmDialog = null; },
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
  if (e.target.tagName !== 'INPUT' || e.target.type !== 'text') return;
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const handler = actions[el.dataset.action];
  if (handler) { handler(el, e); render(); }
});

document.addEventListener('change', (e) => {
  if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const handler = actions[el.dataset.action];
  if (handler) { handler(el, e); render(); }
});

render();
