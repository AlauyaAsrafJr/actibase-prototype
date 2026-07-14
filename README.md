# Actibase Admin Module (plain HTML/CSS/JS)

Administration dashboard for Actibase — manage users, players, attendance
sessions, reports, and archived records. Implements the
[Admin Module design](https://claude.ai/design/p/5f49f0c0-d470-46ec-ab2c-a71c61eadfad)
as a static HTML/CSS/vanilla-JS app — no framework, no build step.

## Running it

Open `index.html` directly in a browser, or serve the folder with any
static file server, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Structure

- `index.html` — page shell; loads the stylesheets and scripts below
- `css/tokens.css` — Modernist design system tokens and component classes
- `css/app.css` — layout classes (sidebar, topbar, pages, cards, modals)
- `js/data.js` — mock data generators (users, players, sessions, reports, archive)
- `js/icons.js` — inline SVG icon helpers
- `js/app.js` — app state, render functions per page/modal, and event
  delegation (`data-action` attributes) that drives everything — no
  framework, just a mutable `state` object and a `render()` that rebuilds
  the DOM from template strings on every change

## How it's wired

There's a single global `state` object. User interaction handlers in the
`actions` map mutate `state` directly; a delegated `click`/`input`/`change`
listener on `document` looks up the handler via each element's
`data-action` attribute, runs it, then calls `render()` once. `render()`
rebuilds `#root`'s `innerHTML` from the current state and restores focus
(and cursor position) to whichever input was focused, so typing in a
search box doesn't lose the caret across re-renders.
