// cage.html?u=name: Cage Match. On your own page: the game (pick the better of two episodes
// you've watched) plus your ranking. On someone else's: just their ranking.
import { initPage } from '../layout.js';
import { supabase } from '../supabase.js';
import { SITE_NAME } from '../config.js';
import { $, esc, params, epCode, profileTabsHTML, toast } from '../ui.js';
import { loadAllEpisodes, thumbHTML, myLogMap } from '../episodes.js';
import { scoreVotes, ranking, champion, loadVotes, loadRatings, nextPair, CARTMAN, UNDEFEATED_MIN, SETTLED_FIGHTS } from '../cage.js';
import { burgerRain } from '../fx.js';

const { profile: me } = await initPage({ title: 'Cage Match', auth: 'required' });
const root = $('#cage');

const wanted = (params.get('u') || me.username).toLowerCase();
const { data: person } = await supabase.from('profiles').select('id, username, display_name').eq('username', wanted).maybeSingle();

if (!person) {
  root.innerHTML = '<div class="big-message"><h1 class="cut">Nobody by that name</h1><a class="btn btn-green" href="cage.html">Your Cage Match</a></div>';
  root.removeAttribute('aria-busy');
} else {
  await start();
}

const SKIP_LINES = [
  "Can't decide? Wow. Indecisive much?",
  'Skipping? Fine. Coward.',
  "Ugh, you're worse than Kyle at making decisions.",
  "Whatever. Next. I don't have all day.",
];
const RANK_SHOWN = 50;
const FILTER_KEY = 'parkboxd-cage-filter';

