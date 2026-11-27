// reset.html: the link from the "forgot password" email lands here, already signed in.
import { initPage } from '../layout.js?v=20261127200432';
import { supabase } from '../supabase.js?v=20261127200432';
import { $, notify, setBusy } from '../ui.js?v=20261127200432';

const msg = $('#msg');
const { session } = await initPage({ title: 'New password', needsUsername: false });

if (!session) {
  notify(msg, 'This reset link has expired or was already used. Ask for a new one from the log-in page.', 'error');
  $('#reset-form').hidden = true;
}

$('#reset-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = $('#new-password').value;
  if (pw.length < 8) return notify(msg, 'At least 8 characters, dude.', 'error');
  if (pw !== $('#new-password-2').value) return notify(msg, "Those don't match. Try again, slower this time.", 'error');
  const btn = e.submitter || $('#reset-form button');
  setBusy(btn, true, 'Saving…');
  const { error } = await supabase.auth.updateUser({ password: pw });
  setBusy(btn, false);
  if (error) return notify(msg, error.message, 'error');
  notify(msg, 'Password changed. Taking you home…', 'ok');
  setTimeout(() => { location.href = 'index.html'; }, 1200);
});
