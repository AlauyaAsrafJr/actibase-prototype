# Actibase Admin, Coach & Player Modules (plain HTML/CSS/JS)

Dashboards and a login page for Actibase, each implementing a Claude
Design prototype as a static HTML/CSS/vanilla-JS app — no framework, no
build step:

- **`admin-login.html`** — Administrator login: email/password form
  with validation, remember-me, and a forgot-password demo flow. A
  successful sign-in redirects to `index.html`.
  ([design](https://claude.ai/design/p/5f49f0c0-d470-46ec-ab2c-a71c61eadfad?file=Admin+Login.dc.html))
- **`index.html`** — Admin Module: manage users, players, attendance
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

## Running it

Open any of the HTML files directly in a browser, or serve the folder
with any static file server, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/admin-login.html  (Admin login)
# or       http://localhost:8000                    (Admin)
# or       http://localhost:8000/coach.html          (Coach)
# or       http://localhost:8000/player.html         (Player)
```

## Structure

- `admin-login.html` / `index.html` / `coach.html` / `player.html` —
  page shells; each loads its own scripts below
- `css/tokens.css` — Modernist design system tokens and component classes (shared)
- `css/app.css` — layout classes: sidebar, topbar, pages, cards, modals, login (shared)
- `js/icons.js` — inline SVG icon helpers (shared)
- `js/data.js` / `js/coach-data.js` / `js/player-data.js` — mock data generators, one set per module
- `js/app.js` / `js/coach-app.js` / `js/player-app.js` / `js/admin-login-app.js` —
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
