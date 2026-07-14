// Mock data generators for the Player Module. Plain globals, loaded by
// player.html before player-app.js.

const PLAYER_EVAL_CATEGORIES = [
  { key: 'skill', label: 'Skill' },
  { key: 'effort', label: 'Effort' },
  { key: 'teamwork', label: 'Teamwork' },
  { key: 'attitude', label: 'Attitude' },
];

const INITIAL_PLAYER_PROFILE = {
  name: 'Tyler Owens',
  year: 'Senior',
  position: 'Guard',
  sport: 'Basketball',
  coach: 'Marcus Bailey',
  email: 'tyler.owens@actibase.edu',
  phone: '(555) 044-8871',
  attendance: 98,
  bio: 'Team captain focused on floor leadership and consistent shot selection.',
};

function makeAttendance() {
  return [
    { id: 'a0', date: 'Jul 14, 2026', type: 'Practice', location: 'Main Gym', status: 'Upcoming' },
    { id: 'a1', date: 'Jul 12, 2026', type: 'Practice', location: 'Main Gym', status: 'Present' },
    { id: 'a2', date: 'Jul 9, 2026', type: 'Scrimmage', location: 'Away — Central High', status: 'Present' },
    { id: 'a3', date: 'Jul 5, 2026', type: 'Practice', location: 'Main Gym', status: 'Late' },
    { id: 'a4', date: 'Jun 28, 2026', type: 'Practice', location: 'Main Gym', status: 'Present' },
    { id: 'a5', date: 'Jun 21, 2026', type: 'Scrimmage', location: 'Main Gym', status: 'Absent' },
    { id: 'a6', date: 'Jun 14, 2026', type: 'Practice', location: 'Main Gym', status: 'Present' },
  ];
}

function makePlayerActivities() {
  return [
    { id: 'ac1', name: 'Catch-and-Shoot Circuit', category: 'Shooting', duration: '20 min', difficulty: 'Intermediate', description: 'Five-spot perimeter shooting off the catch with passer rotation.', date: 'Jul 14, 2026' },
    { id: 'ac2', name: 'Full-Court Layup Ladder', category: 'Ball Handling', duration: '15 min', difficulty: 'Beginner', description: 'Continuous layup drill building speed and control off the dribble.', date: 'Jul 12, 2026' },
    { id: 'ac3', name: 'Free Throw Pressure Reps', category: 'Shooting', duration: '8 min', difficulty: 'Beginner', description: 'Free throws under simulated fatigue and crowd-noise pressure.', date: 'Jul 9, 2026' },
    { id: 'ac4', name: 'Suicides & Sprint Intervals', category: 'Conditioning', duration: '10 min', difficulty: 'Advanced', description: 'Baseline sprint intervals to build fourth-quarter endurance.', date: 'Jul 5, 2026' },
  ];
}

function makePlayerEvaluations() {
  return [
    { id: 'e1', date: 'Jul 5, 2026', coach: 'Marcus Bailey', scores: { skill: 4, effort: 5, teamwork: 4, attitude: 5 }, comment: 'Strong leadership on court.' },
    { id: 'e2', date: 'Jun 12, 2026', coach: 'Marcus Bailey', scores: { skill: 4, effort: 4, teamwork: 4, attitude: 4 }, comment: 'Solid consistency, keep working on left-hand finishes.' },
    { id: 'e3', date: 'May 20, 2026', coach: 'Marcus Bailey', scores: { skill: 3, effort: 4, teamwork: 4, attitude: 4 }, comment: 'Good energy in practice; needs sharper on-ball defense.' },
  ];
}

function makeTeammates() {
  return [
    { name: 'Tyler Owens', attendance: 98 }, { name: 'Miles Ford', attendance: 96 }, { name: 'Jaden Brooks', attendance: 95 },
    { name: 'Isaiah Grant', attendance: 93 }, { name: 'Devon Marsh', attendance: 92 }, { name: 'Reggie Cole', attendance: 90 },
    { name: 'Trey Nolan', attendance: 87 }, { name: 'Marcus Hill', attendance: 88 }, { name: 'Kai Sutton', attendance: 84 }, { name: 'Andre Vance', attendance: 79 },
  ];
}
