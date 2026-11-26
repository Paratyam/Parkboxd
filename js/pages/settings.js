import { initPage } from '../layout.js';
import { supabase } from '../supabase.js';
import { $, esc, epCode, notify, setBusy } from '../ui.js';
import { loadAllEpisodes, thumbHTML } from '../episodes.js';

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
$('#swatches').addEventListener('change', (e) => { colour = e.target.value; });

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
    top4,
  }).eq('id', user.id);
  setBusy(btn, false);
  if (error) return notify($('#msg'), error.message, 'error');
  location.href = `profile.html?u=${encodeURIComponent(profile.username)}`;
});
