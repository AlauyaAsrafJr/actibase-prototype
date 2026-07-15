# Actibase Frontend

A React + Bootstrap + Chart.js frontend for Actibase, wired to the Flask +
PostgreSQL API in `../backend`. This replaces the earlier plain HTML/CSS/JS
prototype pages (`index.html`, `admin.html`, `coach.html`, `player.html`,
`register.html` at the repo root) with a real single-page app backed by
live data instead of mock data.

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # point VITE_API_BASE_URL at your backend if not localhost:5000
```

## Run

Start the backend first (see `../backend/README.md`), then:

```bash
npm run dev
```

- App: http://127.0.0.1:5173

## Build

```bash
npm run build
```

Outputs to `dist/`.

## Demo credentials

Same accounts as the backend seed (password `password123`):

| Role   | Email                          |
|--------|---------------------------------|
| Admin  | dana.whitfield@actibase.edu     |
| Coach  | marcus.bailey@actibase.edu      |
| Player | tyler.owens@actibase.edu        |

## Structure

```
src/
  main.jsx              entry point, loads Bootstrap CSS + Chart.js registration
  App.jsx                routes: /login, /register, /admin/*, /coach/*, /player/*
  charts.js              Chart.js component registration (once, globally)
  api/client.js          fetch wrapper: base URL, bearer token, error handling
  context/AuthContext.jsx login/logout, current user, session bootstrap from token
  hooks/useFetch.js      GET + loading/error/reload for a given path
  components/
    AppLayout.jsx         sidebar + topbar shell, per-role nav
    ProtectedRoute.jsx     redirects to /login if unauthenticated, or to the
                            user's own role home if role mismatches
    DataTable.jsx          generic table renderer
    StatCard.jsx            dashboard stat tile
    PageHeader.jsx          title + subtitle + action buttons row
    Feedback.jsx            Loading / ErrorAlert / EmptyState
    ConfirmModal.jsx        reusable confirm dialog
  pages/
    Login.jsx, Register.jsx
    admin/    Dashboard, Users, Players, Sessions, Reports, Archive
    coach/    Dashboard, Roster, Sessions, Attendance, Activities,
              Evaluations, Reports, Profile
    player/   Dashboard, Attendance, Activities, Evaluations, Stats, Profile
```

## Notes

- Login doesn't ask for a role — the account's actual role (returned by
  `/auth/login`) decides which dashboard you land on. Register does ask,
  since that's how the account gets created.
- Every dashboard (`/admin`, `/coach`, `/player`) pairs stat cards with two
  Chart.js visualizations (a doughnut and a bar chart) built from the same
  `/*/dashboard` endpoint the stat cards use — no separate charting
  endpoints.
- Auth is a JWT stored in `localStorage`; `AuthContext` re-hydrates the
  session on load via `GET /auth/me`.
