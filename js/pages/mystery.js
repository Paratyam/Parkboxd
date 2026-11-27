// mystery.html: Kenny's Daily Mystery Episode. One blurry still a day, the same for everyone.
// Each wrong guess sharpens the picture and Kenny gives a (muffled) hint. Six tries.
import { SITE_LINK } from '../config.js?v=20261127132311';
import { initPage, logEpisode } from '../layout.js?v=20261127132311';
import { supabase } from '../supabase.js?v=20261127132311';
import { $, esc, epCode, toast } from '../ui.js?v=20261127132311';
import { loadAllEpisodes, stillUrl, isAired } from '../episodes.js?v=20261127132311';
import { mysterySVG } from '../art.js?v=20261127132311';

const { user } = await initPage({ title: "Kenny's Mystery Episode", auth: 'required' });
const root = $('#mystery');

const DAY = 86400000;
const LAUNCH = Date.UTC(2026, 10, 27); // puzzle #1
const MAX = 6;
const BLUR = [26, 17, 11, 6, 3, 1.5, 0]; // by wrong guesses so far; 0 once it's over
const PHONE = window.matchMedia("(max-width: 760px)"); // same breakpoint as the one-column layout
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
// 1 season · 2 a main character (or the title's word count) · 3 the episode number
// · 4 the title's first letter · 5 a whole sentence from the plot summary
const words = answer.title.split(/\s+/).length;
// Title words are blanked out of the plot sentence so it doesn't just give the answer away.
const COMMON = new Set(['the', 'and', 'for', 'with', 'are', 'you', 'not', 'but', 'his', 'her', 'its', 'all', 'from', 'one', 'two']);
const titleWords = new Set((answer.title.toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length >= 3 && !COMMON.has(w)));
const sentences = (answer.overview || '').match(/[^.!?]+[.!?]+/g) || (answer.overview ? [answer.overview] : []);
const plotSentence = sentences.map((s) => s.trim()).find((s) => s.split(/\s+/).length >= 6) || sentences[0]?.trim();
const blanked = plotSentence && plotSentence.replace(/[A-Za-z']+/g, (w) => (titleWords.has(w.toLowerCase().replace(/'s$/, '')) ? '____' : w));
const HINTS = [
  `It's from Season ${answer.season}.`,
  character ? `${character} is in it. A lot.` : `The title has ${words} word${words === 1 ? '' : 's'}.`,
  `It's episode ${answer.number} of the season.`,
  `The title starts with “${answer.title[0]}”.`,
  blanked ? `From the plot: “${blanked}”` : `The title has ${answer.title.replace(/[^A-Za-z]/g, '').length} letters.`,
];
const EXHIBITS = ['A', 'B', 'C', 'D', 'E'];
const muffle = (text) => text.split(/\s+/).map((w, i) => ['Mmph', 'mmrph', 'mph', 'mmmph', 'rmph'][(w.length + i) % 5]).join(' ') + '!';

// ---- Saved progress and stats: one database row per day, so they follow you between devices ----
const { data: rows } = await supabase.from('mystery_plays').select('day, guesses, done, won')
  .eq('user_id', user.id).order('day', { ascending: false }).limit(400);
