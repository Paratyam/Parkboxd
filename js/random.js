// Random episodes: the Chef's menu picker, the home page's quick rolls and Chaos mode.
import { supabase } from './supabase.js?v=20261128092557';
import { loadAllEpisodes, myLogMap, isAired } from './episodes.js?v=20261128092557';
import { COON_SAGA, norm } from './coon-member.js?v=20261128092557';
import { line } from './jokes.js?v=20261128092557';
import { mountMenu } from './chef.js?v=20261128092557';

const KEY = 'parkboxd-random';
const DEFAULTS = { pool: 'unwatched', min: 0, kinds: ['episode'], season: '' };

export function savedSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}

/** Pick an episode for these settings. Returns { ep } or { message }. */
export async function roll(settings) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && settings.pool === 'rated') return { message: "Log in to roll from episodes you've rated." };
  const [all, mine] = await Promise.all([
    loadAllEpisodes(),
    user ? myLogMap(user.id) : new Map(),
  ]);
  let pool = all.filter((e) => {
    if (!isAired(e) || !settings.kinds.includes(e.kind)) return false;
    if (settings.season && String(e.season) !== String(settings.season)) return false;
    if (settings.pool === 'unwatched') return !mine.has(e.id);
    if (settings.pool === 'rated') {
      const r = mine.get(e.id)?.rating;
      return r != null && r >= settings.min;
    }
    return true;
  });
  if (!pool.length) {
    return { message: settings.pool === 'unwatched' ? line('allSeen') : settings.pool === 'rated' ? line('noFavs') : line('searchEmpty') };
  }
  return { ep: pool[Math.floor(Math.random() * pool.length)], count: pool.length };
}

// During a Coon takeover every roll lands on the Coon saga (not the episode you're already on).
const coonRules = () => document.documentElement.classList.contains('coon-takeover-on');

async function rollCoon() {
  const here = new URLSearchParams(location.search).get('id');
  const saga = COON_SAGA.map(norm);
  const pool = (await loadAllEpisodes()).filter((e) => e.kind === 'episode' && saga.includes(norm(e.title)) && String(e.id) !== here);
  if (!pool.length) return false;
  location.href = `episode.html?id=${pool[Math.floor(Math.random() * pool.length)].id}&rolled=coon`;
  return true;
}

// Roll and go to the episode, keeping the settings in the URL for "Roll again".
export async function rollAndGo(settings, onMessage) {
  if (coonRules() && await rollCoon()) return;
  const result = await roll(settings);
  if (!result.ep) return onMessage?.(result.message);
  localStorage.setItem(KEY, JSON.stringify(settings));
  location.href = `episode.html?id=${result.ep.id}&rolled=1`;
}

export async function openRandomPicker() {
  if (coonRules() && await rollCoon()) return;
  const d = document.createElement('dialog');
  d.className = 'log-dialog';
  d.setAttribute('aria-labelledby', 'rand-title');
  document.body.append(d);
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => d.remove());

  d.innerHTML = `
    <div class="sheet paper">
      <h2 class="cut" id="rand-title">Chef's menu</h2>
      <div class="rand-panel" id="rand-menu"></div>
      <div class="actions">
        <button type="button" class="btn btn-ghost" data-close>Close</button>
      </div>
    </div>`;

  d.querySelector('[data-close]').onclick = () => d.close();
  mountMenu(d.querySelector('#rand-menu'));
  d.showModal();
}

// Professor Chaos mode: the dice pick one of the episodes you rated lowest.
export async function rollWorst(onMessage) {
  if (coonRules() && await rollCoon()) return;
  const { data: { user } } = await supabase.auth.getUser();
  const [all, mine] = await Promise.all([loadAllEpisodes(), myLogMap(user.id)]);
  const rated = all.filter((e) => mine.get(e.id)?.rating != null);
  if (!rated.length) return onMessage?.('Rate some episodes first. Professor Chaos needs victims.');
  const worst = Math.min(...rated.map((e) => mine.get(e.id).rating));
  const pool = rated.filter((e) => mine.get(e.id).rating <= worst + 0.5);
  const ep = pool[Math.floor(Math.random() * pool.length)];
  location.href = `episode.html?id=${ep.id}&rolled=chaos`;
}
