// Admin Login — plain HTML/CSS/vanilla JS implementation. Same
// state/render/data-action architecture as the other modules, just a
// much smaller page: no sidebar, no topbar, one form.

const state = { email: '', password: '', remember: false, error: '' };

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderApp() {
  return `
    <div class="login-shell">
      <div class="login-brand-panel">
        <div class="login-brand-logo">
          <div class="sidebar-brand-mark">A</div>
          <div class="sidebar-brand-name">ACTIBASE</div>
        </div>
        <div>
          <div class="login-brand-headline">Administration Module</div>
          <p class="login-brand-desc">Manage users, athletes, attendance and reports across the entire varsity program from one console.</p>
        </div>
        <div class="login-brand-footer">© 2026 ACTIBASE. All rights reserved.</div>
      </div>

      <div class="login-form-panel">
        <div class="login-form-wrap">
          <div class="card-kicker">Sign in</div>
          <h1 style="font-size:28px;margin:4px 0 8px">Administrator login</h1>
          <p style="font-size:13.5px;opacity:0.6;margin:0 0 28px">Enter your credentials to access the Administration Module.</p>

          <div class="dialog-field-stack" style="gap:16px">
            <div class="field">
              <label>Email</label>
              <input id="loginEmailInput" class="input" type="email" placeholder="you@actibase.edu" value="${esc(state.email)}" data-action="email-input" />
            </div>
            <div class="field">
              <label>Password</label>
              <input id="loginPasswordInput" class="input" type="password" placeholder="••••••••" value="${esc(state.password)}" data-action="password-input" />
            </div>

            ${state.error ? `<div class="login-error">${esc(state.error)}</div>` : ''}

            <div class="login-row">
              <label class="login-remember">
                <input type="checkbox" data-action="remember-toggle" ${state.remember ? 'checked' : ''} />
                Remember me
              </label>
              <a href="#" class="login-forgot" data-action="forgot-password">Forgot password?</a>
            </div>

            <button type="button" class="btn btn-primary btn-block" data-action="submit">
              ${ICONS.login()}
              Sign in
            </button>
          </div>

          <div class="hr"></div>
          <p class="login-footer-text">Not an administrator? <a href="#">Go to Coach or Player login</a></p>
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
  'email-input': (el) => { state.email = el.value; state.error = ''; },
  'password-input': (el) => { state.password = el.value; state.error = ''; },
  'remember-toggle': (el) => { state.remember = el.checked; },
  'forgot-password': (el, e) => { e.preventDefault(); state.error = 'Password reset link sent (demo).'; },
  'submit': () => {
    if (!state.email.trim() || !state.password.trim()) {
      state.error = 'Enter both email and password to continue.';
      return;
    }
    state.error = '';
    window.location.href = 'admin.html';
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
