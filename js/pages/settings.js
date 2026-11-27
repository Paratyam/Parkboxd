import { initPage, refreshBell } from '../layout.js?v=20261127181643';
import { supabase } from '../supabase.js?v=20261127181643';
import { $, esc, epCode, notify, setBusy, avatarHTML } from '../ui.js?v=20261127181643';
import { AVATAR_ICONS, AVATAR_KEYS } from '../avatars.js?v=20261127181643';
import { loadStreaks } from '../streak.js?v=20261127181643';
import { loadBadges } from '../badges.js?v=20261127181643';
import { loadAllEpisodes, thumbHTML } from'../episodes.js?v=20261127181643';
import { tourStatus, startTour, endTour, speedrunTour } from '../tour.js?v=20261127181643';
import { FAVOURITE_CHARACTERS, characterColours } from '../data/character-tags.js?v=20261127181643';

const { user, profile } = await initPage({ title: 'Edit profile', auth: 'required' });

const COLOURS = [
  ['#f2711c', 'Orange'], ['#3fb950', 'Green'], ['#4a90e2', 'Blue'], ['#f5c518', 'Yellow'],
  ['#d63a3a', 'Red'], ['#a371f7', 'Purple'], ['#ff7eb6', 'Pink'], ['#c9d6e2', 'Snow'],
];

const all = await loadAllEpisodes();
const byId = new Map(all.map((e) => [e.id, e]));
let top4 = (profile.top4 || []).filter((id) => byId.has(id));
let colour = profile.avatar_color;

$('#uname').textContent = profile.username;
$('#uname2').textContent = profile.username;
$('#cancel').href = `profile.html?u=${encodeURIComponent(profile.username)}`;
$('#display-name').value = profile.display_name || '';
$('#bio').value = profile.bio || '';
const bioCount = () => { $('#bio-count').textContent = $('#bio').value.length; };
$('#bio').addEventListener('input', bioCount);
bioCount();

// ---- Avatar colour ----
$('#swatches').innerHTML = COLOURS.map(([hex, name]) => `
  <label class="swatch" style="--c:${hex}">
    <input type="radio" name="colour" value="${hex}"${hex.toLowerCase() === (colour || '').toLowerCase() ? ' checked' : ''}>
    <span class="avatar" style="--c:${hex};--size:44px" aria-hidden="true">${esc((profile.display_name || profile.username)[0].toUpperCase())}</span>
    <span class="visually-hidden">${name}</span>
  </label>`).join('');
$('#swatches').addEventListener('change', (e) => { colour = e.target.value; drawIcons(); });

// ---- Profile picture: a paper cut-out icon, or the first letter ----
let icon = AVATAR_ICONS[profile.avatar_icon] ? profile.avatar_icon : null;
// Some pictures are rewards, for a Tegridy streak or a badge.
let longest = 0;
let badges = new Map(); // badge id -> badge
function drawIcons() {
  const items = [null, ...AVATAR_KEYS].map((key) => {
    const { streak = 0, badge } = AVATAR_ICONS[key] || {};
    const b = badges.get(badge);
    const locked = (streak > longest || (!!badge && !b?.earned)) && key !== profile.avatar_icon;
    const how = streak ? `reach a ${streak}-day streak` : `earn the ${b?.name || ''} badge. ${b?.desc || ''}`;
    const label = `${key ? AVATAR_ICONS[key].label : 'First letter'}${locked ? ` (locked: ${how})` : ''}`;
    return { locked, html: `
    <label class="swatch${locked ? ' locked' : ''}" title="${esc(label)}">
      <input type="radio" name="avatar-icon" value="${key || ''}"${key === icon ? ' checked' : ''}${locked ? ' disabled' : ''}>
      ${avatarHTML({ display_name: profile.display_name || profile.username, avatar_color: colour, avatar_icon: key }, 52)}
      ${locked ? `<span class="lock-days" aria-hidden="true">🔒${streak || b?.emoji || ''}</span>` : ''}
      <span class="visually-hidden">${esc(label)}</span>
    </label>` };
  });
  // The greyed-out ones go last, under a line saying what they are.
  const group = (locked) => items.filter((i) => i.locked === locked).map((i) => i.html).join('');
  const waiting = group(true);
  $('#icon-picker').innerHTML = group(false) + (waiting
    ? `<p class="locked-note">🔒 Avatars you can unlock: earn the badge, or reach the streak, shown under each one.</p>${waiting}`
    : '');
}
drawIcons();
loadStreaks([user.id]).then((m) => { longest = m.get(user.id).longest; drawIcons(); });
loadBadges([user.id]).then((m) => { badges = new Map(m.get(user.id).badges.map((b) => [b.id, b])); drawIcons(); });
$('#icon-picker').addEventListener('change', (e) => { icon = e.target.value || null; });

