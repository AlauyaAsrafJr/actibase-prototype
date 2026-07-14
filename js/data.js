// Mock data generators for the Actibase Admin Module prototype.
// Plain globals (no modules, no build step) so index.html can load
// this with a single <script> tag before app.js.

const SPORTS = [
  'Basketball',
  'Volleyball',
  'Track & Field',
  'Swimming',
  'Soccer',
  'Baseball',
  'Softball',
  'Tennis',
];

const COACHES = [
  'Marcus Bailey',
  'Elena Cruz',
  'Devon Ortiz',
  'Priya Nandan',
  'Sam Whitfield',
  'Jordan Reyes',
  'Alicia Chen',
  'Marcus Lowe',
];

function makeUsers() {
  const list = COACHES.map((n, i) => ({
    id: 'u' + (i + 1),
    name: n,
    email: n.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.') + '@actibase.edu',
    role: 'Coach',
    status: i === 6 ? 'Inactive' : 'Active',
    lastActive: ['Today', 'Today', 'Yesterday', '2 days ago', 'Today', '3 days ago', '1 week ago', 'Yesterday'][i],
  }));
  list.push({ id: 'u9', name: 'Dana Whitfield', email: 'dana.whitfield@actibase.edu', role: 'Admin', status: 'Active', lastActive: 'Today' });
  list.push({ id: 'u10', name: 'Theo Park', email: 'theo.park@actibase.edu', role: 'Admin', status: 'Active', lastActive: 'Today' });
  list.push({ id: 'u11', name: 'Nora Kim', email: 'nora.kim@actibase.edu', role: 'Staff', status: 'Active', lastActive: 'Yesterday' });
  list.push({ id: 'u12', name: 'Ben Foster', email: 'ben.foster@actibase.edu', role: 'Staff', status: 'Active', lastActive: '2 days ago' });
  list.push({ id: 'u13', name: 'Ivy Sanders', email: 'ivy.sanders@actibase.edu', role: 'Staff', status: 'Active', lastActive: 'Today' });
  list.push({ id: 'u14', name: 'Leo Martins', email: 'leo.martins@actibase.edu', role: 'Staff', status: 'Inactive', lastActive: '3 weeks ago' });
  return list;
}

function makePlayers() {
  const roster = [
    ['Tyler Owens', 'Basketball'], ['Jaden Brooks', 'Basketball'], ['Marcus Hill', 'Basketball'],
    ['Sophia Diaz', 'Volleyball'], ['Riley Chen', 'Volleyball'], ['Maya Thompson', 'Volleyball'],
    ['Aisha Bello', 'Track & Field'], ['Noah Kim', 'Track & Field'], ['Ethan Ross', 'Track & Field'],
    ['Lily Zhang', 'Swimming'], ['Gavin Moss', 'Swimming'], ['Harper Lane', 'Swimming'],
    ['Diego Fuentes', 'Soccer'], ['Mia Alvarez', 'Soccer'], ['Owen Castro', 'Soccer'],
    ['Caleb Turner', 'Baseball'], ['Wyatt James', 'Baseball'], ['Logan Price', 'Baseball'],
    ['Zoe Franklin', 'Softball'], ['Ruby Sinclair', 'Softball'], ['Ella Marsh', 'Softball'],
    ['Nathan Voss', 'Tennis'], ['Ivy Coleman', 'Tennis'], ['Grace Whitmore', 'Tennis'],
  ];
  const years = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
  const attendances = [98, 95, 92, 88, 90, 85, 80, 76, 72, 94, 91, 86, 83, 79, 97, 93, 89, 81, 75, 96, 90, 84, 78, 99];
  return roster.map((r, i) => ({
    id: 'p' + (i + 1),
    name: r[0],
    sport: r[1],
    year: years[i % 4],
    coach: COACHES[SPORTS.indexOf(r[1])],
    attendance: attendances[i],
    status: attendances[i] < 76 ? 'Inactive' : 'Active',
  }));
}

