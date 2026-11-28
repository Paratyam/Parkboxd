// mystery.html: Kenny's Daily Mystery Episode. One blurry still a day, the same for everyone.
// Each wrong guess sharpens the picture, says earlier or later, and unlocks a (muffled) clue. Six tries.
import { sfx } from '../sfx.js?v=20261128085011';
import { SITE_LINK } from '../config.js?v=20261128085011';
import { initPage, logEpisode } from '../layout.js?v=20261128085011';
import { supabase } from '../supabase.js?v=20261128085011';
import { $, esc, epCode, toast, params, avatarHTML } from '../ui.js?v=20261128085011';
import { followingIds } from '../social.js?v=20261128085011';
import { loadAllEpisodes, stillUrl, isAired } from '../episodes.js?v=20261128085011';
import { mysterySVG } from '../art.js?v=20261128085011';
import { MYSTERY_CLUES } from '../data/mystery-clues.js?v=20261128085011';
import { loadLeague, leagueHTML } from '../mystery-league.js?v=20261128085011';

const { user } = await initPage({ title: "Kenny's Mystery Episode", auth: 'required' });
const root = $('#mystery');

const DAY = 86400000;
const LAUNCH = Date.UTC(2026, 10, 27); // puzzle #1
const MAX = 6;
const BLUR = [26, 17, 11, 6, 3, 1.5, 0]; // by wrong guesses so far; 0 once it's over
const PHONE = window.matchMedia("(max-width: 760px)"); // same breakpoint as the one-column layout
const STORE = `parkboxd-mystery-${user.id}`;

const today = Math.floor(Date.now() / DAY);
const launchDay = LAUNCH / DAY;
const todayNumber = today - launchDay + 1;
const asked = Number(params.get('case'));
const cold = Number.isInteger(asked) && asked >= 1 && asked < todayNumber;
const number = cold ? asked : todayNumber;
const day = cold ? launchDay + number - 1 : today; // the day whose puzzle is on screen
const dayISO = new Date(day * DAY).toISOString().slice(0, 10);

function seededIndex(seed, n) {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (((t ^ (t >>> 14)) >>> 0) % n);
}

const all = await loadAllEpisodes();
// Only episodes that had aired by that day, so a past day keeps its answer when new episodes arrive.
const pool = all.filter((e) => e.kind === 'episode' && e.air_date && e.air_date <= dayISO && e.still_path).sort((a, b) => a.id - b.id);
if (!pool.length) {
  root.innerHTML = '<p class="empty">No episode pictures yet. Kenny is lost.</p>';
  root.removeAttribute('aria-busy');
  throw new Error('no episodes');
}
// A day listed here was reset and drew a new episode (day = days since 1970-01-01 UTC).
const RESEEDS = { 20784: 1 };
const answer = pool[seededIndex(day * 7 + 13 + (RESEEDS[day] || 0) * 100003, pool.length)];
const [{ data: tagRows }, { data: rated }] = await Promise.all([
  supabase.from('episode_tags').select('tags(name, kind)').eq('episode_id', answer.id),
  supabase.from('episode_ratings').select('avg_rating, rating_count').eq('episode_id', answer.id).maybeSingle(),
]);
const character = (tagRows || []).map((t) => t.tags).filter((t) => t?.kind === 'character').map((t) => t.name)[0];

// Clues, clearest last: A does Kenny make it · B the Parkboxd rating · C the main character
// · D the evidence bag (emojis) · E Kenny's own comment. Kenny says them muffled, with the
// translation underneath. The season and episode number come from the warmer/colder arrows.
const [fate, evidence, comment] = MYSTERY_CLUES[`${answer.season}.${answer.number}`] || ['?'];
const FATES = {
  d: 'I definitely DIE in this episode. Typical.',
  s: 'I definitely do NOT die in this episode. I make it out alive! Dude, write that down.',
  a: "Dying isn't an issue: I'm not really in this episode. Long story.",
  '?': "My memory's fuzzy on whether I make it out of this episode alive, dude.",
};
const ratingCount = rated?.rating_count || 0;
const verdict = !ratingCount ? "Nobody on Parkboxd has rated this one yet. I know how that feels."
  : `${ratingCount === 1 ? '1 Parkboxd member gave' : 'Parkboxd members give'} it ${Number(rated.avg_rating).toFixed(1)} stars.`;
