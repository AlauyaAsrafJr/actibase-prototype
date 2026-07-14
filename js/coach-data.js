// Mock data generators for the Coach Module. Plain globals, loaded by
// coach.html before coach-app.js.

const COACH_NAME = 'Marcus Bailey';
const COACH_SPORT = 'Basketball';

const EVAL_CATEGORIES = [
  { key: 'skill', label: 'Skill' },
  { key: 'effort', label: 'Effort' },
  { key: 'teamwork', label: 'Teamwork' },
  { key: 'attitude', label: 'Attitude' },
];

const ACTIVITY_CATEGORIES = ['Ball Handling', 'Shooting', 'Defense', 'Conditioning', 'Team Play'];

const INITIAL_PROFILE = {
  name: COACH_NAME,
  sport: COACH_SPORT,
  email: 'marcus.bailey@actibase.edu',
  phone: '(555) 019-2231',
  yearsCoaching: '6',
  bio: 'Focused on building fundamentals, discipline and team chemistry every season.',
};

function makeRoster() {
  const roster = [
    ['Tyler Owens', 'Senior', 'Guard', 98], ['Jaden Brooks', 'Junior', 'Forward', 95], ['Marcus Hill', 'Sophomore', 'Center', 88],
    ['Devon Marsh', 'Senior', 'Guard', 92], ['Kai Sutton', 'Junior', 'Forward', 84], ['Reggie Cole', 'Freshman', 'Guard', 90],
    ['Andre Vance', 'Senior', 'Center', 79], ['Miles Ford', 'Junior', 'Guard', 96], ['Trey Nolan', 'Sophomore', 'Forward', 87],
    ['Isaiah Grant', 'Freshman', 'Guard', 93],
  ];
  return roster.map((r, i) => ({ id: 'p' + (i + 1), name: r[0], year: r[1], position: r[2], attendance: r[3], lastEval: i < 4 ? 'Jul ' + (1 + i) + ', 2026' : '—' }));
}

function makeSessions() {
  return [
    { id: 's0', date: 'Jul 14, 2026', time: '4:00 PM', type: 'Practice', location: 'Main Gym', status: 'Scheduled' },
    { id: 's1', date: 'Jul 12, 2026', time: '4:00 PM', type: 'Practice', location: 'Main Gym', status: 'Completed', present: 9, absent: 1, rate: 90 },
    { id: 's2', date: 'Jul 9, 2026', time: '6:00 PM', type: 'Scrimmage', location: 'Away — Central High', status: 'Completed', present: 10, absent: 0, rate: 100 },
    { id: 's3', date: 'Jul 5, 2026', time: '4:00 PM', type: 'Practice', location: 'Main Gym', status: 'Completed', present: 8, absent: 2, rate: 80 },
    { id: 's4', date: 'Jul 18, 2026', time: '4:00 PM', type: 'Practice', location: 'Main Gym', status: 'Scheduled' },
  ];
}

function makeEvaluations() {
  return [
    { id: 'e1', playerId: 'p1', playerName: 'Tyler Owens', date: 'Jul 5, 2026', scores: { skill: 4, effort: 5, teamwork: 4, attitude: 5 }, comment: 'Strong leadership on court.' },
    { id: 'e2', playerId: 'p2', playerName: 'Jaden Brooks', date: 'Jul 3, 2026', scores: { skill: 3, effort: 4, teamwork: 4, attitude: 4 }, comment: 'Improving footwork, keep it up.' },
    { id: 'e3', playerId: 'p3', playerName: 'Marcus Hill', date: 'Jul 2, 2026', scores: { skill: 3, effort: 3, teamwork: 3, attitude: 4 }, comment: 'Needs more consistency in practice.' },
    { id: 'e4', playerId: 'p4', playerName: 'Devon Marsh', date: 'Jul 1, 2026', scores: { skill: 5, effort: 4, teamwork: 5, attitude: 4 }, comment: 'Excellent floor vision.' },
  ];
}

function makeActivities() {
  return [
    { id: 'a1', name: 'Full-Court Layup Ladder', category: 'Ball Handling', duration: '15 min', difficulty: 'Beginner', description: 'Continuous layup drill building speed and control off the dribble.', assignedSessionIds: ['s0'] },
    { id: 'a2', name: 'Catch-and-Shoot Circuit', category: 'Shooting', duration: '20 min', difficulty: 'Intermediate', description: 'Five-spot perimeter shooting off the catch with passer rotation.', assignedSessionIds: ['s0'] },
    { id: 'a3', name: 'Defensive Slide & Close-Out', category: 'Defense', duration: '12 min', difficulty: 'Intermediate', description: 'Lateral slide footwork into closeout reps against a live shooter.', assignedSessionIds: [] },
    { id: 'a4', name: 'Suicides & Sprint Intervals', category: 'Conditioning', duration: '10 min', difficulty: 'Advanced', description: 'Baseline sprint intervals to build fourth-quarter endurance.', assignedSessionIds: ['s3'] },
    { id: 'a5', name: '3-on-3 Read & React', category: 'Team Play', duration: '18 min', difficulty: 'Advanced', description: 'Small-sided scrimmage emphasizing spacing and ball movement.', assignedSessionIds: [] },
    { id: 'a6', name: 'Two-Ball Dribbling Series', category: 'Ball Handling', duration: '10 min', difficulty: 'Intermediate', description: 'Simultaneous two-ball combos to sharpen handle under pressure.', assignedSessionIds: [] },
    { id: 'a7', name: 'Free Throw Pressure Reps', category: 'Shooting', duration: '8 min', difficulty: 'Beginner', description: 'Free throws under simulated fatigue and crowd-noise pressure.', assignedSessionIds: ['s1'] },
    { id: 'a8', name: 'Box-Out & Rebound Battle', category: 'Defense', duration: '12 min', difficulty: 'Beginner', description: 'Live box-out reps followed by a rebounding scramble drill.', assignedSessionIds: [] },
  ];
}

function makeCoachReports() {
  return [
    { id: 'r1', name: 'Weekly Attendance Summary — Basketball', range: 'Jul 6–12, 2026', generatedOn: 'Jul 13, 2026', status: 'Ready' },
    { id: 'r2', name: 'Team Performance Report', range: 'This term', generatedOn: 'Jul 10, 2026', status: 'Ready' },
    { id: 'r3', name: 'Player Evaluation Digest', range: 'Last 30 days', generatedOn: 'Jul 8, 2026', status: 'Ready' },
  ];
}