function makeSessions() {
  const sessions = [];
  let id = 1;
  SPORTS.forEach((sport, i) => {
    [['Jul 7, 2026', 'Practice'], ['Jul 10, 2026', 'Scrimmage']].forEach(([date, type], j) => {
      const total = 18 + (i % 3) * 2;
      const rate = [96, 88, 73, 91, 65, 84, 79, 97][(i + j) % 8];
      const present = Math.round((total * rate) / 100);
      sessions.push({ id: 's' + id++, date, sport, session: type, present, absent: total - present, total, rate, activities: 3 + (i % 3) });
    });
  });
  return sessions;
}

function makeReports() {
  return [
    { id: 'r1', name: 'Weekly Attendance Summary', sport: 'All sports', range: 'Jul 6–12, 2026', generatedOn: 'Jul 13, 2026', status: 'Ready' },
    { id: 'r2', name: 'Basketball Engagement Report', sport: 'Basketball', range: 'Jun 1–30, 2026', generatedOn: 'Jul 2, 2026', status: 'Ready' },
    { id: 'r3', name: 'Coach Evaluation — Term 2', sport: 'All sports', range: 'This term', generatedOn: 'Jul 10, 2026', status: 'Ready' },
    { id: 'r4', name: 'Swimming Attendance Trend', sport: 'Swimming', range: 'Last 30 days', generatedOn: 'Jul 11, 2026', status: 'Generating' },
    { id: 'r5', name: 'Player Performance Digest', sport: 'All sports', range: 'This term', generatedOn: 'Jul 9, 2026', status: 'Ready' },
    { id: 'r6', name: 'Track & Field Session Log', sport: 'Track & Field', range: 'Jul 1–13, 2026', generatedOn: 'Jul 13, 2026', status: 'Ready' },
    { id: 'r7', name: 'Inactive Players Watchlist', sport: 'All sports', range: 'This term', generatedOn: 'Jul 8, 2026', status: 'Ready' },
    { id: 'r8', name: 'Soccer Attendance Trend', sport: 'Soccer', range: 'Last 7 days', generatedOn: 'Jul 12, 2026', status: 'Generating' },
  ];
}

function makeArchive() {
  return [
    { id: 'a1', name: 'Owen Reyes', type: 'Player', archivedOn: 'Jun 20, 2026', archivedBy: 'Dana Whitfield' },
    { id: 'a2', name: 'Casey Long (former Coach)', type: 'User', archivedOn: 'May 30, 2026', archivedBy: 'Theo Park' },
    { id: 'a3', name: 'Term 1 Attendance — Baseball', type: 'Session', archivedOn: 'Apr 15, 2026', archivedBy: 'Dana Whitfield' },
    { id: 'a4', name: 'Priya Fernandez', type: 'Player', archivedOn: 'Mar 2, 2026', archivedBy: 'Dana Whitfield' },
    { id: 'a5', name: 'Term 1 Attendance — Swimming', type: 'Session', archivedOn: 'Apr 15, 2026', archivedBy: 'Theo Park' },
    { id: 'a6', name: 'Marcus Boyd (former Staff)', type: 'User', archivedOn: 'Feb 18, 2026', archivedBy: 'Dana Whitfield' },
    { id: 'a7', name: 'Term 1 Attendance — Tennis', type: 'Session', archivedOn: 'Apr 15, 2026', archivedBy: 'Theo Park' },
    { id: 'a8', name: 'Ana Delgado', type: 'Player', archivedOn: 'Jan 22, 2026', archivedBy: 'Dana Whitfield' },
    { id: 'a9', name: 'Winter Term Report Set', type: 'Session', archivedOn: 'Jan 10, 2026', archivedBy: 'Theo Park' },
    { id: 'a10', name: 'Ravi Patel', type: 'Player', archivedOn: 'Dec 5, 2025', archivedBy: 'Dana Whitfield' },
  ];
}
