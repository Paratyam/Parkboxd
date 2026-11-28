// Who's online. Every page sends a heartbeat while it's on screen; only people who follow each
// other can read it (the database enforces that). Everything here fails quietly: without the
// database functions the site just shows no status.
import { supabase } from './supabase.js?v=20261128084453';

const BEAT = 60000;        // write at most once a minute, across tabs and page loads
const ONLINE = 150;        // seen this many seconds ago or less = online now
const RECENT = 7 * 86400;  // older than this shows nothing

export function startPresence(userId) {
  const key = `parkboxd-beat-${userId}`;
  let last = 0;
  let timer = null;
  const store = (v) => { try { localStorage.setItem(key, v); } catch { /* private window */ } };
  const stored = () => { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } };
  const beat = async () => {
    const now = Date.now();
    if (document.hidden || now - Math.max(last, stored()) < BEAT) return;
    last = now;
    store(now);
    const { error } = await supabase.rpc('touch_presence');
    if (!error) return;
    store(0);
    if (error.code === 'PGRST202') { clearInterval(timer); document.removeEventListener('visibilitychange', beat); }
  };
  const safeBeat = () => beat().catch(() => {});
  timer = setInterval(safeBeat, 15000);
  document.addEventListener('visibilitychange', safeBeat);
  safeBeat();
}

let seen = new Map(); // user id -> when they were last here, on this device's clock
let watching = null;

async function refresh() {
  // The database sends ages, not times, so a wrong device clock doesn't matter.
  const { data, error } = await supabase.rpc('friends_presence');
  if (error || !Array.isArray(data)) return;
  const now = Date.now();
  seen = new Map(data.map((r) => [r.user_id, now - r.seconds_ago * 1000]));
}

export function presenceStatus(at, now = Date.now()) {
  if (at == null) return null;
  const secs = Math.max(0, Math.round((now - at) / 1000));
  if (secs <= ONLINE) return { online: true, text: 'Online now' };
  if (secs > RECENT) return null;
  const ago = secs < 3600 ? `${Math.floor(secs / 60)}m` : secs < 86400 ? `${Math.floor(secs / 3600)}h` : `${Math.floor(secs / 86400)}d`;
  return { online: false, text: `Active ${ago} ago` };
}

// Placeholders, filled in by showPresence().
export const presenceAvatar = (id, avatar) => `<span class="presence-wrap">${avatar}<i class="presence-dot" data-presence="${id}" hidden></i></span>`;
export const presenceText = (id) => `<small class="presence-text" data-presence="${id}" hidden></small>`;

function paint(root) {
  root.querySelectorAll('[data-presence]').forEach((el) => {
    const s = presenceStatus(seen.get(el.dataset.presence));
    el.hidden = !s;
    el.classList.toggle('online', !!s?.online);
    if (el.classList.contains('presence-text')) el.textContent = s?.text || '';
  });
}

// Call after every render of `root`. Keeps the status current while the page is on screen.
export function showPresence(root) {
  paint(root);
  const update = () => refresh().catch(() => {}).then(() => paint(root));
  update();
  if (watching) return;
  const tick = () => { if (!document.hidden) update(); };
  watching = setInterval(tick, 30000);
  document.addEventListener('visibilitychange', tick);
}