const store = { days: Object.fromEntries((rows || []).map((r) => [r.day, { guesses: r.guesses || [], done: r.done, won: r.won }])) };
// One-time move of games saved in this browser before stats lived in the database.
try {
  const old = JSON.parse(localStorage.getItem(STORE));
  const moved = Object.entries(old?.days || {}).filter(([d]) => !store.days[d])
    .map(([d, g]) => ({ user_id: user.id, day: Number(d), guesses: g.guesses || [], done: !!g.done, won: !!g.won }));
  if (moved.length) {
    const { error } = await supabase.from('mystery_plays').upsert(moved, { onConflict: 'user_id,day' });
    if (!error) moved.forEach((m) => { store.days[m.day] = { guesses: m.guesses, done: m.done, won: m.won }; });
  }
  if (old) localStorage.removeItem(STORE);
} catch { /* nothing to move */ }
const game = store.days[today] || { guesses: [], done: false, won: false };
const save = () => {
  store.days[today] = game;
  supabase.from('mystery_plays')
    .upsert({ user_id: user.id, day: today, guesses: game.guesses, done: game.done, won: game.won, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day' })
    .then(({ error }) => { if (error) toast(`Couldn't save that guess: ${error.message}`); });
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
  const left = MAX - game.guesses.length;
  root.innerHTML = `
    <section class="case-head">
      <span class="case-tab cut">Case file #${number}</span>
      <span class="case-stamp cut" aria-hidden="true">Top secret</span>
      <div class="case-head-row">
        <span class="mystery-logo">${mysterySVG()}</span>
        <div>
          <h1 class="cut">Kenny's Mystery Episode</h1>
          <p>Somebody stole an episode and Kenny saw everything. Every wrong guess sharpens the evidence photo and gets you a clue from your witness. He's a little hard to understand. ${MAX} tries. New case every day.</p>
        </div>
      </div>
    </section>
    <div class="mystery-layout">
      <div class="mystery-board">
        <div class="mystery-frame">
          <span class="evidence-label cut" aria-hidden="true">Evidence photo</span>
          <img src="${esc(stillUrl(answer, 'w780'))}" alt="${game.done ? esc(answer.title) : 'The mystery episode, blurred'}" style="filter:blur(${blur}px)${game.done ? '' : ' saturate(1.2)'}">
          ${game.done ? `<span class="case-verdict cut ${game.won ? 'won' : 'lost'}">${game.won ? 'Case closed' : 'R.I.P. Kenny'}</span>` : ''}
        </div>
        ${!game.done && hintsShown ? `
          <div class="mystery-new-clue" role="status">
            <span class="exhibit cut">🆕 New clue · Exhibit ${EXHIBITS[hintsShown - 1]}</span>
            <span class="kenny-says">“${esc(muffle(HINTS[hintsShown - 1]))}”</span>
            <span class="kenny-means">Kenny means: ${esc(HINTS[hintsShown - 1])}</span>
            ${hintsShown > 1 ? `<a href="#m-clues" class="mystery-all-clues">See all ${hintsShown} clues ↓</a>` : ''}
          </div>` : ''}
        ${game.done ? '' : `<div class="kenny-lives" aria-label="${left} ${left === 1 ? 'try' : 'tries'} left">${Array.from({ length: MAX }, (_, i) => `<span class="${i < left ? '' : 'used'}" aria-hidden="true">🧥</span>`).join('')}<b>${left} ${left === 1 ? 'life' : 'lives'} left</b></div>`}
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
        <div class="case-folder" id="m-clues">
          <h2 class="cut">Witness statements</h2>
          ${HINTS.map((h, i) => (i < hintsShown ? `
            <div class="kenny-hint${!game.done && i === hintsShown - 1 ? ' newest' : ''}"><span class="exhibit cut">Exhibit ${EXHIBITS[i]}</span><span class="kenny-says">“${esc(muffle(h))}”</span><span class="kenny-means">Kenny means: ${esc(h)}</span></div>`
            : `<div class="kenny-hint locked"><span class="exhibit cut">Exhibit ${EXHIBITS[i]}</span><span class="kenny-means">🔒 Unlocks after ${i + 1} wrong guess${i ? 'es' : ''}</span></div>`)).join('')}
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
  if (!game.done && id) toast(`${['Mmph! (Nope.)', 'Mmmph mph! (Not that one.)', 'Mph. (Try again.)'][game.guesses.length % 3]}${wrong() <= HINTS.length ? ' New clue unlocked!' : ''}`);
  // On phones the clue box sits under the photo: bring it into view.
  if (!game.done && PHONE.matches) $('.mystery-new-clue')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function wire() {
  $('#m-share')?.addEventListener('click', async () => {
    const squares = game.guesses.map((id) => (id === answer.id ? '🟩' : id ? '🟥' : '⬛')).join('');
    const { streak } = stats();
    const text = `Parkboxd Mystery Episode #${number} ${game.won ? `${game.guesses.length}/${MAX}` : `X/${MAX}`}\n${squares}\n${streak > 1 ? `🔥 ${streak}-day streak. ` : ''}Can you beat me?\nhttps://${SITE_LINK}/mystery.html`;
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
  // Not on phones: the keyboard would pop up and cover the new clue.
  if (!PHONE.matches) q.focus();
}

render();
