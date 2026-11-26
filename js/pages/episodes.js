import { initPage } from '../layout.js';
import { supabase } from '../supabase.js';
import { $, params } from '../ui.js';
import { loadAllEpisodes, myLogMap, cardHTML } from '../episodes.js';

const { user } = await initPage({ title: 'Episodes', auth: 'required' });

const q = $('#q');
const sort = $('#sort');
const grid = $('#grid');
let filter = 'all';
let all = [];
let mine = new Map();
let community = new Map();

q.value = params.get('q') || '';

async function load() {
  const [eps, logs, { data: ratings }] = await Promise.all([
    loadAllEpisodes(),
    myLogMap(user.id),
    supabase.from('episode_ratings').select('episode_id, avg_rating, rating_count, watcher_count').limit(2000),
  ]);
  all = eps;
  mine = logs;
  community = new Map((ratings || []).map((r) => [r.episode_id, r]));
  render();
  grid.removeAttribute('aria-busy');
}

function render() {
  const text = q.value.trim().toLowerCase();
  const code = text.match(/^s(\d+)\s*e(\d+)$/);
  let list = all.filter((e) => {
    if (filter === 'unwatched' && mine.has(e.id)) return false;
    if (['episode', 'special', 'movie'].includes(filter) && e.kind !== filter) return false;
    if (code) return e.season === +code[1] && e.number === +code[2];
    return !text || e.title.toLowerCase().includes(text);
  });

  const avg = (e) => Number(community.get(e.id)?.avg_rating ?? -1);
  if (sort.value === 'newest') list = [...list].sort((a, b) => (b.air_date || '').localeCompare(a.air_date || ''));
  if (sort.value === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
  if (sort.value === 'rating') list = [...list].sort((a, b) => avg(b) - avg(a));
  if (sort.value === 'popular') list = [...list].sort((a, b) => (community.get(b.id)?.watcher_count ?? 0) - (community.get(a.id)?.watcher_count ?? 0));

  $('#count').textContent = `${list.length} of ${all.length}`;
  grid.innerHTML = list.length
    ? list.map((e) => {
        const c = community.get(e.id);
        const meta = c?.avg_rating ? `avg ${Number(c.avg_rating).toFixed(1)}` : (e.air_date ? e.air_date.slice(0, 4) : '');
        return cardHTML(e, { mine: mine.get(e.id), meta });
      }).join('')
    : '<p class="empty" style="grid-column:1/-1">Nothing matches. Screw you guys, I\'m going home.</p>';
}

q.addEventListener('input', () => {
  const url = new URL(location.href);
  if (q.value) url.searchParams.set('q', q.value); else url.searchParams.delete('q');
  history.replaceState(null, '', url);
  render();
});
sort.addEventListener('change', render);
document.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
  filter = b.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  render();
}));

await load();
window.addEventListener('parkboxd:logged', load);