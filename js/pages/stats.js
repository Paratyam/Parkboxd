// stats.html?u=name: totals, monthly activity, season progress and season rankings.
import { initPage } from '../layout.js?v=20261128091302';
import { supabase } from '../supabase.js?v=20261128091302';
import { SITE_NAME } from '../config.js?v=20261128091302';
import { $, esc, params, profileTabsHTML, fetchAll } from '../ui.js?v=20261128091302';
import { loadAllEpisodes, cardHTML } from '../episodes.js?v=20261128091302';
import { mountReportCard } from '../report-card.js?v=20261128091302';
import { loadStreaks, streakHTML } from '../streak.js?v=20261128091302';
import { hasBadge } from '../flair.js?v=20261128091302';

const { profile: me } = await initPage({ title: 'Stats', auth: 'required' });
const root = $('#stats');

const wanted = (params.get('u') || me.username).toLowerCase();
const { data: person } = await supabase.from('profiles').select('id, username, display_name').eq('username', wanted).maybeSingle();

if (!person) {
  root.innerHTML = `<div class="big-message"><h1 class="cut">Nobody by that name</h1><a class="btn btn-green" href="stats.html">Your stats</a></div>`;
  root.removeAttribute('aria-busy');
hasBadge(person.username, 'tegridy').then((yes) => yes && document.querySelector('#streak-box .streak-card')?.classList.add('stars'));
} else {
  await render();
  window.addEventListener('parkboxd:logged', render);
}

