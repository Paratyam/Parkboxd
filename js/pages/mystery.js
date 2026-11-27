// mystery.html: Kenny's Daily Mystery Episode. One blurry still a day, the same for everyone.
// Each wrong guess sharpens the picture and Kenny gives a (muffled) hint. Six tries.
import { initPage, logEpisode } from '../layout.js?v=20261127030850';
import { supabase } from '../supabase.js?v=20261127030850';
import { $, esc, epCode, toast } from '../ui.js?v=20261127030850';
import { loadAllEpisodes, stillUrl, isAired } from '../episodes.js?v=20261127030850';

const { user } = await initPage({ title: "Kenny's Mystery Episode", auth: 'required' });
const root = $('#mystery');

const DAY = 86400000;
const LAUNCH = Date.UTC(2026, 10, 27); // puzzle #1
const MAX = 6;
const BLUR = [26, 17, 11, 6, 3, 1.5, 0]; // by wrong guesses so far; 0 once it's over
const STORE = `parkboxd-mystery-${user.id}`;

const today = Math.floor(Date.now() / DAY);
const number = Math.floor((today * DAY - LAUNCH) / DAY) + 1;

function seededIndex(seed, n) {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (((t ^ (t >>> 14)) >>> 0) % n);
}

const all = await loadAllEpisodes();
const pool = all.filter((e) => e.kind === 'episode' && isAired(e) && e.still_path).sort((a, b) => a.id - b.id);
if (!pool.length) {
  root.innerHTML = '<p class="empty">No episode pictures yet. Kenny is lost.</p>';
  root.removeAttribute('aria-busy');
  throw new Error('no episodes');
}
const answer = pool[seededIndex(today * 7 + 13, pool.length)];
const { data: tagRows } = await supabase.from('episode_tags').select('tags(name, kind)').eq('episode_id', answer.id);
const character = (tagRows || []).map((t) => t.tags).filter((t) => t?.kind === 'character').map((t) => t.name)[0];

// Hints, clearest last. Kenny says them muffled; the translation sits underneath.
const words = answer.title.split(/\s+/).length;
const HINTS = [
  `It's from Season ${answer.season}.`,
  `It first aired in ${answer.air_date.slice(0, 4)}.`,
  character ? `${character} is in it. A lot.` : `The title has ${words} word${words === 1 ? '' : 's'}.`,
  `It's episode ${answer.number} of the season.`,
  `The title starts with “${answer.title[0]}”.`,
];
const muffle = (text) => text.split(/\s+/).map((w, i) => ['Mmph', 'mmrph', 'mph', 'mmmph', 'rmph'][(w.length + i) % 5]).join(' ') + '!';

// ---- Saved progress and stats ----
const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };
const store = load();
store.days = store.days || {};
const game = store.days[today] || { guesses: [], done: false, won: false };
const save = () => {
  store.days[today] = game;
  // keep the last 60 days only
  for (const k of Object.keys(store.days)) if (Number(k) < today - 60) delete store.days[k];
  localStorage.setItem(STORE, JSON.stringify(store));
};
function stats() {
  const days = Object.entries(store.days).map(([d, g]) => ({ d: Number(d), ...g })).filter((g) => g.done);
  const won = days.filter((g) => g.won);
  let streak = 0;
  for (let d = today; ; d--) {
    const g = store.days[d];
    if (g?.done && g.won) streak++;
    else if (d === today && !g?.done) continue; // today isn't finished yet
    else break;
  }
  const dist = [1, 2, 3, 4, 5, 6].map((n) => won.filter((g) => g.guesses.length === n).length);
  return { played: days.length, won: won.length, streak, dist };
}

const byId = new Map(all.map((e) => [e.id, e]));
const wrong = () => game.guesses.filter((id) => id !== answer.id).length;

