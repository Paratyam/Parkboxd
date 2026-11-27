// cage.html: Cartman's Cage Match, the game (pick the better of two episodes you've watched) plus your ranking.
// cage.html?u=name&view=ranking: a profile's Rankings tab, just the ranking list.

import { initPage } from '../layout.js?v=20261127110826';
import { supabase } from '../supabase.js?v=20261127110826';
import { SITE_NAME } from '../config.js?v=20261127110826';
import { $, esc, params, epCode, profileTabsHTML, toast, stars } from '../ui.js?v=20261127110826';
import { loadAllEpisodes, thumbHTML, myLogMap } from '../episodes.js?v=20261127110826';
import { scoreVotes, ranking, champion, loadVotes, loadRatings, nextPair, UNDEFEATED_MIN, SETTLED_FIGHTS } from '../cage.js?v=20261127110826';
import {
  introLine, resultLine, crowd, hostPick,
  HOST_SKIP, HOST_UNDO, HOST_WELCOME, HOST_FINALS, HOST_NEW_ARENA, HOST_RESET,
} from '../cage-host.js?v=20261127110826';
import { burgerRain } from '../fx.js?v=20261127110826';
import { beltSVG } from '../art.js?v=20261127110826';

const { profile: me } = await initPage({ title: 'Cage Match', auth: 'required' });
const root = $('#cage');

const wanted = (params.get('u') || me.username).toLowerCase();
const { data: person } = await supabase.from('profiles').select('id, username, display_name').eq('username', wanted).maybeSingle();

// (Constants live above the start() call: it runs at load, before anything declared below it.)
const RANK_SHOWN = 50;
const FILTER_KEY = 'parkboxd-cage-filter';
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!person) {
  root.innerHTML = '<div class="big-message"><h1 class="cut">Nobody by that name</h1><a class="btn btn-green" href="cage.html">Your Cage Match</a></div>';
  root.removeAttribute('aria-busy');
} else {
  await start();
}

