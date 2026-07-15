# Actibase Admin, Coach & Player Modules (plain HTML/CSS/JS)

> This repo now also has two other pieces, built later and documented in
> their own READMEs:
> - **`backend/`** — a Flask + PostgreSQL API implementing real auth and
>   CRUD for all three roles. See `backend/README.md`.
> - **`frontend/`** — a React + Bootstrap + Chart.js single-page app wired
>   to that API — the current, actively-developed frontend. See
>   `frontend/README.md`.
>
> Everything below describes the original static site (`index.html`,
> `admin.html`, `coach.html`, `player.html`, `register.html` at the repo
> root), which still works standalone on mock data and is kept as-is.

Dashboards and a login page for Actibase, each implementing a Claude
Design prototype as a static HTML/CSS/vanilla-JS app — no framework, no
build step:

- **`index.html`** — Login (the site root): a role picker (Admin / Coach /
  Player) that swaps the brand panel and form copy, email/password
  validation, remember-me, a forgot-password demo flow, and a brief
  loading state before routing to `admin.html`, `coach.html`, or
  `player.html` depending on the selected role.
  ([design](https://claude.ai/design/p/5f49f0c0-d470-46ec-ab2c-a71c61eadfad?file=Login.dc.html))
- **`admin.html`** — Admin Module: manage users, players, attendance
  sessions, reports, and archived records.
  ([design](https://claude.ai/design/p/5f49f0c0-d470-46ec-ab2c-a71c61eadfad?file=Admin+Module.dc.html))
- **`coach.html`** — Coach Module: manage a team roster, training
  sessions, a drill/activity library, attendance, player evaluations,
  reports, and the coach's own profile.
  ([design](https://claude.ai/design/p/5f49f0c0-d470-46ec-ab2c-a71c61eadfad?file=Coach+Module.dc.html))
- **`player.html`** — Player Module: a player's own dashboard, profile,
  attendance record, assigned training activities, evaluations received
  from their coach, and team statistics.
  ([design](https://claude.ai/design/p/5f49f0c0-d470-46ec-ab2c-a71c61eadfad?file=Player+Module.dc.html))
- **`register.html`** — Create account: role picker (Admin / Coach /
  Player) with role-specific copy and fields, validation, and a success
  screen that links back to sign in.
  ([design](https://claude.ai/design/p/5f49f0c0-d470-46ec-ab2c-a71c61eadfad?file=Register.dc.html))

## Running it

Open any of the HTML files directly in a browser, or serve the folder
with any static file server, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000              (Login — site root, pick a role)
# or       http://localhost:8000/admin.html     (Admin dashboard)
# or       http://localhost:8000/coach.html     (Coach)
# or       http://localhost:8000/player.html    (Player)
# or       http://localhost:8000/register.html  (Create account)
```

## Structure

- `index.html` / `admin.html` / `coach.html` / `player.html` / `register.html` —
  page shells; each loads its own scripts below
- `css/tokens.css` — Modernist design system tokens and component classes (shared)
- `css/app.css` — layout classes: sidebar, topbar, pages, cards, modals, login (shared)
- `js/icons.js` — inline SVG icon helpers (shared)
- `js/data.js` / `js/coach-data.js` / `js/player-data.js` — mock data generators, one set per module
- `js/login-app.js` / `js/register-app.js` / `js/app.js` / `js/coach-app.js` / `js/player-app.js` —
  app state, render functions per page/modal, and event delegation
  (`data-action` attributes) that drives everything — no framework,
  just a mutable `state` object and a `render()` that rebuilds the DOM
  from template strings on every change

Each page is a fully independent page load (its own `<script>` set),
so the `state`/`render`/`actions` globals never collide even though
they share the same names across pages — only `css/tokens.css`,
`css/app.css`, and `js/icons.js` are actually shared files.

## How it's wired

There's a single global `state` object per page. User interaction
handlers in the `actions` map mutate `state` directly; a delegated
`click`/`input`/`change` listener on `document` looks up the handler via
each element's `data-action` attribute, runs it, then calls `render()`
once. `render()` rebuilds `#root`'s `innerHTML` from the current state
and restores focus (and cursor position) to whichever input was
focused, so typing in a search box or textarea doesn't lose the caret
across re-renders.
