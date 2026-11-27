import { initPage } from '../layout.js?v=20261127075333';
import { supabase } from '../supabase.js?v=20261127075333';
import { $, params, safeNext, notify, setBusy, USERNAME_RE } from '../ui.js?v=20261127075333';
import { line } from '../jokes.js?v=20261127075333';

const msg = $('#msg');
const { session, profile } = await initPage({ title: 'Log in', needsUsername: false });

// Already logged in? Skip ahead.
if (session) goOn(profile);

function goOn(p) {
  if (!p?.username) location.replace(`username.html?next=${encodeURIComponent(safeNext())}`);
  else location.replace(safeNext(`profile.html?u=${encodeURIComponent(p.username)}`));
}

// ---- Tabs ----
function showTab(name) {
  for (const t of ['login', 'signup']) {
    $(`#tab-${t}`).setAttribute('aria-selected', String(t === name));
    $(`#${t}-form`).hidden = t !== name;
  }
  $('#forgot-form').hidden = true;
  document.title = `${name === 'login' ? 'Log in' : 'Sign up'} · ${document.title.split(' · ').pop()}`;
  notify(msg, '');
}
$('#tab-login').addEventListener('click', () => showTab('login'));
$('#tab-signup').addEventListener('click', () => showTab('signup'));
if (params.get('mode') === 'signup') showTab('signup');

// ---- Log in ----
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value;
  if (!email || !password) return notify(msg, 'Enter your email and password.', 'error');

  const btn = e.submitter || $('#login-form button');
  setBusy(btn, true, 'Logging in…');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setBusy(btn, false);
    const text = /confirm/i.test(error.message)
      ? 'You need to confirm your email first. Check your inbox (and spam).'
      : /invalid/i.test(error.message)
        ? line('wrongPassword')
        : error.message;
    return notify(msg, text, 'error');
  }
  const { data: p } = await supabase.from('profiles').select('username').eq('id', data.user.id).maybeSingle();
  goOn(p);
});

// ---- Forgot password ----
$('#show-forgot').addEventListener('click', () => {
  $('#login-form').hidden = true;
  $('#forgot-form').hidden = false;
  $('#forgot-email').value = $('#login-email').value;
  notify(msg, '');
  $('#forgot-email').focus();
});
$('#back-to-login').addEventListener('click', () => {
  $('#forgot-form').hidden = true;
  showTab('login');
});
$('#forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#forgot-email').value.trim();
  if (!email) return notify(msg, 'Enter your email.', 'error');
  const btn = e.submitter || $('#forgot-form button[type="submit"]');
  setBusy(btn, true, 'Sending…');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: new URL('reset.html', location.href).href });
  setBusy(btn, false);
  if (error) return notify(msg, error.message, 'error');
  notify(msg, `If ${email} has an account, a reset link is on its way. Check your spam too.`, 'ok');
});

// ---- Sign up ----
const usernameInput = $('#signup-username');
usernameInput.addEventListener('input', () => {
  usernameInput.value = usernameInput.value.toLowerCase().replace(/\s/g, '_');
});

$('#signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const email = $('#signup-email').value.trim();
  const password = $('#signup-password').value;

  if (!USERNAME_RE.test(username)) return notify(msg, 'Usernames are 3–20 lowercase letters, numbers or underscores.', 'error');
  if (!email) return notify(msg, 'Enter your email.', 'error');
  if (password.length < 8) return notify(msg, 'Passwords need at least 8 characters.', 'error');

  const btn = e.submitter || $('#signup-form button');
  setBusy(btn, true, 'Signing up…');

  const { data: free, error: checkError } = await supabase.rpc('username_available', { p_username: username });
  if (checkError) { setBusy(btn, false); return notify(msg, checkError.message, 'error'); }
  if (!free) { setBusy(btn, false); return notify(msg, `"${username}" is taken. Pick another one.`, 'error'); }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: new URL('./', location.href).href,
    },
  });
  setBusy(btn, false);
  if (error) return notify(msg, error.message, 'error');

  if (data.session) {
    const { data: p } = await supabase.from('profiles').select('username').eq('id', data.user.id).maybeSingle();
    return goOn(p);
  }
  if (data.user && data.user.identities?.length === 0) {
    return notify(msg, 'That email already has an account. Try logging in.', 'error');
  }
  $('#signup-form').reset();
  notify(msg, `Almost there! We sent a confirmation link to ${email}. Click it, then come back and log in.`, 'ok');
});