// Title words are blanked out of Kenny's comment so it doesn't just give the answer away.
const COMMON = new Set(['the', 'and', 'for', 'with', 'are', 'you', 'not', 'but', 'his', 'her', 'its', 'all', 'from', 'one', 'two']);
const titleWords = new Set((answer.title.toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length >= 3 && !COMMON.has(w)));
const blank = (text) => text.replace(/[A-Za-z']+/g, (w) => (titleWords.has(w.toLowerCase().replace(/'s$/, '')) ? '____' : w));
// A new episode with no line in js/data/mystery-clues.js yet falls back to the title's shape.
const words = answer.title.split(/\s+/).length;
const letters = answer.title.replace(/[^A-Za-z]/g, '').length;
const HINTS = [
  { topic: '💀 Does Kenny die in this episode?', text: FATES[fate] },
  { topic: '⭐ How does Parkboxd rate this episode?', text: verdict },
  { topic: '👀 Who is the main character of this episode?', text: !character ? "Nobody hogs this one, dude. It's a group thing." : character === 'Kenny' ? 'Keep an eye on me, dude.' : `Keep an eye on ${character}.` },
  evidence ? { topic: '🧾 The evidence bag:', evidence, text: 'Three things from this episode.' }
    : { topic: '🔤 How long is the title?', text: `The title has ${words} word${words === 1 ? '' : 's'}.` },
  comment ? { topic: '💬 What Kenny thinks happens in this episode', text: blank(comment) }
    : { topic: '🔤 How many letters are in the title?', text: `The title has ${letters} letters.` },
];
const EXHIBITS = ['A', 'B', 'C', 'D', 'E'];
const muffle = (text) => text.split(/\s+/).map((w, i) => ['Mmph', 'mmrph', 'mph', 'mmmph', 'rmph'][(w.length + i) % 5]).join(' ') + '!';
const clueHTML = (h) => `${h.topic ? `<span class="kenny-topic">${esc(h.topic)}</span>` : ''}${h.evidence
  ? `<span class="kenny-evidence">${esc(h.evidence)}</span><span class="kenny-means">${esc(h.text)}</span>`
  : `<span class="kenny-says">“${esc(muffle(h.text))}”</span><span class="kenny-means">Kenny means: ${esc(h.text)}</span>`}`;

// ---- Saved progress and stats: one database row per day, so they follow you between devices ----
const { data: rows } = await supabase.from('mystery_plays').select('day, guesses, done, won, cold')
  .eq('user_id', user.id).order('day', { ascending: false }).limit(1000);