async function start() {
  const isMe = person.id === me.id;
  const name = person.display_name || person.username;
  // The game is the nav's Cage Match page; profiles get a Rankings tab (?view=ranking) with just the list.
  const showGame = isMe && params.get('view') !== 'ranking';
  document.title = `${showGame ? "Cartman's Cage Match" : isMe ? 'Your rankings' : `${name}'s rankings`} · ${SITE_NAME}`;

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
  const streaks = new Map(); // wins in a row this visit
  // What Cartman says: `call` is his reaction, `next` hypes the fight on screen.
  let call = hostPick(HOST_WELCOME);

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
    ${showGame ? '' : `<div>
      <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">${isMe ? 'Your rankings' : `${esc(name)}'s rankings`}</h1>
      ${profileTabsHTML(person.username, 'cage')}
      <p class="result-count" style="margin:12px 0 0">Every episode ranked head to head in <a href="cage.html">Cartman's Cage Match</a>.</p>
    </div>`}
    ${showGame ? `<section class="cage-ring" id="cage-game" aria-label="Cartman's Cage Match: pick the better episode">
      <div class="cage-banner">
        <span class="cage-title cut">Cartman's Cage Match</span>
        <span class="cage-round cut" id="round"></span>
      </div>
      <div class="cage-host">
        <div class="cage-mic" aria-hidden="true">🎤</div>
        <div class="cage-bubble" id="host" aria-live="polite">
          <span class="who">Eric Cartman · Your host</span>
          <p class="call" id="call"></p>
          <p class="next" id="next"></p>
        </div>
      </div>
      <div class="cage-arena" id="arena"></div>
      <div class="cage-crowd" id="crowd" aria-hidden="true"></div>
      <div class="toolbar" style="justify-content:center">
        <button type="button" class="btn btn-ghost" id="skip">Skip (can't decide)</button>
        <button type="button" class="btn btn-ghost" id="undo">Undo last pick</button>
      </div>
      <div class="cage-controls">
        <label class="cage-filter"><span>Fight within</span>
          <select id="cage-filter">${FILTERS.map(([k, label]) => `<option value="${k}"${k === filter ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>
        </label>
        <span class="cage-keys">Keys: ← → pick · ↓ skip · Backspace undo</span>
      </div>
      <div class="cage-meter" id="meter"></div>
    </section>` : ''}
    <section>
      <div class="section-head"><h2 id="rank-title"></h2></div>
      <div id="champ"></div>
      <ol class="rank-table" id="ranking"></ol>
      <div id="rank-more"></div>
      ${showGame ? '<p style="margin:14px 0 0"><button type="button" class="link-button" id="reset" style="color:var(--muted)">Reset my Cage Match</button></p>' : ''}
    </section>`;
  root.removeAttribute('aria-busy');

  function renderRanking() {
    const list = ranking(scores).filter((x) => byId.has(x.id));
    $('#rank-title').textContent = list.length ? `${isMe ? 'Your' : `${name}'s`} ranking · ${list.length} episode${list.length === 1 ? '' : 's'} · ${votes.length} match${votes.length === 1 ? '' : 'es'}` : 'Ranking';
    const c = champion(scores);
    const champEp = c && byId.get(c.top.id);
    $('#champ').innerHTML = champEp ? `
      <a class="cage-champ paper" href="episode.html?id=${champEp.id}"><span class="cage-champ-belt">${beltSVG()}</span>
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
    }).join('') : `<p class="empty">${showGame ? 'No matches yet. Pick a winner above to start your ranking.' : isMe ? "No rankings yet. Step into <a href=\"cage.html\">Cartman's Cage Match</a> and start picking winners." : `${esc(name)} hasn't stepped into the cage yet.`}</p>`;
    $('#rank-more').innerHTML = list.length > RANK_SHOWN
      ? `<p style="margin:10px 0 0"><button type="button" class="link-button" id="rank-toggle">${showAll ? 'Show top 50 only' : `Show all ${list.length}`}</button></p>` : '';
    $('#rank-toggle')?.addEventListener('click', () => { showAll = !showAll; renderRanking(); });
  }

  // How settled the ranking is: share of the current pool with enough fights.
  function renderMeter(pool) {
    if (!showGame) return;
    const settled = pool.filter((id) => fights(id) >= SETTLED_FIGHTS).length;
    const pct = pool.length ? Math.round((settled / pool.length) * 100) : 0;
    const label = pct >= 100 ? 'Locked in. This is your true ranking.' : pct >= 75 ? 'Almost settled.' : pct >= 40 ? 'Taking shape.' : pct > 0 ? 'Just getting started.' : 'No fights yet.';
    $('#meter').innerHTML = `
      <div class="cage-meter-row"><span>Ranking settled: <b>${pct}%</b> · ${label}</span><span>${sessionPicks ? `${sessionPicks} pick${sessionPicks === 1 ? '' : 's'} this visit` : ''}</span></div>
      <div class="bar" role="img" aria-label="${pct}% settled"><div style="width:${pct}%;background:var(--orange)"></div></div>`;
  }

  const fights = (id) => (scores.get(id)?.wins || 0) + (scores.get(id)?.losses || 0);
  const titleOf = (id) => byId.get(id)?.title || 'that one';

  // Cartman's bubble pops every time he speaks.
  function host(main, next = '') {
    $('#call').textContent = main;
    $('#next').textContent = next;
    const b = $('#host');
    b.classList.remove('pop');
    void b.offsetWidth; // restart the animation
    b.classList.add('pop');
  }

  function crowdBurst(text) {
    const el = $('#crowd');
    el.textContent = `📣 ${text}`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function renderPair(forced = null) {
    if (!showGame) return;
    const arena = $('#arena');
    const pool = poolFor(filter);
    renderMeter(pool);
    $('#round').textContent = `Round ${votes.length + 1}`;
    if (pool.length < 2) {
      pair = null;
      arena.innerHTML = `<p class="empty">${watched.length < 2
        ? 'You need at least 2 watched episodes to fight. Go log some, then come back.'
        : filter === 'finals' ? 'Finals need a ranking first. Play a few rounds with "Everything I\'ve watched".' : 'Not enough episodes here to fight. Pick something else to fight within.'}</p>`;
      host(watched.length < 2 ? "No fighters?! What kind of show is this? Go log some episodes!" : 'This arena is empty! Pick somewhere else to fight, genius.');
      return;
    }
    pair = forced || nextPair(pool, scores, ratings, recent);
    const list = ranking(scores);
    const champId = champion(scores)?.top.id;
    const card = (id, side) => {
      const e = byId.get(id);
      const pos = list.findIndex((x) => x.id === id);
      return `<button type="button" class="cage-card ${side ? 'blue' : 'red'}${id === champId ? ' champ' : ''}" data-pick="${side}" aria-label="${esc(e.title)} wins">
        <span class="corner cut">${id === champId ? '👑 Champion' : side ? 'Blue corner' : 'Red corner'}</span>
        ${thumbHTML(e, { showTitle: false, size: 'w780' })}
        <strong>${esc(e.title)}</strong>
        <span>${esc(epCode(e))}${pos >= 0 ? ` · #${pos + 1}` : ' · first fight'}</span>
        <span class="cage-rating">${ratings.has(id) ? `<b>${stars(ratings.get(id))}</b> your rating` : 'Not rated'}</span>
      </button>`;
    };
    arena.innerHTML = `${card(pair[0], 0)}<span class="cage-vs cut" aria-hidden="true">VS</span>${card(pair[1], 1)}`;
    arena.querySelectorAll('[data-pick]').forEach((b) => { b.onclick = () => pick(Number(b.dataset.pick)); });
    const next = introLine({
      a: titleOf(pair[0]), b: titleOf(pair[1]), ra: ratings.get(pair[0]), rb: ratings.get(pair[1]),
      ids: pair, champId, fights: new Map(pair.map((id) => [id, fights(id)])),
    });
    host(call, next);
  }

  async function pick(side) {
    if (busy || !pair) return;
    busy = true;
    const [w, l] = side === 0 ? pair : [pair[1], pair[0]];
    const before = champion(scores)?.top.id;
    const gap = (scores.get(l)?.score ?? 1000) - (scores.get(w)?.score ?? 1000);
    const debut = fights(w) === 0;
    // The knockout: winner glows, loser goes down, while the pick saves.
    const cards = [...$('#arena').querySelectorAll('.cage-card')];
    cards[side]?.classList.add('win');
    cards[1 - side]?.classList.add('ko');
    $('#arena').classList.add('fought');
    const [{ data, error }] = await Promise.all([
      supabase.from('cage_votes').insert({ winner_id: w, loser_id: l }).select('id').single(),
      sleep(reducedMotion() ? 0 : 650),
    ]);
    busy = false;
    $('#arena').classList.remove('fought');
    if (error) {
      cards.forEach((c) => c.classList.remove('win', 'ko'));
      return toast(error.message);
    }
    votes.push({ id: data.id, winner_id: w, loser_id: l });
    recent.push(pair);
    if (recent.length > 12) recent.shift();
    sessionPicks++;
    streaks.set(w, (streaks.get(w) || 0) + 1);
    streaks.set(l, 0);
    scores = scoreVotes(votes, ratings);
    const after = champion(scores)?.top.id;
    const rw = ratings.get(w);
    const rl = ratings.get(l);
    let kind = 'win';
    if (before && after !== before) kind = 'newChamp';
    else if (before && w === before && votes.length > 1) kind = 'defends';
    else if (gap >= 120) kind = 'upset';
    else if (streaks.get(w) >= 3) kind = 'streak';
    else if (rw != null && rl != null && rw - rl >= 2) kind = 'stomp';
    else if (rw != null && rl != null && Math.abs(rw - rl) <= 0.5 && Math.random() < 0.35) kind = 'close'; // pairs are usually close, so only call it sometimes
    else if (debut) kind = 'debut';
    call = resultLine({ w: titleOf(w), l: titleOf(l), kind, n: streaks.get(w), o: titleOf(before) });
    if (kind === 'newChamp') burgerRain(24);
    if (['newChamp', 'upset', 'streak', 'stomp'].includes(kind) || Math.random() < 0.25) crowdBurst(crowd());
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
    streaks.set(last.winner_id, Math.max(0, (streaks.get(last.winner_id) || 1) - 1));
    recent = recent.filter((p) => !(p.includes(last.winner_id) && p.includes(last.loser_id)));
    scores = scoreVotes(votes, ratings);
    call = hostPick(HOST_UNDO);
    // Bring the same fight back so it can be re-picked (if both are still in this pool).
    const pool = poolFor(filter);
    const again = pool.includes(last.winner_id) && pool.includes(last.loser_id) ? [last.winner_id, last.loser_id] : null;
    renderPair(again);
    renderRanking();
  }

  if (showGame) {
    $('#cage-filter').onchange = (e) => {
      filter = e.target.value;
      localStorage.setItem(FILTER_KEY, filter);
      recent = [];
      call = hostPick(filter === 'finals' ? HOST_FINALS : HOST_NEW_ARENA);
      renderPair();
    };
    $('#skip').onclick = () => {
      if (busy) return;
      call = hostPick(HOST_SKIP);
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
      streaks.clear();
      startPos.clear();
      scores = scoreVotes(votes, ratings);
      call = hostPick(HOST_RESET);
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