// ---- Favourite character ----
// Only the curated list (plus whatever you already picked, so it isn't lost).
const charNames = [...new Set([...FAVOURITE_CHARACTERS, profile.favourite_character].filter(Boolean))]
  .sort((a, b) => a.localeCompare(b));
$('#fav-char').insertAdjacentHTML('beforeend', charNames.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join(''));
$('#fav-char').value = profile.favourite_character || '';
const showFlair = () => {
  const name = $('#fav-char').value;
  const [bg, fg] = characterColours(name);
  $('#fav-preview').innerHTML = name ? `<span class="team-flair paper" style="background-color:${bg};color:${fg}">Team ${esc(name)}</span>` : '';
};
$('#fav-char').addEventListener('change', showFlair);
showFlair();

// ---- Top 4 ----
function renderSlots() {
  $('#top4-slots').innerHTML = [0, 1, 2, 3].map((i) => {
    const ep = byId.get(top4[i]);
    if (!ep) return `<li class="top4-slot paper empty">Slot ${i + 1}<br>empty</li>`;
    return `<li class="top4-filled">
      ${thumbHTML(ep)}
      <div class="slot-tools">
        <button type="button" class="link-button" data-move="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(ep.title)} left">←</button>
        <button type="button" class="link-button" data-remove="${i}" aria-label="Remove ${esc(ep.title)}">Remove</button>
        <button type="button" class="link-button" data-move="${i}" data-dir="1" ${i === top4.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(ep.title)} right">→</button>
      </div>
    </li>`;
  }).join('');
  $('#top4-slots').querySelectorAll('[data-remove]').forEach((b) => b.onclick = () => {
    top4.splice(Number(b.dataset.remove), 1);
    renderSlots();
    renderResults();
  });
  $('#top4-slots').querySelectorAll('[data-move]').forEach((b) => b.onclick = () => {
    const i = Number(b.dataset.move);
    const j = i + Number(b.dataset.dir);
    [top4[i], top4[j]] = [top4[j], top4[i]];
    renderSlots();
  });
}

const search = $('#fav-search');
function renderResults() {
  const q = search.value.trim().toLowerCase();
  const list = $('#fav-results');
  if (!q) { list.innerHTML = ''; return; }
  const m = q.match(/^s(\d+)\s*e(\d+)$/);
  const hits = all.filter((e) => (m ? e.season === +m[1] && e.number === +m[2] : e.title.toLowerCase().includes(q))).slice(0, 30);
  list.innerHTML = hits.map((e) => `
    <li><button type="button" data-add="${e.id}" ${top4.includes(e.id) || top4.length >= 4 ? 'disabled' : ''}>
      <span>${esc(e.title)}</span><span class="code">${top4.includes(e.id) ? 'in your Top 4' : esc(epCode(e))}</span></button></li>`).join('')
    || '<li class="empty">Nothing found.</li>';
  if (top4.length >= 4) list.insertAdjacentHTML('afterbegin', '<li class="hint" style="padding:6px">Your Top 4 is full. Remove one to add another.</li>');
  list.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => {
    top4.push(Number(b.dataset.add));
    renderSlots();
    renderResults();
  });
}
search.addEventListener('input', renderResults);
renderSlots();