const store = { days: Object.fromEntries((rows || []).map((r) => [r.day, { guesses: r.guesses || [], done: r.done, won: r.won, cold: r.cold }])) };
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
const game = store.days[day] || { guesses: [], done: false, won: false, cold };
const save = () => {
  if (cold) game.cold = true; // a day finished late is a cold case, even if it was started on time
  store.days[day] = game;
  supabase.from('mystery_plays')
    .upsert({ user_id: user.id, day, guesses: game.guesses, done: game.done, won: game.won, cold: !!game.cold, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day' })
    .then(({ error }) => { if (error) toast(`Couldn't save that guess: ${error.message}`); });
};
// Wins in a row up to today, cold cases not counted. `days` maps day -> play.
function streakOf(days) {
  let streak = 0;
  for (let d = today; ; d--) {
    const g = days[d];
    if (g?.done && g.won && !g.cold) streak++;
    else if (d === today && !g?.done) continue; // today isn't finished yet
    else break;
  }
  return streak;
}
function stats() {
  const days = Object.entries(store.days).map(([d, g]) => ({ d: Number(d), ...g })).filter((g) => g.done && !g.cold);
  const won = days.filter((g) => g.won);
  const streak = streakOf(store.days);
  const dist = [1, 2, 3, 4, 5, 6].map((n) => won.filter((g) => g.guesses.length === n).length);
  return { played: days.length, won: won.length, streak, dist };
}

const byId = new Map(all.map((e) => [e.id, e]));
const wrong = () => game.guesses.filter((id) => id !== answer.id).length;

// Warmer or colder: where the answer is, compared with a wrong guess.
const sameSeason = (id) => byId.get(id)?.season === answer.season;
function feedback(id) {
  const g = byId.get(id);
  if (!g) return '';
  if (g.season !== answer.season) return answer.season > g.season ? 'Later season ⬆️' : 'Earlier season ⬇️';
  return `Right season! ${answer.number > g.number ? 'Later episode ⬆️' : 'Earlier episode ⬇️'}`;
}
const square = (id) => (id === answer.id ? '🟩' : !id ? '⬛' : sameSeason(id) ? '🟨' : '🟥');

// How the people you follow did on this puzzle. Squares only, never which episodes they guessed,
// and nothing at all until your own game is over.
let friendsData = null;
async function loadFriends() {
  const ids = [...await followingIds(user.id)];
  if (!ids.length) return { following: 0, list: [] };
  const [{ data: plays, error }, { data: history }] = await Promise.all([
    supabase.from('mystery_plays').select('user_id, guesses, done, won, cold, profiles(username, display_name, avatar_color, avatar_icon)')
      .eq('day', day).in('user_id', ids),
    supabase.from('mystery_plays').select('user_id, day, done, won, cold').in('user_id', ids).order('day', { ascending: false }).limit(1000),
  ]);
  if (error) throw error;
  const list = (plays || []).map((p) => ({
    ...p, streak: streakOf(Object.fromEntries((history || []).filter((h) => h.user_id === p.user_id).map((h) => [h.day, h]))),
  })).sort((a, b) => Number(b.done) - Number(a.done) || Number(b.won) - Number(a.won) || a.guesses.length - b.guesses.length);
  return { following: ids.length, list };
}
async function showFriends() {
  friendsData ||= loadFriends();
  const { following, list } = await friendsData;
  const box = $('#m-friends');
  if (!box) return;
  box.innerHTML = `<h2 class="cut">Your friends on this case</h2>${list.length ? `<ol>${list.map((f) => {
    const p = f.profiles || {};
    return `<li><a href="profile.html?u=${encodeURIComponent(p.username || '')}">${avatarHTML(p, 30)}<strong>${esc(p.display_name || p.username || '?')}</strong></a>
      ${f.done ? `<span class="mf-squares">${(f.guesses || []).map(square).join('')}</span><b>${f.won ? f.guesses.length : 'X'}/${MAX}</b>` : '<span class="mf-wait">still on the case</span>'}
      <span class="mf-tag">${f.cold ? 'cold case' : f.streak > 1 ? `🔥 ${f.streak}` : ''}</span></li>`;
  }).join('')}</ol>` : `<p class="result-count">${following ? 'Nobody you follow has played this one yet. Send them your result!' : 'Follow some people to compare results.'}</p>`}`;
}

// This week's leaderboard among friends. Fetched once; your own games are always current.
let leagueData = null;
async function showLeague() {
  leagueData ||= loadLeague(user.id, today);
  const data = await leagueData;
  const box = $('#m-league');
  if (box) box.innerHTML = leagueHTML(data, { userId: user.id, today, mine: store.days });
}

// Time left until the next puzzle (midnight UTC).
let ticking = null;
function countdown() {
  clearInterval(ticking);
  const tick = () => {
    const el = $('#m-next');
    if (!el) return clearInterval(ticking);
    const left = Math.max(0, (today + 1) * DAY - Date.now());
    const two = (n) => String(Math.floor(n)).padStart(2, '0');
    el.innerHTML = left ? `Next case opens in <b>${two(left / 3600000)}:${two((left / 60000) % 60)}:${two((left / 1000) % 60)}</b>`
      : '<a href="mystery.html">A new case is open! →</a>';
  };
  ticking = setInterval(tick, 1000);
  tick();
}

function coldCasesHTML() {
  const cases = Array.from({ length: Math.max(0, todayNumber - 1) }, (_, i) => todayNumber - 1 - i);
  return `<div class="mystery-stats mystery-cold paper">
    <h2 class="cut">Cold cases</h2>
    ${cases.length ? `<p class="result-count">These are the mystery episodes from earlier days. You can still play them, and they don't change your stats or streak.</p><div class="mc-grid">${cases.map((n) => {
      const g = store.days[launchDay + n - 1];
      const state = g?.done ? (g.won ? 'won' : 'lost') : g?.guesses?.length ? 'open' : 'new';
      const label = { won: `✓ ${g?.guesses.length}/${MAX}`, lost: `✗ X/${MAX}`, open: 'in progress', new: 'unsolved' }[state];
      return `<a class="mc-case ${state}${cold && n === number ? ' now' : ''}" href="mystery.html?case=${n}"><b>#${n}</b><span>${label}</span></a>`;
    }).join('')}</div>` : '<p class="result-count">Cold cases are the mystery episodes from earlier days. None yet: today\'s becomes the first one tomorrow.</p>'}
  </div>`;
}

