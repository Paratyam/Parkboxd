// cage.html?u=name: Cage Match. On your own page: the game (pick the better of two episodes
// you've watched) plus your ranking. On someone else's: just their ranking.
import { initPage } from '../layout.js';
import { supabase } from '../supabase.js';
import { SITE_NAME } from '../config.js';
import { $, esc, params, epCode, profileTabsHTML, toast } from '../ui.js';
import { loadAllEpisodes, thumbHTML, myLogMap } from '../episodes.js';
import { scoreVotes, ranking, champion, loadVotes, loadRatings, nextPair, CARTMAN, UNDEFEATED_MIN } from '../cage.js';

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

async function start() {
  const isMe = person.id === me.id;
  const name = person.display_name || person.username;
  document.title = `${isMe ? 'Cage Match' : `${name}'s Cage Match`} · ${SITE_NAME}`;

  const [all, votes, ratings, mine] = await Promise.all([
    loadAllEpisodes(), loadVotes(person.id), loadRatings(person.id), isMe ? myLogMap(me.id) : Promise.resolve(new Map()),
  ]);
  const byId = new Map(all.map((e) => [e.id, e]));
  const pool = [...mine.keys()].filter((id) => byId.has(id));
  let scores = scoreVotes(votes, ratings);
  let pair = null;
  const recent = [];
  let comment = isMe ? 'Pick the better one. No pressure. Actually, lots of pressure.' : '';

  root.innerHTML = `
    <div>
      <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">${isMe ? 'Cage Match' : `${esc(name)}'s Cage Match`}</h1>
      ${profileTabsHTML(person.username, 'cage')}
    </div>
    ${isMe ? `<section class="cage-game" aria-label="Pick the better episode">
      <p class="result-count" style="margin:0">Two episodes you've watched enter. One leaves. Every pick builds your personal ranking. Keys: ← → to pick, ↓ to skip.</p>
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
    $('#ranking').innerHTML = list.length ? list.map((x, i) => {
      const e = byId.get(x.id);
      return `<li>
        <span class="pos">${i + 1}</span>
        <a href="episode.html?id=${e.id}" class="thumb" aria-hidden="true" tabindex="-1">${thumbHTML(e, { showTitle: false })}</a>
        <div class="info"><a href="episode.html?id=${e.id}">${i === 0 ? '👑 ' : ''}${esc(e.title)}</a><span>${esc(epCode(e))}${x.losses === 0 && x.wins >= UNDEFEATED_MIN ? ' · 🔥 unbeaten' : ''}</span></div>
        <div class="score"><b style="font-size:16px">${x.wins}–${x.losses}</b><span>${Math.round(x.score)}</span></div>
      </li>`;
    }).join('') : `<p class="empty">${isMe ? 'No matches yet. Pick a winner above to start your ranking.' : `${esc(name)} hasn't stepped into the cage yet.`}</p>`;
  }

  function renderPair() {
    if (!isMe) return;
    const arena = $('#arena');
    if (pool.length < 2) {
      arena.innerHTML = '<p class="empty">You need at least 2 watched episodes to fight. Go log some, then come back.</p>';
      return;
    }
    pair = nextPair(pool, scores, ratings, recent);
    const card = (id, side) => {
      const e = byId.get(id);
      const s = scores.get(id);
      return `<button type="button" class="cage-card" data-pick="${side}" aria-label="${esc(e.title)} wins">
        ${thumbHTML(e, { showTitle: false, size: 'w780' })}
        <strong>${esc(e.title)}</strong>
        <span>${esc(epCode(e))}${s ? ` · ${s.wins}–${s.losses}` : ' · first fight'}</span>
      </button>`;
    };
    arena.innerHTML = `${card(pair[0], 0)}<span class="cage-vs cut">VS</span>${card(pair[1], 1)}`;
    arena.querySelectorAll('[data-pick]').forEach((b) => { b.onclick = () => pick(Number(b.dataset.pick)); });
    $('#comment').textContent = comment;
  }

  let busy = false;
  async function pick(side) {
    if (busy || !pair) return;
    busy = true;
    const [w, l] = side === 0 ? pair : [pair[1], pair[0]];
    const { data, error } = await supabase.from('cage_votes').insert({ winner_id: w, loser_id: l }).select('id').single();
    busy = false;
    if (error) return toast(error.message);
    votes.push({ id: data.id, winner_id: w, loser_id: l });
    recent.push(pair);
    if (recent.length > 12) recent.shift();
    scores = scoreVotes(votes, ratings);
    comment = CARTMAN[Math.floor(Math.random() * CARTMAN.length)]
      .replaceAll('{w}', byId.get(w).title).replaceAll('{l}', byId.get(l).title);
    renderPair();
    renderRanking();
  }

  if (isMe) {
    $('#skip').onclick = () => { comment = "Can't decide? Wow. Indecisive much?"; if (pair) recent.push(pair); renderPair(); };
    $('#undo').onclick = async () => {
      const last = votes[votes.length - 1];
      if (!last) return toast('Nothing to undo.');
      const { error } = await supabase.from('cage_votes').delete().eq('id', last.id);
      if (error) return toast(error.message);
      votes.pop();
      scores = scoreVotes(votes, ratings);
      comment = 'Undo? Chicken.';
      renderPair();
      renderRanking();
    };
    $('#reset').onclick = async () => {
      if (!confirm(`Delete all ${votes.length} of your Cage Match picks and start over? This can't be undone.`)) return;
      const { error } = await supabase.from('cage_votes').delete().eq('user_id', me.id);
      if (error) return toast(error.message);
      votes.length = 0;
      scores = scoreVotes(votes, ratings);
      comment = 'Fresh start. Try not to screw it up this time.';
      renderPair();
      renderRanking();
    };
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select, dialog')) return;
      if (e.code === 'ArrowLeft') { e.preventDefault(); pick(0); }
      if (e.code === 'ArrowRight') { e.preventDefault(); pick(1); }
      if (e.code === 'ArrowDown') { e.preventDefault(); $('#skip').click(); }
    });
  }

  renderPair();
  renderRanking();
}
