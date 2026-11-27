// rankings.html?type=top|divisive&min=3&kind=all|episode|special|movie
import { initPage } from '../layout.js?v=20261127074052';
import { supabase } from '../supabase.js?v=20261127074052';
import { SITE_NAME } from '../config.js?v=20261127074052';
import { $, esc, params, epCode, stars } from '../ui.js?v=20261127074052';
import { loadAllEpisodes, myLogMap, thumbHTML } from '../episodes.js?v=20261127074052';
import { rigRankings } from '../fx.js?v=20261127074052';

const { user } = await initPage({ title: 'Rankings', auth: 'required' });
const root = $('#rankings');

const type = params.get('type') === 'divisive' ? 'divisive' : 'top';
const min = [1, 2, 3, 5, 10].includes(Number(params.get('min'))) ? Number(params.get('min')) : 3;

const [all, mine, { data: ratings }] = await Promise.all([
  loadAllEpisodes(),
  myLogMap(user.id),
  supabase.from('episode_ratings').select('episode_id, avg_rating, rating_count, rating_stddev').gte('rating_count', min).limit(2000),
]);
const byId = new Map(all.map((e) => [e.id, e]));
const rows = (ratings || []).map((r) => ({ ...r, avg: Number(r.avg_rating), sd: Number(r.rating_stddev), ep: byId.get(r.episode_id) })).filter((r) => r.ep);

if (type === 'top') rows.sort((a, b) => b.avg - a.avg || b.rating_count - a.rating_count);
else rows.sort((a, b) => b.sd - a.sd || b.rating_count - a.rating_count);
const shown = rows.slice(0, 100);
document.title = `${type === 'top' ? 'Highest rated' : 'Most divisive'} · ${SITE_NAME}`;

const link = (t, m) => `rankings.html?type=${t}&min=${m}`;
root.innerHTML = `
  <div>
    <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">Rankings</h1>
    <nav class="profile-tabs" aria-label="Ranking type">
      <a href="${link('top', min)}"${type === 'top' ? ' aria-current="page"' : ''}>Highest rated</a>
      <a href="${link('divisive', min)}"${type === 'divisive' ? ' aria-current="page"' : ''}>Most divisive</a>
      <a href="hottakes.html">🌶️ Hot takes</a>
    </nav>
  </div>
  <div class="toolbar">
    <span class="result-count">${type === 'top'
      ? 'Best average rating across everyone.'
      : 'Where people disagree most: the biggest spread between ratings (standard deviation).'}</span>
    <span style="flex:1"></span>
    <label for="min" class="result-count">At least</label>
    <select id="min">${[1, 2, 3, 5, 10].map((m) => `<option value="${m}"${m === min ? ' selected' : ''}>${m} rating${m === 1 ? '' : 's'}</option>`).join('')}</select>
  </div>
  ${shown.length ? `<ol class="rank-table">${shown.map((r, i) => `
    <li>
      <span class="pos">${i + 1}</span>
      <a href="episode.html?id=${r.ep.id}" class="thumb" aria-hidden="true" tabindex="-1">${thumbHTML(r.ep, { showTitle: false })}</a>
      <div class="info">
        <a href="episode.html?id=${r.ep.id}">${esc(r.ep.title)}</a>
        <span>${esc(epCode(r.ep))}${mine.has(r.ep.id) ? ` · you: <span style="color:var(--green)">${stars(mine.get(r.ep.id).rating) || 'watched'}</span>` : ''}</span>
      </div>
      <div class="score">
        ${type === 'top'
          ? `<b>${r.avg.toFixed(2)}</b><span>${r.rating_count} rating${r.rating_count === 1 ? '' : 's'}</span>`
          : `<b>±${r.sd.toFixed(2)}</b><span>avg ${r.avg.toFixed(1)} · ${r.rating_count} ratings</span>`}
      </div>
    </li>`).join('')}</ol>`
    : `<p class="empty">Nothing has ${min} or more ratings yet. Get your friends rating, or lower the minimum. Democracy takes time, mkay.</p>`}`;
root.removeAttribute('aria-busy');
rigRankings(root);

$('#min').addEventListener('change', (e) => { location.href = link(type, e.target.value); });
