# Actibase Admin & Coach Modules (plain HTML/CSS/JS)

Two dashboards for Actibase, each implementing a Claude Design prototype
as a static HTML/CSS/vanilla-JS app — no framework, no build step:

- **`index.html`** — Admin Module: manage users, players, attendance
  sessions, reports, and archived records.
  ([design](https://claude.ai/design/p/5f49f0c0-d470-46ec-ab2c-a71c61eadfad?file=Admin+Module.dc.html))
- **`coach.html`** — Coach Module: manage a team roster, training
  sessions, a drill/activity library, attendance, player evaluations,
  reports, and the coach's own profile.
  ([design](https://claude.ai/design/p/5f49f0c0-d470-46ec-ab2c-a71c61eadfad?file=Coach+Module.dc.html))

## Running it

Open `index.html` or `coach.html` directly in a browser, or serve the
folder with any static file server, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000        (Admin)
# or       http://localhost:8000/coach.html  (Coach)
```

## Structure

- `index.html` / `coach.html` — page shells; each loads its own scripts below
- `css/tokens.css` — Modernist design system tokens and component classes (shared)
- `css/app.css` — layout classes: sidebar, topbar, pages, cards, modals (shared)
- `js/icons.js` — inline SVG icon helpers (shared)
- `js/data.js` / `js/coach-data.js` — mock data generators, one set per module
- `js/app.js` / `js/coach-app.js` — app state, render functions per
  page/modal, and event delegation (`data-action` attributes) that
  drives everything — no framework, just a mutable `state` object and a
  `render()` that rebuilds the DOM from template strings on every change

Each module is a fully independent page load (its own `<script>` set),
so the two `state`/`render`/`actions` globals never collide even though
they share the same names — only `css/tokens.css`, `css/app.css`, and
`js/icons.js` are actually shared files.

## How it's wired

There's a single global `state` object per page. User interaction
handlers in the `actions` map mutate `state` directly; a delegated
`click`/`input`/`change` listener on `document` looks up the handler via
each element's `data-action` attribute, runs it, then calls `render()`
once. `render()` rebuilds `#root`'s `innerHTML` from the current state
and restores focus (and cursor position) to whichever input was
focused, so typing in a search box or textarea doesn't lose the caret
across re-renders.
