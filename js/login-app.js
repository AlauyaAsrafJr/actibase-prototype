// Unified Login — plain HTML/CSS/vanilla JS implementation. Same
// state/render/data-action architecture as the other pages. One form
// with a role picker (Admin / Coach / Player) that swaps copy and
// routes to the right dashboard on success.

const ROLE_CONTENT = {
  admin: {
    headline: 'Administration Module', roleLabel: 'Administrator',
    body: 'Manage users, athletes, attendance and reports across the entire varsity program from one console.',
    title: 'Administrator login', subtitle: 'Enter your credentials to access the Administration Module.',
    submitLabel: 'Sign in', placeholder: 'you@actibase.edu', dest: 'admin.html',
  },
  coach: {
    headline: 'Coach Module', roleLabel: 'Coach',
    body: 'Track your roster, schedule sessions, record attendance and submit performance evaluations.',
    title: 'Coach login', subtitle: 'Enter your credentials to access your team dashboard.',
    submitLabel: 'Sign in', placeholder: 'coach@actibase.edu', dest: 'coach.html',
  },
  player: {
    headline: 'Player Module', roleLabel: 'Player',
    body: 'View your profile, attendance history, training activities and performance evaluations.',
    title: 'Player login', subtitle: 'Enter your credentials to access your personal dashboard.',
    submitLabel: 'Sign in', placeholder: 'player@actibase.edu', dest: 'player.html',
  },
};

const state = { role: 'admin', email: '', password: '', remember: false, error: '', loading: false };

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderApp() {
  const rc = ROLE_CONTENT[state.role];
  return `
    <div class="login-shell">
      <div class="login-brand-panel">
        <div class="login-brand-logo">
          <div class="sidebar-brand-mark">A</div>
          <div class="sidebar-brand-name">ACTIBASE</div>
        </div>
        <div>
          <div class="login-brand-headline">${esc(rc.headline)}</div>
          <p class="login-brand-desc">${esc(rc.body)}</p>
        </div>
        <div class="login-brand-footer">© 2026 ACTIBASE. All rights reserved.</div>
      </div>

      <div class="login-form-panel">
        <div class="login-form-wrap">
          <div class="card-kicker">Sign in</div>
          <h1 style="font-size:28px;margin:4px 0 8px">${esc(rc.title)}</h1>
          <p style="font-size:13.5px;opacity:0.6;margin:0 0 20px">${esc(rc.subtitle)}</p>

          <div class="seg" style="margin-bottom:24px">
            <label class="seg-opt"><input type="radio" name="role" data-action="select-role" data-role="admin" ${state.role === 'admin' ? 'checked' : ''} />Admin</label>
            <label class="seg-opt"><input type="radio" name="role" data-action="select-role" data-role="coach" ${state.role === 'coach' ? 'checked' : ''} />Coach</label>
            <label class="seg-opt"><input type="radio" name="role" data-action="select-role" data-role="player" ${state.role === 'player' ? 'checked' : ''} />Player</label>
          </div>

          <div class="dialog-field-stack" style="gap:16px">
            <div class="field">
              <label for="loginEmailInput">Email</label>
              <input id="loginEmailInput" class="input" type="email" placeholder="${esc(rc.placeholder)}" value="${esc(state.email)}" data-action="email-input" />
            </div>
            <div class="field">
              <label for="loginPasswordInput">Password</label>
              <input id="loginPasswordInput" class="input" type="password" placeholder="••••••••" value="${esc(state.password)}" data-action="password-input" />
            </div>

            ${state.error ? `<div class="login-error" role="alert">${esc(state.error)}</div>` : ''}

            <div class="login-row">
              <label class="login-remember">
                <input type="checkbox" data-action="remember-toggle" ${state.remember ? 'checked' : ''} />
                Remember me
              </label>
              <a href="#" class="login-forgot" data-action="forgot-password">Forgot password?</a>
            </div>

            <button type="button" class="btn btn-primary btn-block" data-action="submit" ${state.loading ? 'disabled' : ''}>
              ${ICONS.login()}
              ${esc(rc.submitLabel)}
            </button>
          </div>

          <div class="hr"></div>
          <p class="login-footer-text">Signing in as ${esc(rc.roleLabel)}. Switch role above if needed.</p>
          <p class="login-footer-text" style="margin-top:10px">New here? <a href="register.html">Create an account</a></p>
        </div>
      </div>
    </div>
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

// ---- actions ----

const actions = {
  'select-role': (el) => { state.role = el.dataset.role; state.error = ''; },
  'email-input': (el) => { state.email = el.value; state.error = ''; },
  'password-input': (el) => { state.password = el.value; state.error = ''; },
  'remember-toggle': (el) => { state.remember = el.checked; },
  'forgot-password': (el, e) => { e.preventDefault(); state.error = 'Password reset link sent (demo).'; },
  'submit': () => {
    if (state.loading) return;
    if (!state.email.trim() || !state.password.trim()) {
      state.error = 'Enter both email and password to continue.';
      return;
    }
    state.error = '';
    state.loading = true;
    const dest = ROLE_CONTENT[state.role].dest;
    setTimeout(() => { window.location.href = dest; }, 500);
  },
};

// ---- event delegation ----

const LIVE_INPUT_TYPES = ['text', 'email', 'password'];

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const handler = actions[el.dataset.action];
  if (handler) { handler(el, e); render(); }
});

document.addEventListener('input', (e) => {
  if (e.target.tagName !== 'INPUT' || !LIVE_INPUT_TYPES.includes(e.target.type)) return;
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const handler = actions[el.dataset.action];
  if (handler) { handler(el, e); render(); }
});

document.addEventListener('change', (e) => {
  if (e.target.tagName === 'INPUT' && LIVE_INPUT_TYPES.includes(e.target.type)) return;
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const handler = actions[el.dataset.action];
  if (handler) { handler(el, e); render(); }
});

render();
