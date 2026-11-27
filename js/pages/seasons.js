// seasons.html: all seasons. seasons.html?s=5 | ?s=specials | ?s=movies: one group's episodes.
import { initPage } from '../layout.js?v=20261127193601';
import { SITE_NAME } from '../config.js?v=20261127193601';
import { $, esc, params } from '../ui.js?v=20261127193601';
import { loadAllEpisodes, myLogMap, cardHTML, thumbHTML, isAired } from '../episodes.js?v=20261127193601';
import { loadArcs } from '../arcs.js?v=20261127193601';

const { user } = await initPage({ title: 'Seasons', auth: 'required' });
const root = $('#seasons');
const COLOURS = ['#3fb950', '#4a90e2', '#f5c518', '#f2711c', '#d63a3a'];

let all = [];
let mine = new Map();
let arcs = [];

async function load() {
  [all, mine, arcs] = await Promise.all([loadAllEpisodes(), myLogMap(user.id), loadArcs()]);
  const s = params.get('s');
  if (s) renderGroup(s); else renderOverview();
  root.removeAttribute('aria-busy');
}

// Episodes grouped as [{ key, name, eps }] in display order.
function groups() {
  const out = new Map();
  for (const e of all) {
    const key = e.kind === 'movie' ? 'movies' : (e.kind === 'special' || e.season === 0) ? 'specials' : String(e.season);
    const name = key === 'movies' ? 'Movies' : key === 'specials' ? 'Specials' : `Season ${key}`;
    if (!out.has(key)) out.set(key, { key, name, eps: [] });
    out.get(key).eps.push(e);
  }
  return [...out.values()];
}

function years(eps) {
  const ys = eps.map((e) => e.air_date?.slice(0, 4)).filter(Boolean).sort();
  if (!ys.length) return '';
  return ys[0] === ys.at(-1) ? ys[0] : `${ys[0]}–${ys.at(-1)}`;
}

function renderOverview() {
  const gs = groups();
  const seen = all.filter((e) => mine.has(e.id)).length;
  root.innerHTML = `
    <div class="section-head"><h2>Seasons</h2><span class="result-count">You've seen ${seen} of ${all.length}</span></div>
    <div class="ep-grid wide">
      ${gs.map((g, i) => {
        const aired = g.eps.filter(isAired);
        const cover = aired.find((e) => e.still_path) || g.eps.find((e) => e.still_path) || g.eps[0];
        const watched = g.eps.filter((e) => mine.has(e.id)).length;
        const pct = Math.round((watched / g.eps.length) * 100);
        return `
          <a class="ep-card season-card" href="seasons.html?s=${g.key}">
            ${thumbHTML({ ...cover, title: g.name }, { size: 'w500', code: years(g.eps) })}
            <div class="ep-card-meta"><span>${g.eps.length} ${g.key === 'movies' ? 'movies' : 'episodes'}</span><span>${watched} seen</span></div>
            <div class="bar" aria-hidden="true"><div style="width:${pct}%;background:${COLOURS[i % 5]}"></div></div>
          </a>`;
      }).join('')}
    </div>
    ${arcsHTML()}`;
}

function arcsHTML() {
  const byId = new Map(all.map((e) => [e.id, e]));
  const list = arcs.map((a) => ({ ...a, eps: a.episodeIds.map((x) => byId.get(x)).filter(Boolean) })).filter((a) => a.eps.length);
  if (!list.length) return '';
  return `
    <section id="arcs">
      <div class="section-head"><h2>Multi-part arcs</h2><span class="result-count">Log a whole arc in one go</span></div>
      <div class="ep-grid wide">
        ${list.map((a) => {
          const cover = a.eps.find((e) => e.still_path) || a.eps[0];
          const seen = a.eps.filter((e) => mine.has(e.id)).length;
          return `
            <a class="ep-card season-card" href="arc.html?id=${a.id}">
              ${thumbHTML({ ...cover, title: a.name }, { size: 'w500', code: `${a.eps.length} parts` })}
              <div class="ep-card-meta"><span>${esc(years(a.eps))}</span><span>${seen} / ${a.eps.length} seen</span></div>
            </a>`;
        }).join('')}
      </div>
    </section>`;
}

function renderGroup(key) {
  const g = groups().find((x) => x.key === key);
  if (!g) {
    root.innerHTML = `<div class="big-message"><h1 class="cut">No such season</h1><p>There's no season "${esc(key)}". Yet.</p>
      <a class="btn btn-green" href="seasons.html">All seasons</a></div>`;
    return;
  }
  document.title = `${g.name} · ${SITE_NAME}`;
  const keys = groups().map((x) => x.key);
  const i = keys.indexOf(key);
  const watched = g.eps.filter((e) => mine.has(e.id)).length;
  const label = (k) => (k === 'movies' ? 'Movies' : k === 'specials' ? 'Specials' : `Season ${k}`);

  root.innerHTML = `
    <div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px"><a href="seasons.html">All seasons</a> · ${esc(years(g.eps))}</div>
      <h1 class="cut" style="margin:0;color:var(--white);font-size:clamp(34px,5vw,52px)">${esc(g.name)}</h1>
    </div>
    <section>
      <div class="section-head"><h2>${g.eps.length} ${key === 'movies' ? 'movies' : 'episodes'}</h2><span class="result-count">You've seen ${watched} of ${g.eps.length}</span></div>
      <div class="ep-grid">
        ${g.eps.map((e) => cardHTML(e, { mine: mine.get(e.id), meta: e.air_date ? e.air_date.slice(0, 4) : 'TBA' })).join('')}
      </div>
    </section>
    <nav class="toolbar" aria-label="Other seasons" style="justify-content:space-between">
      ${i > 0 ? `<a href="seasons.html?s=${keys[i - 1]}">← ${esc(label(keys[i - 1]))}</a>` : '<span></span>'}
      ${i < keys.length - 1 ? `<a href="seasons.html?s=${keys[i + 1]}">${esc(label(keys[i + 1]))} →</a>` : '<span></span>'}
    </nav>`;
}

await load();
window.addEventListener('parkboxd:logged', load);
