// Register — plain HTML/CSS/vanilla JS implementation. Same
// state/render/data-action architecture as the other auth page
// (admin-login-app.js): no framework, one form with a role picker and
// a success step.

const ROLE_CONTENT = {
  admin: {
    headline: 'Administration Module', roleLabel: 'administrator',
    body: 'Manage users, athletes, attendance and reports across the entire varsity program from one console.',
    title: 'Create administrator account', subtitle: 'Set up access to the Administration Module.',
    placeholder: 'you@actibase.edu',
  },
  coach: {
    headline: 'Coach Module', roleLabel: 'coach',
    body: 'Track your roster, schedule sessions, record attendance and submit performance evaluations.',
    title: 'Create coach account', subtitle: 'Set up access to your team dashboard.',
    placeholder: 'coach@actibase.edu',
  },
  player: {
    headline: 'Player Module', roleLabel: 'player',
    body: 'View your profile, attendance history, training activities and performance evaluations.',
    title: 'Create player account', subtitle: 'Set up access to your personal dashboard.',
    placeholder: 'player@actibase.edu',
  },
};

const state = { role: 'admin', step: 'form', name: '', email: '', sport: '', password: '', confirmPassword: '', agree: false, error: '' };

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderSuccess(rc) {
  return `
    <div class="register-success-icon">${ICONS.check()}</div>
    <h1 style="font-size:26px;margin:0 0 8px">Account created</h1>
    <p style="font-size:13.5px;opacity:0.65;margin:0 0 24px;line-height:1.6">Your ${esc(rc.roleLabel)} account is ready. Sign in to continue to your dashboard.</p>
    <button type="button" class="btn btn-primary btn-block" data-action="go-to-login">Go to sign in</button>
  `;
}

function renderForm(rc) {
  return `
    <div class="card-kicker">Create account</div>
    <h1 style="font-size:28px;margin:4px 0 8px">${esc(rc.title)}</h1>
    <p style="font-size:13.5px;opacity:0.6;margin:0 0 20px">${esc(rc.subtitle)}</p>

    <div class="seg" style="margin-bottom:24px">
      <label class="seg-opt"><input type="radio" name="role" data-action="select-role" data-role="admin" ${state.role === 'admin' ? 'checked' : ''} />Admin</label>
      <label class="seg-opt"><input type="radio" name="role" data-action="select-role" data-role="coach" ${state.role === 'coach' ? 'checked' : ''} />Coach</label>
      <label class="seg-opt"><input type="radio" name="role" data-action="select-role" data-role="player" ${state.role === 'player' ? 'checked' : ''} />Player</label>
    </div>

    <div class="dialog-field-stack" style="gap:16px">
      <div class="field">
        <label>Full name</label>
        <input id="registerNameInput" type="text" class="input" placeholder="Jordan Reyes" value="${esc(state.name)}" data-action="name-input" />
      </div>
      <div class="field">
        <label>Email</label>
        <input id="registerEmailInput" type="email" class="input" placeholder="${esc(rc.placeholder)}" value="${esc(state.email)}" data-action="email-input" />
      </div>

      ${state.role === 'coach' ? `
        <div class="field">
          <label>Sport</label>
          <input id="registerSportInput" type="text" class="input" placeholder="e.g. Basketball" value="${esc(state.sport)}" data-action="sport-input" />
        </div>
      ` : ''}
      ${state.role === 'player' ? `
        <div class="field">
          <label>Sport / Team</label>
          <input id="registerSportInput" type="text" class="input" placeholder="e.g. Basketball" value="${esc(state.sport)}" data-action="sport-input" />
        </div>
      ` : ''}

      <div class="field">
        <label>Password</label>
        <input id="registerPasswordInput" type="password" class="input" placeholder="••••••••" value="${esc(state.password)}" data-action="password-input" />
      </div>
      <div class="field">
        <label>Confirm password</label>
        <input id="registerConfirmInput" type="password" class="input" placeholder="••••••••" value="${esc(state.confirmPassword)}" data-action="confirm-input" />
      </div>

      ${state.error ? `<div class="login-error">${esc(state.error)}</div>` : ''}

      <label style="display:flex;align-items:flex-start;gap:8px;font-size:12.5px;cursor:pointer;line-height:1.5">
        <input type="checkbox" data-action="agree-toggle" ${state.agree ? 'checked' : ''} />
        I agree to the program's code of conduct and data handling policy.
      </label>

      <button type="button" class="btn btn-primary btn-block" data-action="submit">
        ${ICONS.userPlus()}
        Create account
      </button>
    </div>

    <div class="hr"></div>
    <p class="login-footer-text">Already have an account? <a href="index.html">Sign in</a></p>
  `;
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
        <div class="login-form-wrap wide">
          ${state.step === 'success' ? renderSuccess(rc) : renderForm(rc)}
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
  'name-input': (el) => { state.name = el.value; state.error = ''; },
  'email-input': (el) => { state.email = el.value; state.error = ''; },
  'sport-input': (el) => { state.sport = el.value; state.error = ''; },
  'password-input': (el) => { state.password = el.value; state.error = ''; },
  'confirm-input': (el) => { state.confirmPassword = el.value; state.error = ''; },
  'agree-toggle': (el) => { state.agree = el.checked; state.error = ''; },
  'go-to-login': () => { window.location.href = 'index.html'; },
  'submit': () => {
    if (!state.name.trim() || !state.email.trim() || !state.password.trim()) {
      state.error = 'Fill in all required fields to continue.';
      return;
    }
    if ((state.role === 'coach' || state.role === 'player') && !state.sport.trim()) {
      state.error = 'Enter a sport or team.';
      return;
    }
    if (state.password !== state.confirmPassword) {
      state.error = 'Passwords do not match.';
      return;
    }
    if (!state.agree) {
      state.error = 'You must agree to the code of conduct and data policy.';
      return;
    }
    state.error = '';
    state.step = 'success';
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