function render() {
  const blur = game.done ? 0 : BLUR[Math.min(wrong(), BLUR.length - 2)];
  const hintsShown = game.done ? HINTS.length : Math.min(wrong(), HINTS.length);
  const s = stats();
  const squares = game.guesses.map((id) => (id === answer.id ? '🟩' : id ? '🟥' : '⬛')).join('');
  root.innerHTML = `
    <section class="mystery-head">
      <span class="mystery-kenny" aria-hidden="true">🧥</span>
      <div>
        <span class="club-kicker" style="color:var(--orange)">Daily puzzle #${number}</span>
        <h1 class="cut">Kenny's Mystery Episode</h1>
        <p>Which episode is this? Every wrong guess makes the picture sharper and gets you a hint from Kenny. You have ${MAX} tries. New puzzle every day.</p>
      </div>
    </section>
    <div class="mystery-layout">
      <div>
        <div class="mystery-frame paper">
          <img src="${esc(stillUrl(answer, 'w780'))}" alt="${game.done ? esc(answer.title) : 'The mystery episode, blurred'}" style="filter:blur(${blur}px)${game.done ? '' : ' saturate(1.2)'}">
          ${game.done ? '' : `<span class="mystery-tries cut">${MAX - game.guesses.length} ${MAX - game.guesses.length === 1 ? 'try' : 'tries'} left</span>`}
        </div>
        ${game.done ? `
          <div class="mystery-result ${game.won ? 'won' : 'lost'} paper">
            <strong class="cut">${game.won ? `Mmph! You got it in ${game.guesses.length}!` : 'Kenny didn\'t make it today.'}</strong>
            <p>${game.won ? '(Kenny says: nice job, dude.)' : 'He\'ll be back tomorrow. He always is.'} It was <a href="episode.html?id=${answer.id}">${esc(answer.title)}</a> · ${esc(epCode(answer))}.</p>
            <div class="mystery-squares" aria-label="Your guesses">${squares}</div>
            <div class="toolbar">
              <button type="button" class="btn btn-green" id="m-share">Copy my result</button>
              <button type="button" class="btn btn-ghost" id="m-log">Log ${esc(answer.title)}</button>
            </div>
          </div>` : `
          <form class="mystery-guess" id="m-form" autocomplete="off">
            <label class="visually-hidden" for="m-q">Your guess</label>
            <input type="search" id="m-q" placeholder="Type an episode name…">
            <ul class="pick-results" id="m-results"></ul>
            <div class="toolbar"><button type="button" class="btn btn-ghost" id="m-skip">Skip (show me more)</button></div>
          </form>`}
        ${game.guesses.length ? `<ol class="mystery-guesses">${game.guesses.map((id) => `<li class="${id === answer.id ? 'right' : 'wrong'}">${id === answer.id ? '✓' : '✗'} ${id ? esc(byId.get(id)?.title || '?') : '<em>skipped</em>'}</li>`).join('')}</ol>` : ''}
      </div>
      <aside class="mystery-side">
        <div class="mystery-hints">
          <h2 class="cut">Kenny's hints</h2>
          ${hintsShown ? HINTS.slice(0, hintsShown).map((h, i) => `
            <div class="kenny-hint"><span class="kenny-says">“${esc(muffle(h))}”</span><span class="kenny-means">Kenny means: ${esc(h)}</span></div>`).join('')
            : '<p class="kenny-hint"><span class="kenny-says">“Mmph mmph.”</span><span class="kenny-means">Kenny means: guess first, then I\'ll help.</span></p>'}
        </div>
        <div class="mystery-stats paper">
          <h2 class="cut">Your stats</h2>
          <div class="mystery-nums"><div><b>${s.played}</b><span>Played</span></div><div><b>${s.played ? Math.round((s.won / s.played) * 100) : 0}%</b><span>Won</span></div><div><b>${s.streak}</b><span>Streak</span></div></div>
          <ol class="mystery-dist">${s.dist.map((n, i) => `<li><span>${i + 1}</span><div style="width:${Math.max(6, (n / Math.max(1, ...s.dist)) * 100)}%">${n}</div></li>`).join('')}</ol>
        </div>
      </aside>
    </div>`;
  root.removeAttribute('aria-busy');
  wire();
}

function guess(id) {
  if (game.done) return;
  if (id && game.guesses.includes(id)) return toast("You already guessed that one. Mmph.");
  game.guesses.push(id);
  if (id === answer.id) { game.done = true; game.won = true; }
  else if (game.guesses.length >= MAX) { game.done = true; game.won = false; }
  save();
  render();
  if (!game.done && id) toast(['Mmph! (Nope.)', 'Mmmph mph! (Not that one.)', 'Mph. (Try again.)'][game.guesses.length % 3]);
}

function wire() {
  $('#m-share')?.addEventListener('click', async () => {
    const squares = game.guesses.map((id) => (id === answer.id ? '🟩' : id ? '🟥' : '⬛')).join('');
    const text = `Parkboxd Mystery Episode #${number} ${game.won ? `${game.guesses.length}/${MAX}` : `X/${MAX}`}\n${squares}`;
    try { await navigator.clipboard.writeText(text); toast('Copied! Go brag about it.'); } catch { toast(text); }
  });
  $('#m-log')?.addEventListener('click', () => logEpisode({ episode: answer }));
  const q = $('#m-q');
  if (!q) return;
  const list = $('#m-results');
  const show = () => {
    const t = q.value.trim().toLowerCase();
    const hits = t.length < 2 ? [] : all.filter((e) => e.kind === 'episode' && isAired(e) && e.title.toLowerCase().includes(t)).slice(0, 8);
    list.innerHTML = hits.map((e) => `<li><button type="button" data-guess="${e.id}"><span>${esc(e.title)}</span></button></li>`).join('');
    list.querySelectorAll('[data-guess]').forEach((b) => { b.onclick = () => guess(Number(b.dataset.guess)); });
  };
  q.addEventListener('input', show);
  $('#m-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = q.value.trim().toLowerCase();
    const exact = all.find((x) => x.kind === 'episode' && x.title.toLowerCase() === t);
    if (exact) guess(exact.id);
    else list.querySelector('[data-guess]')?.click();
  });
  $('#m-skip').addEventListener('click', () => guess(null));
  q.focus();
}

render();