async function render() {
  const isMe = person.id === me.id;
  const name = person.display_name || person.username;
  document.title = `${isMe ? 'Your stats' : `${name}'s stats`} · ${SITE_NAME}`;

  const [all, { data: logs }, { data: seasonAvgs }, { data: s }, { data: latest }] = await Promise.all([
    loadAllEpisodes(),
    fetchAll(() => supabase.from('logs').select('episode_id, watched_on, rating, liked, review, is_rewatch, created_at').eq('user_id', person.id).order('id')),
    supabase.from('user_season_averages').select('season, avg_rating, rated_count').eq('user_id', person.id),
    supabase.from('user_stats').select('*').eq('user_id', person.id).maybeSingle(),
    supabase.from('latest_ratings').select('episode_id, rating').eq('user_id', person.id).limit(5000),
  ]);
  const byId = new Map(all.map((e) => [e.id, e]));
  const L = logs || [];
  const streak = (await loadStreaks([person.id])).get(person.id);
  const seen = new Set(L.map((l) => l.episode_id));

  // ---- Tiles ----
  const hours = Math.round((s?.minutes_watched ?? 0) / 60);
  const extras = [...seen].filter((id) => byId.get(id)?.kind !== 'episode').length;
  const tiles = [
    [s?.episodes_watched ?? seen.size, 'Watched'],
    [hours, hours === 1 ? 'Hour' : 'Hours'],
    [s?.logs_this_year ?? 0, `Logs in ${new Date().getFullYear()}`],
    [s?.avg_rating ? Number(s.avg_rating).toFixed(1) : '–', 'Avg rating'],
    [s?.review_count ?? 0, 'Reviews'],
    [s?.like_count ?? 0, 'Liked'],
    [L.filter((l) => l.is_rewatch).length, 'Rewatches'],
    [extras, 'Specials & movies'],
  ];

  // ---- Logs per month, last 12 months ----
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, d, n: 0 };
  });
  for (const l of L) {
    const m = months.find((x) => l.watched_on?.startsWith(x.key));
    if (m) m.n++;
  }
  const maxN = Math.max(1, ...months.map((m) => m.n));
  const undated = L.filter((l) => !l.watched_on).length;
  const monthLabel = (d, style) => d.toLocaleDateString(undefined, { month: style, year: style === 'long' ? 'numeric' : undefined });
  const monthChart = `
    <div class="month-chart" role="img" aria-label="Logs per month: ${months.map((m) => `${monthLabel(m.d, 'long')} ${m.n}`).join(', ')}">
      ${months.map((m) => `
        <div class="col">
          <div class="b" style="height:${(m.n / maxN) * 100}%"></div>
          <span class="tip">${esc(monthLabel(m.d, 'long'))}: ${m.n} ${m.n === 1 ? 'log' : 'logs'}</span>
        </div>`).join('')}
    </div>
    <div class="month-axis" aria-hidden="true">${months.map((m) => `<span>${esc(monthLabel(m.d, 'narrow'))}</span>`).join('')}</div>
    ${undated ? `<p class="hint" style="margin:8px 0 0;font-size:12px;color:var(--muted)">${undated} undated ${undated === 1 ? 'log isn\'t' : 'logs aren\'t'} shown.</p>` : ''}`;

  // ---- Season progress (every season, plus specials and movies) ----
  const groups = new Map();
  for (const e of all) {
    const key = e.kind === 'movie' ? 'movies' : e.kind === 'special' ? 'specials' : e.season;
    const g = groups.get(key) || { key, name: key === 'movies' ? 'Movies' : key === 'specials' ? 'Specials' : `Season ${key}`, total: 0, watched: 0 };
    g.total++;
    if (seen.has(e.id)) g.watched++;
    groups.set(key, g);
  }
  const progress = `<ul class="rank-list">${[...groups.values()].map((g) => `
    <li style="grid-template-columns:110px 1fr 64px">
      <a href="seasons.html?s=${g.key}">${esc(g.name)}</a>
      <div class="track" title="${g.watched} of ${g.total}"><div style="width:${(g.watched / g.total) * 100}%"></div></div>
      <span class="val">${g.watched}<span class="sub"> / ${g.total}</span></span>
    </li>`).join('')}</ul>`;

  // ---- Season rankings by average rating ----
  const ranked = (seasonAvgs || []).filter((r) => r.season > 0).sort((a, b) => b.avg_rating - a.avg_rating || b.rated_count - a.rated_count);
  const rankings = ranked.length
    ? `<ol class="rank-list">${ranked.map((r, i) => `
        <li>
          <span class="pos">${i + 1}</span>
          <a href="seasons.html?s=${r.season}">Season ${r.season}</a>
          <div class="track" title="Season ${r.season}: ${Number(r.avg_rating).toFixed(2)} average from ${r.rated_count} rated"><div style="width:${(r.avg_rating / 5) * 100}%"></div></div>
          <span class="val">${Number(r.avg_rating).toFixed(1)}</span>
        </li>`).join('')}</ol>
      <p style="margin:10px 0 0;font-size:12px;color:var(--muted)">Average of ${isMe ? 'your' : 'their'} ratings in each season. Bars run from 0 to 5★.</p>`
    : `<p class="empty">${isMe ? 'Rate some episodes to rank the seasons. Then you can finally settle the argument.' : 'No ratings yet.'}</p>`;

  // ---- Most rewatched ----
  const counts = new Map();
  for (const l of L) counts.set(l.episode_id, (counts.get(l.episode_id) || 0) + 1);
  const rewatched = [...counts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 6);

  root.innerHTML = `
    <div>
      <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">${isMe ? 'Your stats' : `${esc(name)}'s stats`}</h1>
      ${profileTabsHTML(person.username, 'stats')}
    </div>
    <div class="stat-tiles">${tiles.map(([n, label]) => `<div class="stat-tile paper"><b>${esc(String(n))}</b><span>${esc(label)}</span></div>`).join('')}</div>
    <section>
      <div class="section-head"><h2>Tegridy streak</h2></div>
      <div id="streak-box">${streakHTML(streak, { isMe, name })}</div>
    </section>
    <section>
      <div class="section-head"><h2>Mr. Garrison's Report Card</h2></div>
      <div id="report-card"></div>
    </section>
    <div class="two-col">
      <section>
        <div class="section-head"><h2>Season rankings</h2></div>
        ${rankings}
      </section>
      <section>
        <div class="section-head"><h2>Logs per month</h2></div>
        ${monthChart}
      </section>
    </div>
    <section>
      <div class="section-head"><h2>Progress</h2><span class="result-count">${seen.size} of ${all.length}</span></div>
      ${progress}
    </section>
    ${rewatched.length ? `<section>
      <div class="section-head"><h2>Most rewatched</h2></div>
      <div class="ep-grid">${rewatched.map(([id, n]) => byId.get(id) && cardHTML(byId.get(id), { meta: `${n}× watched` })).filter(Boolean).join('')}</div>
    </section>` : ''}`;
  root.removeAttribute('aria-busy');
hasBadge(person.username, 'tegridy').then((yes) => yes && document.querySelector('#streak-box .streak-card')?.classList.add('stars'));
  mountReportCard($('#report-card'), { seasonAvgs, all, seen, ratings: new Map((latest || []).map((r) => [r.episode_id, Number(r.rating)])), isMe, name });
}
