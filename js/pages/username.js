import { initPage } from '../layout.js?v=20261127180120';
import { supabase } from '../supabase.js?v=20261127180120';
import { $, safeNext, notify, setBusy, USERNAME_RE } from '../ui.js?v=20261127180120';

const { user, profile } = await initPage({ title: 'Pick a username', auth: 'required', needsUsername: false });

const input = $('#username');
const hint = $('#username-hint');
const msg = $('#msg');
const current = profile?.username || '';

if (current) {
  $('#heading').textContent = 'Change your username';
  input.value = current;
}

function setHint(text, kind = '') {
  hint.textContent = text;
  hint.className = `hint ${kind}`;
}

let timer;
input.addEventListener('input', () => {
  input.value = input.value.toLowerCase().replace(/\s/g, '_');
  clearTimeout(timer);
  const name = input.value;
  if (!name) return setHint('3–20 characters: lowercase letters, numbers, underscores.');
  if (!USERNAME_RE.test(name)) return setHint('3–20 characters: lowercase letters, numbers, underscores.', 'bad');
  if (name === current) return setHint("That's your current username.", 'ok');
  setHint('Checking…');
  timer = setTimeout(async () => {
    const { data: free } = await supabase.rpc('username_available', { p_username: name });
    if (input.value !== name) return;
    setHint(free ? `"${name}" is free.` : `"${name}" is taken.`, free ? 'ok' : 'bad');
  }, 350);
});

$('#username-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = input.value.trim();
  if (!USERNAME_RE.test(name)) return notify(msg, 'Usernames are 3–20 lowercase letters, numbers or underscores.', 'error');

  const done = () => location.replace(safeNext(`profile.html?u=${encodeURIComponent(name)}`));
  if (name === current) return done();

  const btn = e.submitter || $('#username-form button');
  setBusy(btn, true, 'Saving…');
  const { error } = await supabase.from('profiles').update({ username: name }).eq('id', user.id);
  setBusy(btn, false);
  if (error) {
    return notify(msg, error.code === '23505' ? `"${name}" is taken. Pick another one.` : error.message, 'error');
  }
  done();
});
