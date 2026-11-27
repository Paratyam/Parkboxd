// Random episode picker: unwatched, ones you rated (with a minimum), or anything.
import { supabase } from './supabase.js?v=20261127025038';
import { loadAllEpisodes, myLogMap, isAired } from './episodes.js?v=20261127025038';
import { line } from './jokes.js?v=20261127025038';

const KEY = 'parkboxd-random';
const DEFAULTS = { pool: 'unwatched', min: 0, kinds: ['episode'], season: '' };

export function savedSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}

/** Pick an episode for these settings. Returns { ep } or { message }. */
export async function roll(settings) {
  const { data: { user } } = await supabase.auth.getUser();
  const [all, mine] = await Promise.all([loadAllEpisodes(), myLogMap(user.id)]);
  const pool = all.filter((e) => {
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

// Roll and go to the episode, keeping the settings in the URL for "Roll again".
export async function rollAndGo(settings, onMessage) {
  const result = await roll(settings);
  if (!result.ep) return onMessage?.(result.message);
  localStorage.setItem(KEY, JSON.stringify(settings));
  location.href = `episode.html?id=${result.ep.id}&rolled=1`;
}

export async function openRandomPicker() {
  const s = savedSettings();
  const all = await loadAllEpisodes();
  const seasons = [...new Set(all.filter((e) => e.kind === 'episode').map((e) => e.season))].sort((a, b) => a - b);

  const d = document.createElement('dialog');
  d.className = 'log-dialog';
  d.setAttribute('aria-labelledby', 'rand-title');
  document.body.append(d);
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => d.remove());

  d.innerHTML = `
    <form class="sheet paper" novalidate>
      <h2 class="cut" id="rand-title">Random episode</h2>
      <fieldset class="field" style="border:0;padding:0;margin:0">
        <legend style="font-size:13px;font-weight:600;color:var(--text-soft);margin-bottom:8px">Pick from</legend>
        <div class="chips" role="radiogroup">
          ${[['unwatched', "Haven't seen"], ['rated', "I've rated"], ['any', 'Anything']].map(([v, l]) =>
            `<label class="chip" style="cursor:pointer"><input type="radio" name="pool" value="${v}" ${s.pool === v ? 'checked' : ''} class="visually-hidden">${l}</label>`).join('')}
        </div>
      </fieldset>
      <div class="field" id="min-row">
        <label for="rand-min">Rated at least</label>
        <select id="rand-min">${[[0, 'Any rating'], [3, '★★★ and up'], [4, '★★★★ and up'], [4.5, '★★★★½ and up'], [5, '★★★★★ only']].map(([v, l]) =>
          `<option value="${v}" ${Number(s.min) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div class="row">
        <label class="checkbox"><input type="checkbox" name="kind" value="episode" ${s.kinds.includes('episode') ? 'checked' : ''}> Episodes</label>
        <label class="checkbox"><input type="checkbox" name="kind" value="special" ${s.kinds.includes('special') ? 'checked' : ''}> Specials</label>
        <label class="checkbox"><input type="checkbox" name="kind" value="movie" ${s.kinds.includes('movie') ? 'checked' : ''}> Movies</label>
      </div>
      <div class="field">
        <label for="rand-season">Season</label>
        <select id="rand-season"><option value="">Any season</option>${seasons.map((n) => `<option value="${n}" ${String(s.season) === String(n) ? 'selected' : ''}>Season ${n}</option>`).join('')}</select>
      </div>
      <p class="notice" id="rand-msg" hidden></p>
      <div class="actions">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-green">🎲 Roll</button>
      </div>
    </form>`;

  const $d = (q) => d.querySelector(q);
  const sync = () => {
    const pool = $d('input[name="pool"]:checked')?.value;
    d.querySelectorAll('input[name="pool"]').forEach((r) => r.parentElement.setAttribute('aria-pressed', String(r.checked)));
    $d('#min-row').hidden = pool !== 'rated';
  };
  d.querySelectorAll('input[name="pool"]').forEach((r) => r.addEventListener('change', sync));
  sync();
  $d('[data-close]').onclick = () => d.close();

  d.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const settings = {
      pool: $d('input[name="pool"]:checked').value,
      min: Number($d('#rand-min').value),
      kinds: [...d.querySelectorAll('input[name="kind"]:checked')].map((c) => c.value),
      season: $d('#rand-season').value,
    };
    const msg = (text) => { const m = $d('#rand-msg'); m.textContent = text; m.className = 'notice notice-info'; m.hidden = false; };
    if (!settings.kinds.length) return msg('Tick at least one of Episodes, Specials or Movies.');
    await rollAndGo(settings, msg);
  });

  d.showModal();
}

// Professor Chaos mode: the dice pick one of the episodes you rated lowest.
export async function rollWorst(onMessage) {
  const { data: { user } } = await supabase.auth.getUser();
  const [all, mine] = await Promise.all([loadAllEpisodes(), myLogMap(user.id)]);
  const rated = all.filter((e) => mine.get(e.id)?.rating != null);
  if (!rated.length) return onMessage?.('Rate some episodes first. Professor Chaos needs victims.');
  const worst = Math.min(...rated.map((e) => mine.get(e.id).rating));
  const pool = rated.filter((e) => mine.get(e.id).rating <= worst + 0.5);
  const ep = pool[Math.floor(Math.random() * pool.length)];
  location.href = `episode.html?id=${ep.id}&rolled=chaos`;
}