function render() {
  const blur = game.done ? 0 : BLUR[Math.min(wrong(), BLUR.length - 2)];
  const hintsShown = game.done ? HINTS.length : Math.min(wrong(), HINTS.length);
  const s = stats();
  const squares = game.guesses.map(square).join('');
  const left = MAX - game.guesses.length;
  root.innerHTML = `
    <section class="case-head">
      <span class="case-tab cut">${cold ? 'Cold case' : 'Case file'} #${number}</span>
      <span class="case-stamp cut" aria-hidden="true">Top secret</span>
      <div class="case-head-row">
        <span class="mystery-logo">${mysterySVG()}</span>
        <div>
          <h1 class="cut">Kenny's Mystery Episode</h1>
          <p>Somebody stole an episode and Kenny saw everything. Every wrong guess sharpens the evidence photo, tells you whether to look earlier or later, and gets you a clue from your witness. He's a little hard to understand. ${MAX} tries. New case every day.</p>
        </div>
        <p class="mystery-next" id="m-next"></p>
      </div>
    </section>
    ${cold ? '<p class="mystery-coldnote">🧊 You\'re reopening a past case. It won\'t change your stats or streak. <a href="mystery.html">Back to today\'s case →</a></p>' : ''}
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
            ${clueHTML(HINTS[hintsShown - 1])}
            ${hintsShown > 1 ? `<a href="#m-clues" class="mystery-all-clues">See all ${hintsShown} clues ↓</a>` : ''}
          </div>` : ''}
        ${game.done ? '' : `<div class="kenny-lives" aria-label="${left} ${left === 1 ? 'try' : 'tries'} left">${Array.from({ length: MAX }, (_, i) => `<span class="${i < left ? '' : 'used'}" aria-hidden="true">🧥</span>`).join('')}<b>${left} ${left === 1 ? 'life' : 'lives'} left</b></div>`}
        ${game.done ? `
          <div class="mystery-result ${game.won ? 'won' : 'lost'} paper">
            <strong class="cut">${game.won ? `Mmph! You got it in ${game.guesses.length}!` : `Kenny didn't make it ${cold ? 'this time' : 'today'}.`}</strong>
            <p>${game.won ? '(Kenny says: nice job, dude.)' : cold ? 'He\'s used to it.' : 'He\'ll be back tomorrow. He always is.'} It was <a href="episode.html?id=${answer.id}">${esc(answer.title)}</a> · ${esc(epCode(answer))}.</p>
            <div class="mystery-squares" aria-label="Your guesses">${squares}</div>
            <div class="toolbar">
              <button type="button" class="btn btn-green share-bar" id="m-share">📤 Share my result</button>
              <button type="button" class="btn btn-ghost" id="m-log">Log ${esc(answer.title)}</button>
            </div>
          </div>
          <div class="mystery-friends mystery-stats paper" id="m-friends"><p class="result-count">Checking on your friends…</p></div>` : `
          <form class="mystery-guess" id="m-form" autocomplete="off">
            <label class="visually-hidden" for="m-q">Your guess</label>
            <input type="search" id="m-q" placeholder="Type an episode name…">
            <ul class="pick-results" id="m-results"></ul>
            <div class="toolbar"><button type="button" class="btn btn-ghost" id="m-skip">Skip (show me more)</button></div>
          </form>
          <p class="result-count">Finish the case to see how your friends did.</p>`}
        ${game.guesses.length || !game.done ? `<ol class="mystery-guesses">${game.guesses.map((id) => `<li class="${id === answer.id ? 'right' : 'wrong'}">${id === answer.id ? '✓' : '✗'} ${id ? esc(byId.get(id)?.title || '?') : '<em>skipped</em>'}${byId.get(id)?.season ? `<span class="mystery-season cut" title="Season ${byId.get(id).season}">S${byId.get(id).season}</span>` : ''}${id && id !== answer.id ? `<span class="mystery-warmth${sameSeason(id) ? ' warm' : ''}">${feedback(id)}</span>` : ''}</li>`).join('')}${game.done ? '' : Array.from({ length: left }, (_, i) => `<li class="empty-slot">${i ? '' : 'Your next guess'}</li>`).join('')}</ol>` : ''}
      </div>
      <aside class="mystery-side">
        <div class="case-folder" id="m-clues">
          <h2 class="cut">Witness statements</h2>
          ${HINTS.map((h, i) => (i < hintsShown ? `
            <div class="kenny-hint${!game.done && i === hintsShown - 1 ? ' newest' : ''}"><span class="exhibit cut">Exhibit ${EXHIBITS[i]}</span>${clueHTML(h)}</div>`
            : `<div class="kenny-hint locked"><span class="exhibit cut">Exhibit ${EXHIBITS[i]}</span><span class="kenny-means">🔒 Unlocks after ${i + 1} wrong guess${i ? 'es' : ''}</span></div>`)).join('')}
        </div>
        <div class="mystery-stats mystery-league paper" id="m-league"><p class="result-count">Counting this week's points…</p></div>
      </aside>
    </div>
    <div class="mystery-records">
        <div class="mystery-stats paper">
          <h2 class="cut">Your stats</h2>
          <div class="mystery-nums"><div><b>${s.played}</b><span>Played</span></div><div><b>${s.played ? Math.round((s.won / s.played) * 100) : 0}%</b><span>Won</span></div><div><b>${s.streak}</b><span>Streak</span></div></div>
          <h3>Guesses it took to win</h3>
          <ol class="mystery-dist">${s.dist.map((n, i) => `<li><span>${i + 1}</span><div class="md-track"><div style="width:${(n / Math.max(1, ...s.dist)) * 100}%"></div></div><b>${n}</b></li>`).join('')}</ol>
        </div>
        ${coldCasesHTML()}
    </div>`;
  root.removeAttribute('aria-busy');
  wire();
  countdown();
  showLeague().catch(() => { const box = $('#m-league'); if (box) box.innerHTML = "<p class='result-count'>Couldn't load the leaderboard.</p>"; });
  if (game.done) {
    showFriends().catch(() => { const box = $('#m-friends'); if (box) box.innerHTML = '<p class="result-count">Couldn\'t load your friends\' results.</p>'; });
  }
}

