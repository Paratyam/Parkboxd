import { initPage } from '../layout.js?v=20261127180848';
import { supabase } from '../supabase.js?v=20261127180848';
import { $, esc, params, fetchAll } from '../ui.js?v=20261127180848';
import { loadAllEpisodes, myLogMap, cardHTML, seasonCode, matchesCode } from '../episodes.js?v=20261127180848';
import { FOCUS_CHARACTERS } from '../data/character-tags.js?v=20261127180848';
import { line } from '../jokes.js?v=20261127180848';
import { searchEpisodes } from '../search.js?v=20261127180848';

const { user } = await initPage({ title: 'Episodes', auth: 'required' });

const q = $('#q');
const sort = $('#sort');
const grid = $('#grid');
let filter = 'all';
let all = [];
let mine = new Map();
let community = new Map();
let tagged = new Map();
const tagSelect = $('#tag');

q.value = params.get('q') || '';
tagSelect.addEventListener('change', () => {
  const url = new URL(location.href);
  if (tagSelect.value) url.searchParams.set('tag', tagSelect.value); else url.searchParams.delete('tag');
  history.replaceState(null, '', url);
  document.querySelectorAll('[data-focus]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.focus === tagSelect.value)));
  render();
});

async function load() {
  const [eps, logs, { data: ratings }, { data: tags }, { data: links }] = await Promise.all([
    loadAllEpisodes(),
    myLogMap(user.id),
    supabase.from('episode_ratings').select('episode_id, avg_rating, rating_count, watcher_count').limit(2000),
    supabase.from('tags').select('id, name, kind').order('name'),
    fetchAll(() => supabase.from('episode_tags').select('episode_id, tag_id').order('episode_id').order('tag_id')),
  ]);
  all = eps;
  mine = logs;
  community = new Map((ratings || []).map((r) => [r.episode_id, r]));
  tagged = new Map();
  for (const l of links || []) {
    if (!tagged.has(l.tag_id)) tagged.set(l.tag_id, new Set());
    tagged.get(l.tag_id).add(l.episode_id);
  }
  // ?tag= can be a tag id or a tag name (e.g. ?tag=Butters).
  let current = tagSelect.value || params.get('tag') || '';
  if (current && !/^\d+$/.test(current)) {
    current = String((tags || []).find((t) => t.name.toLowerCase() === current.toLowerCase())?.id ?? '');
  }
  const group = (kind, label) => {
    const opts = (tags || []).filter((t) => t.kind === kind)
      .map((t) => `<option value="${t.id}">${esc(t.name)} (${tagged.get(t.id)?.size ?? 0})</option>`).join('');
    return opts ? `<optgroup label="${label}">${opts}</optgroup>` : '';
  };
  tagSelect.innerHTML = `<option value="">Any tag</option>${group('character', 'Characters')}${group('theme', 'Themes')}`;
  tagSelect.value = current;

  // Quick "episodes about…" buttons for the main characters that have tags.
  const focus = FOCUS_CHARACTERS
    .map((name) => (tags || []).find((t) => t.kind === 'character' && t.name.toLowerCase() === name.toLowerCase()))
    .filter((t) => t && tagged.get(t.id)?.size);
  $('#focus-chips').innerHTML = focus.length
    ? `<span class="result-count" style="align-self:center;margin-right:4px">Episodes about</span>${focus.map((t) =>
        `<button type="button" class="chip" data-focus="${t.id}" aria-pressed="${tagSelect.value === String(t.id)}">${esc(t.name)}</button>`).join('')}`
    : '';
  $('#focus-chips').querySelectorAll('[data-focus]').forEach((b) => b.addEventListener('click', () => {
    tagSelect.value = tagSelect.value === b.dataset.focus ? '' : b.dataset.focus;
    tagSelect.dispatchEvent(new Event('change'));
  }));
  render();
  grid.removeAttribute('aria-busy');
}

function render() {
  const text = q.value.trim().toLowerCase();
  const code = seasonCode(text); // S15 = the whole season, S15E3 = one episode
  // Anything else matches titles and plot summaries ("theme park" finds Cartmanland).
  const hits = text && !code ? searchEpisodes(all, text) : null;
  const rank = hits ? new Map(hits.map((h, i) => [h.ep.id, i])) : null;
  const tagSet = tagSelect.value ? tagged.get(Number(tagSelect.value)) || new Set() : null;
  let list = all.filter((e) => {
    if (tagSet && !tagSet.has(e.id)) return false;
    if (filter === 'unwatched' && mine.has(e.id)) return false;
    if (['episode', 'special', 'movie'].includes(filter) && e.kind !== filter) return false;
    if (code) return matchesCode(e, code);
    return !rank || rank.has(e.id);
  });

  const avg = (e) => Number(community.get(e.id)?.avg_rating ?? -1);
  if (rank && sort.value === 'match') list = [...list].sort((a, b) => rank.get(a.id) - rank.get(b.id));
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
    : `<p class="empty" style="grid-column:1/-1">${esc(line('searchEmpty'))}</p>`;
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