// Jump straight to the Top 4 picker from profile links like settings.html#top4.
if (location.hash === '#top4') search.focus();

// ---- Save ----
$('#profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#save');
  setBusy(btn, true, 'Saving…');
  const { error } = await supabase.from('profiles').update({
    display_name: $('#display-name').value.trim() || null,
    bio: $('#bio').value.trim() || null,
    avatar_color: colour,
    avatar_icon: icon,
    favourite_character: $('#fav-char').value || null,
    top4,
  }).eq('id', user.id);
  setBusy(btn, false);
  if (error) return notify($('#msg'), error.message, 'error');
  location.href = `profile.html?u=${encodeURIComponent(profile.username)}`;
});

// ---- Stan's tour: takes effect straight away, no "Save profile" needed ----
const TOUR_TEXT = {
  on: ['The tour is on: at most one tip a day in your notifications.', 'End the tour'],
  done: ["You've had the whole tour.", 'Restart the tour'],
  off: ['The tour is off.', 'Restart the tour'],
  invited: ['Short tips about what the site can do, at most one a day in your notifications.', 'Start the tour'],
};
function showTour() {
  const [text, label] = TOUR_TEXT[tourStatus(user.id)] || TOUR_TEXT.invited;
  $('#tour-state').textContent = `${text} This setting is remembered on this device only.`;
  $('#tour-toggle').textContent = label;
}
$('#tour-toggle').addEventListener('click', () => {
  if (tourStatus(user.id) === 'on') endTour(user.id);
  else startTour(user.id);
  showTour();
  refreshBell();
});
$('#tour-speedrun').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  setBusy(btn, true, 'Speedrunning…');
  await speedrunTour(user.id);
  setBusy(btn, false);
  showTour();
  $('#tour-state').insertAdjacentHTML('beforeend', ' <a href="notifications.html">Read it in your notifications.</a>');
  refreshBell();
});
showTour();

// ---- Account: email, password, delete ----
const { data: { user: authUser } } = await supabase.auth.getUser();
$('#current-email').textContent = authUser?.email || 'unknown';
$('#delete-uname').textContent = profile.username;

$('#email-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#new-email').value.trim();
  const btn = e.submitter || $('#email-form button');
  if (!/^\S+@\S+\.\S+$/.test(email)) return notify($('#email-msg'), "That doesn't look like an email address.", 'error');
  setBusy(btn, true, 'Sending…');
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: new URL('settings.html', location.href).href });
  setBusy(btn, false);
  if (error) return notify($('#email-msg'), error.message, 'error');
  notify($('#email-msg'), `Check ${email} (and your old inbox) for a confirmation link. The change happens once you click it.`, 'info');
});

$('#password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = $('#new-password').value;
  const btn = e.submitter || $('#password-form button');
  if (pw.length < 8) return notify($('#password-msg'), 'At least 8 characters, please. Even Cartman knows that.', 'error');
  if (pw !== $('#new-password2').value) return notify($('#password-msg'), "The two passwords don't match.", 'error');
  setBusy(btn, true, 'Saving…');
  const { error } = await supabase.auth.updateUser({ password: pw });
  setBusy(btn, false);
  if (error) return notify($('#password-msg'), error.message, 'error');
  $('#password-form').reset();
  notify($('#password-msg'), 'Password changed. Respect your new authoritah.', 'info');
});

$('#delete-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter || $('#delete-form button');
  if ($('#delete-confirm').value.trim().toLowerCase() !== profile.username) {
    return notify($('#delete-msg'), 'Type your username exactly to confirm.', 'error');
  }
  if (!confirm('Really delete your account and everything in it? This cannot be undone.')) return;
  setBusy(btn, true, 'Deleting…');
  const { error } = await supabase.rpc('delete_my_account');
  if (error) { setBusy(btn, false); return notify($('#delete-msg'), error.message, 'error'); }
  await supabase.auth.signOut();
  location.href = 'index.html';
});