function guess(id) {
  if (game.done) return;
  if (id && game.guesses.includes(id)) return toast("You already guessed that one. Mmph.");
  game.guesses.push(id);
  if (id === answer.id) { game.done = true; game.won = true; sfx('jingle'); }
  else if (game.guesses.length >= MAX) { game.done = true; game.won = false; }
  save();
  render();
  if (!game.done && id) toast(`${feedback(id)}${wrong() <= HINTS.length ? ' · New clue unlocked!' : ''}`);
  // On phones the clue box sits under the photo: bring it into view.
  if (!game.done && PHONE.matches) $('.mystery-new-clue')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// The share bar opens the device's share menu. Browsers without one copy the result instead.

// The message you send to friends: what the game is, how you did, and what the colours mean.
function shareText() {
  const tries = game.guesses.length;
  const squares = game.guesses.map(square).join('') + '⬜'.repeat(MAX - tries);
  const legend = [['🟥', 'wrong season'], ['🟨', 'right season'], ['⬛', 'skipped'], ['🟩', 'got it'], ['⬜', 'not needed']]
    .filter(([colour]) => squares.includes(colour)).map(([colour, means]) => `${colour} ${means}`).join(' · ');
  const result = !game.won ? `I couldn't name the South Park episode in ${MAX} tries 💀`
    : tries === 1 ? 'I named the South Park episode on my FIRST try! 🏆'
      : `I named the South Park episode on try ${tries} of ${MAX}!`;
  const { streak } = stats();
  return [
    `🔍 Kenny's Mystery Episode #${number}${cold ? ' (past case)' : ''}`,
    result,
    '',
    squares,
    legend,
    ...(!cold && streak > 1 ? [`🔥 ${streak} days in a row`] : []),
    '',
    game.won ? 'Can you do better? Play here:' : 'Think you can get it? Play here:',
    `https://${SITE_LINK}/mystery.html${cold ? `?case=${number}` : ''}`,
  ].join('\n');
}

function wire() {
  $('#m-share')?.addEventListener('click', async () => {
    const text = shareText();
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
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
