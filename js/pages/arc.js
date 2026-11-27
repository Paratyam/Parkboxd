// arc.html?id=N: a multi-part arc.
import { initPage } from '../layout.js?v=20261127200432';
import { SITE_NAME } from '../config.js?v=20261127200432';
import { $, esc, params } from '../ui.js?v=20261127200432';
import { loadAllEpisodes, myLogMap, cardHTML } from '../episodes.js?v=20261127200432';
import { loadArcs, openLogArc } from '../arcs.js?v=20261127200432';

const { user } = await initPage({ title: 'Arc', auth: 'required' });
const root = $('#arc');
const id = Number(params.get('id'));

async function render() {
  const [arcs, all, mine] = await Promise.all([loadArcs(), loadAllEpisodes(), myLogMap(user.id)]);
  const arc = arcs.find((a) => a.id === id);
  if (!arc) {
    root.innerHTML = `<div class="big-message"><h1 class="cut">Arc not found</h1><a class="btn btn-green" href="seasons.html">Seasons</a></div>`;
    root.removeAttribute('aria-busy');
    return;
  }
  const byId = new Map(all.map((e) => [e.id, e]));
  const eps = arc.episodeIds.map((x) => byId.get(x)).filter(Boolean);
  const seen = eps.filter((e) => mine.has(e.id)).length;
  document.title = `${arc.name} · ${SITE_NAME}`;

  root.innerHTML = `
    <div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px"><a href="seasons.html#arcs">Multi-part arcs</a></div>
      <h1 class="cut" style="margin:0;color:var(--white);font-size:clamp(34px,5vw,52px)">${esc(arc.name)}</h1>
      <div class="toolbar" style="margin-top:14px">
        <button type="button" class="btn btn-green" id="log-arc">Log the whole arc</button>
        <span class="result-count">You've seen ${seen} of ${eps.length}</span>
      </div>
    </div>
    <div class="ep-grid">${eps.map((e, i) => cardHTML(e, { mine: mine.get(e.id), meta: `Part ${i + 1}` })).join('')}</div>`;
  root.removeAttribute('aria-busy');

  $('#log-arc').onclick = async () => {
    if (await openLogArc(arc, eps, mine)) {
      window.dispatchEvent(new CustomEvent('parkboxd:logged'));
    }
  };
}

await render();
window.addEventListener('parkboxd:logged', render);