async function start() {
  const isMe = person.id === me.id;
  const name = person.display_name || person.username;
  document.title = `${isMe ? 'Cage Match' : `${name}'s Cage Match`} · ${SITE_NAME}`;

  const [all, votes, ratings, mine] = await Promise.all([
    loadAllEpisodes(), loadVotes(person.id), loadRatings(person.id), isMe ? myLogMap(me.id) : Promise.resolve(new Map()),
  ]);
  const byId = new Map(all.map((e) => [e.id, e]));
  const watched = [...mine.keys()].filter((id) => byId.has(id));
  let scores = scoreVotes(votes, ratings);
  // Ranking at the start of this visit, for the ▲▼ movement arrows.
  const startPos = new Map(ranking(scores).map((x, i) => [x.id, i]));
  let pair = null;
  let recent = [];
  let busy = false;
  let sessionPicks = 0;
  let showAll = false;
  let comment = isMe ? 'Pick the better one. No pressure. Actually, lots of pressure.' : '';

  // ---- Which episodes fight: everything you've watched, one season, the extras, your 4★+, or the finals ----
  const seasons = [...new Set(watched.map((id) => byId.get(id)).filter((e) => e.kind === 'episode').map((e) => e.season))].sort((a, b) => a - b);
  const FILTERS = [
    ['all', 'Everything I\'ve watched'],
    ['finals', '🏆 Finals: my current top 10'],
    ['loved', 'Only my 4★ and up'],
    ...seasons.map((s) => [`s${s}`, `Season ${s}`]),
    ['extras', 'Specials & movies'],
  ];
  let filter = localStorage.getItem(FILTER_KEY);
  if (!FILTERS.some(([k]) => k === filter)) filter = 'all';
  const poolFor = (f) => {
    if (f === 'finals') return ranking(scores).map((x) => x.id).filter((id) => watched.includes(id)).slice(0, 10);
    if (f === 'loved') return watched.filter((id) => (ratings.get(id) ?? 0) >= 4);
    if (f === 'extras') return watched.filter((id) => byId.get(id).kind !== 'episode');
    if (f.startsWith('s')) return watched.filter((id) => byId.get(id).kind === 'episode' && byId.get(id).season === Number(f.slice(1)));
    return watched;
  };

  root.innerHTML = `
    <div>
      <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">${isMe ? 'Cage Match' : `${esc(name)}'s Cage Match`}</h1>
      ${profileTabsHTML(person.username, 'cage')}
    </div>
    ${isMe ? `<section class="cage-game" id="cage-game" aria-label="Pick the better episode">
      <div class="cage-top">
        <p class="result-count" style="margin:0">Two episodes enter. One leaves. Every pick builds your personal ranking. Keys: ← → pick, ↓ skip, Backspace undo.</p>
        <label class="cage-filter"><span>Fight within</span>
          <select id="cage-filter">${FILTERS.map(([k, label]) => `<option value="${k}"${k === filter ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>
        </label>
      </div>
      <div class="cage-meter" id="meter"></div>
      <div class="cage-arena" id="arena"></div>
      <p class="cage-comment" id="comment" aria-live="polite"></p>
      <div class="toolbar" style="justify-content:center">
        <button type="button" class="btn btn-ghost" id="skip">Skip (can't decide)</button>
        <button type="button" class="btn btn-ghost" id="undo">Undo last pick</button>
      </div>
    </section>` : ''}
    <section>
      <div class="section-head"><h2 id="rank-title"></h2></div>
      <div id="champ"></div>
      <ol class="rank-table" id="ranking"></ol>
      <div id="rank-more"></div>
      ${isMe ? '<p style="margin:14px 0 0"><button type="button" class="link-button" id="reset" style="color:var(--muted)">Reset my Cage Match</button></p>' : ''}
    </section>`;
  root.removeAttribute('aria-busy');

  function renderRanking() {
    const list = ranking(scores).filter((x) => byId.has(x.id));
    $('#rank-title').textContent = list.length ? `${isMe ? 'Your' : `${name}'s`} ranking · ${list.length} episodes · ${votes.length} matches` : 'Ranking';
    const c = champion(scores);
    const champEp = c && byId.get(c.top.id);
    $('#champ').innerHTML = champEp ? `
      <a class="cage-champ paper" href="episode.html?id=${champEp.id}">
        ${thumbHTML(champEp, { showTitle: false, size: 'w780' })}
        <div><span class="cut">${c.undefeated ? '🏆 Undefeated champion' : '👑 Champion'}</span>
          <strong>${esc(champEp.title)}</strong>
          <span>${esc(epCode(champEp))} · ${c.top.wins}–${c.top.losses}${c.undefeated ? ' · never lost a match' : ''}</span></div>
      </a>` : '';
    const shown = showAll ? list : list.slice(0, RANK_SHOWN);
    $('#ranking').innerHTML = list.length ? shown.map((x, i) => {
      const e = byId.get(x.id);
      const was = startPos.get(x.id);
      const move = was == null ? '<span class="cage-move new" title="New this visit">new</span>'
        : was > i ? `<span class="cage-move up" title="Up ${was - i} this visit">▲${was - i}</span>`
          : was < i ? `<span class="cage-move down" title="Down ${i - was} this visit">▼${i - was}</span>` : '';
      return `<li>
        <span class="pos">${i + 1}</span>
        <a href="episode.html?id=${e.id}" class="thumb" aria-hidden="true" tabindex="-1">${thumbHTML(e, { showTitle: false })}</a>
        <div class="info"><a href="episode.html?id=${e.id}">${i === 0 ? '👑 ' : ''}${esc(e.title)}</a><span>${esc(epCode(e))}${x.losses === 0 && x.wins >= UNDEFEATED_MIN ? ' · 🔥 unbeaten' : ''} ${isMe && sessionPicks ? move : ''}</span></div>
        <div class="score"><b style="font-size:16px">${x.wins}–${x.losses}</b><span title="Cage score">${Math.round(x.score)}</span></div>
      </li>`;
    }).join('') : `<p class="empty">${isMe ? 'No matches yet. Pick a winner above to start your ranking.' : `${esc(name)} hasn't stepped into the cage yet.`}</p>`;
    $('#rank-more').innerHTML = list.length > RANK_SHOWN
      ? `<p style="margin:10px 0 0"><button type="button" class="link-button" id="rank-toggle">${showAll ? 'Show top 50 only' : `Show all ${list.length}`}</button></p>` : '';
    $('#rank-toggle')?.addEventListener('click', () => { showAll = !showAll; renderRanking(); });
  }

  // How settled the ranking is: share of the current pool with enough fights.
  function renderMeter(pool) {
    if (!isMe) return;
    const fights = (id) => (scores.get(id)?.wins || 0) + (scores.get(id)?.losses || 0);
    const settled = pool.filter((id) => fights(id) >= SETTLED_FIGHTS).length;
    const pct = pool.length ? Math.round((settled / pool.length) * 100) : 0;
    const label = pct >= 100 ? 'Locked in. This is your true ranking.' : pct >= 75 ? 'Almost settled.' : pct >= 40 ? 'Taking shape.' : pct > 0 ? 'Just getting started.' : 'No fights yet.';
    $('#meter').innerHTML = `
      <div class="cage-meter-row"><span>Ranking settled: <b>${pct}%</b> · ${label}</span><span>${sessionPicks ? `${sessionPicks} pick${sessionPicks === 1 ? '' : 's'} this visit` : ''}</span></div>
      <div class="bar" role="img" aria-label="${pct}% settled"><div style="width:${pct}%;background:var(--orange)"></div></div>`;
  }

  function renderPair(forced = null) {
    if (!isMe) return;
    const arena = $('#arena');
    const pool = poolFor(filter);
    renderMeter(pool);
    if (pool.length < 2) {
      pair = null;
      arena.innerHTML = `<p class="empty">${watched.length < 2
        ? 'You need at least 2 watched episodes to fight. Go log some, then come back.'
        : filter === 'finals' ? 'Finals need a ranking first. Play a few rounds with "Everything I\'ve watched".' : 'Not enough episodes here to fight. Pick something else to fight within.'}</p>`;
      $('#comment').textContent = '';
      return;
    }
    pair = forced || nextPair(pool, scores, ratings, recent);
    const card = (id, side) => {
      const e = byId.get(id);
      const s = scores.get(id);
      const pos = ranking(scores).findIndex((x) => x.id === id);
      return `<button type="button" class="cage-card" data-pick="${side}" aria-label="${esc(e.title)} wins">
        ${thumbHTML(e, { showTitle: false, size: 'w780' })}
        <strong>${esc(e.title)}</strong>
        <span>${esc(epCode(e))}${s ? ` · ${s.wins}–${s.losses} · #${pos + 1}` : ' · first fight'}</span>
      </button>`;
    };
    arena.innerHTML = `${card(pair[0], 0)}<span class="cage-vs cut">VS</span>${card(pair[1], 1)}`;
    arena.querySelectorAll('[data-pick]').forEach((b) => { b.onclick = () => pick(Number(b.dataset.pick)); });
    $('#comment').textContent = comment;
  }

  const titleOf = (id) => byId.get(id)?.title || 'that one';

  async function pick(side) {
    if (busy || !pair) return;
    busy = true;
    const [w, l] = side === 0 ? pair : [pair[1], pair[0]];
    const before = champion(scores)?.top.id;
    const gap = (scores.get(l)?.score ?? 1000) - (scores.get(w)?.score ?? 1000);
    const { data, error } = await supabase.from('cage_votes').insert({ winner_id: w, loser_id: l }).select('id').single();
    busy = false;
    if (error) return toast(error.message);
    votes.push({ id: data.id, winner_id: w, loser_id: l });
    recent.push(pair);
    if (recent.length > 12) recent.shift();
    sessionPicks++;
    scores = scoreVotes(votes, ratings);
    const after = champion(scores)?.top.id;
    if (before && after !== before) {
      comment = `👑 NEW CHAMPION: ${titleOf(after)}! ${titleOf(before)} has been dethroned. Ha!`;
      burgerRain(18);
    } else if (gap >= 120) {
      comment = `😱 UPSET! ${titleOf(w)} just beat ${titleOf(l)}. Nobody saw that coming.`;
    } else {
      comment = CARTMAN[Math.floor(Math.random() * CARTMAN.length)].replaceAll('{w}', titleOf(w)).replaceAll('{l}', titleOf(l));
    }
    renderPair();
    renderRanking();
  }

  async function undo() {
    if (busy) return;
    const last = votes[votes.length - 1];
    if (!last) return toast('Nothing to undo.');
    busy = true;
    const { error } = await supabase.from('cage_votes').delete().eq('id', last.id);
    busy = false;
    if (error) return toast(error.message);
    votes.pop();
    if (sessionPicks) sessionPicks--;
    recent = recent.filter((p) => !(p.includes(last.winner_id) && p.includes(last.loser_id)));
    scores = scoreVotes(votes, ratings);
    comment = 'Undo? Chicken. Fine, pick again.';
    // Bring the same fight back so it can be re-picked (if both are still in this pool).
    const pool = poolFor(filter);
    const again = pool.includes(last.winner_id) && pool.includes(last.loser_id) ? [last.winner_id, last.loser_id] : null;
    renderPair(again);
    renderRanking();
  }

  if (isMe) {
    $('#cage-filter').onchange = (e) => {
      filter = e.target.value;
      localStorage.setItem(FILTER_KEY, filter);
      recent = [];
      comment = filter === 'finals' ? 'The FINALS. Only the best survive. Like me.' : 'New arena. Same rules. I win.';
      renderPair();
    };
    $('#skip').onclick = () => {
      if (busy) return;
      comment = SKIP_LINES[Math.floor(Math.random() * SKIP_LINES.length)];
      if (pair) recent.push(pair);
      renderPair();
    };
    $('#undo').onclick = undo;
    $('#reset').onclick = async () => {
      if (busy) return;
      if (!confirm(`Delete all ${votes.length} of your Cage Match picks and start over? This can't be undone.`)) return;
      busy = true;
      const { error } = await supabase.from('cage_votes').delete().eq('user_id', me.id);
      busy = false;
      if (error) return toast(error.message);
      votes.length = 0;
      sessionPicks = 0;
      recent = [];
      startPos.clear();
      scores = scoreVotes(votes, ratings);
      comment = 'Fresh start. Try not to screw it up this time.';
      renderPair();
      renderRanking();
    };
    // Keys only while the arena is on screen, so arrows still scroll the ranking list.
    const arenaVisible = () => {
      const r = $('#arena').getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    };
    document.addEventListener('keydown', (e) => {
      if (e.target.closest?.('input, textarea, select, dialog, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (document.querySelector('dialog[open]') || !arenaVisible()) return;
      const act = { ArrowLeft: () => pick(0), ArrowRight: () => pick(1), ArrowDown: () => $('#skip').click(), Backspace: undo }[e.code];
      if (!act) return;
      e.preventDefault();
      if (!e.repeat) act();
    });
  }

  renderPair();
  renderRanking();
}
