// list.html?id=N: view a list; its owner can edit it here.
import { initPage } from '../layout.js?v=20261127113852';
import { supabase } from '../supabase.js?v=20261127113852';
import { SITE_NAME } from '../config.js?v=20261127113852';
import { $, esc, params, epCode, avatarHTML, notify } from '../ui.js?v=20261127113852';
import { loadAllEpisodes, cardHTML, myLogMap } from '../episodes.js?v=20261127113852';

const { user } = await initPage({ title: 'List', auth: 'required' });
const root = $('#list');
const id = Number(params.get('id'));
let editing = params.get('edit') === '1';

async function render() {
  const [{ data: list }, { data: items }, all, mine] = await Promise.all([
    supabase.from('lists').select('id, user_id, title, description, created_at, profiles(username, display_name, avatar_color, avatar_icon)').eq('id', id).maybeSingle(),
    supabase.from('list_items').select('episode_id, position, note').eq('list_id', id).order('position'),
    loadAllEpisodes(),
    myLogMap(user.id),
  ]);
  if (!list) {
    root.innerHTML = `<div class="big-message"><h1 class="cut">List not found</h1><a class="btn btn-green" href="lists.html">All lists</a></div>`;
    root.removeAttribute('aria-busy');
    return;
  }
  const byId = new Map(all.map((e) => [e.id, e]));
  const rows = (items || []).map((i) => ({ ...i, ep: byId.get(i.episode_id) })).filter((i) => i.ep);
  const own = list.user_id === user.id;
  const seen = rows.filter((r) => mine.has(r.ep.id)).length;
  document.title = `${list.title} · ${SITE_NAME}`;

  root.innerHTML = `
    <div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:8px;display:flex;gap:8px;align-items:center">
        <a href="lists.html">Lists</a> · ${avatarHTML(list.profiles, 20)}
        <a href="profile.html?u=${encodeURIComponent(list.profiles?.username || '')}">${esc(list.profiles?.display_name || list.profiles?.username)}</a>
      </div>
      <h1 class="cut" style="margin:0;color:var(--white);font-size:clamp(30px,4vw,48px)">${esc(list.title)}</h1>
      ${list.description ? `<p style="margin:10px 0 0;color:var(--text-soft);max-width:680px;white-space:pre-line">${esc(list.description)}</p>` : ''}
      ${own ? `<div class="toolbar" style="margin-top:14px">
        <button type="button" class="btn ${editing ? 'btn-green' : 'btn-ghost'}" id="toggle-edit">${editing ? 'Done editing' : 'Edit list'}</button>
        ${editing ? '<button type="button" class="btn btn-ghost" id="delete-list">Delete list</button>' : ''}
      </div>` : ''}
    </div>

    ${own && editing ? `
      <section class="import-card paper form" style="max-width:none">
        <div class="field"><label for="l-title">Title</label><input type="text" id="l-title" maxlength="100" value="${esc(list.title)}"></div>
        <div class="field"><label for="l-desc">Description</label><textarea id="l-desc" maxlength="2000" rows="3">${esc(list.description || '')}</textarea></div>
        <div><button type="button" class="btn btn-green" id="save-meta">Save details</button></div>
        <div class="field"><label for="add-search">Add episodes</label>
          <input type="search" id="add-search" placeholder="Search episodes, specials and movies" autocomplete="off"></div>
        <ul class="pick-results" id="add-results" aria-live="polite"></ul>
        <p class="notice" id="msg" hidden></p>
      </section>` : ''}

    <section>
      <div class="section-head"><h2>${rows.length} ${rows.length === 1 ? 'episode' : 'episodes'}</h2><span class="result-count">You've seen ${seen} of ${rows.length}</span></div>
      ${rows.length ? (editing
        ? `<ol class="people">${rows.map((r, i) => `
            <li>
              <span class="result-count" style="width:24px;text-align:right">${i + 1}</span>
              <div class="who"><a href="episode.html?id=${r.ep.id}">${esc(r.ep.title)}</a><span>${esc(epCode(r.ep))}${r.note ? ` · ${esc(r.note)}` : ''}</span></div>
              <button type="button" class="link-button" data-move="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
              <button type="button" class="link-button" data-move="${i}" data-dir="1" ${i === rows.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
              <button type="button" class="link-button" data-note="${r.ep.id}">Note</button>
              <button type="button" class="link-button" data-remove="${r.ep.id}">Remove</button>
            </li>`).join('')}</ol>`
        : `<div class="ep-grid">${rows.map((r, i) => `<div>${cardHTML(r.ep, { mine: mine.get(r.ep.id), meta: `#${i + 1}` })}
            ${r.note ? `<p style="margin:6px 0 0;font-size:13px;color:var(--text-soft)">${esc(r.note)}</p>` : ''}</div>`).join('')}</div>`)
        : `<p class="empty">${own ? 'Empty list. Click "Edit list" to add episodes, or use "Add to a list…" on any episode page.' : 'This list is empty.'}</p>`}
    </section>`;
  root.removeAttribute('aria-busy');

  if (!own) return;
  $('#toggle-edit').onclick = () => { editing = !editing; render(); };
  $('#delete-list')?.addEventListener('click', async () => {
    if (!confirm(`Delete "${list.title}"? This can't be undone.`)) return;
    const { error } = await supabase.from('lists').delete().eq('id', id);
    if (error) return alert(error.message);
    location.href = 'lists.html?tab=mine';
  });
  if (!editing) return;

  $('#save-meta').onclick = async () => {
    const title = $('#l-title').value.trim();
    if (!title) return notify($('#msg'), 'The list needs a title.', 'error');
    const { error } = await supabase.from('lists').update({ title, description: $('#l-desc').value.trim() || null }).eq('id', id);
    if (error) return notify($('#msg'), error.message, 'error');
    render();
  };

  const search = $('#add-search');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    const m = q.match(/^s(\d+)\s*e(\d+)$/);
    const inList = new Set(rows.map((r) => r.ep.id));
    const hits = q ? all.filter((e) => (m ? e.season === +m[1] && e.number === +m[2] : e.title.toLowerCase().includes(q))).slice(0, 25) : [];
    $('#add-results').innerHTML = hits.map((e) => `
      <li><button type="button" data-add="${e.id}" ${inList.has(e.id) ? 'disabled' : ''}><span>${esc(e.title)}</span>
        <span class="code">${inList.has(e.id) ? 'in list' : esc(epCode(e))}</span></button></li>`).join('');
    $('#add-results').querySelectorAll('[data-add]').forEach((b) => b.onclick = async () => {
      const { error } = await supabase.from('list_items').insert({ list_id: id, episode_id: Number(b.dataset.add), position: rows.length });
      if (error) return notify($('#msg'), error.message, 'error');
      await render();
      $('#add-search')?.focus();
    });
  });

  root.querySelectorAll('[data-remove]').forEach((b) => b.onclick = async () => {
    await supabase.from('list_items').delete().eq('list_id', id).eq('episode_id', Number(b.dataset.remove));
    render();
  });
  root.querySelectorAll('[data-note]').forEach((b) => b.onclick = async () => {
    const row = rows.find((r) => r.ep.id === Number(b.dataset.note));
    const note = prompt(`Note for "${row.ep.title}" (leave empty to remove):`, row.note || '');
    if (note === null) return;
    await supabase.from('list_items').update({ note: note.trim() || null }).eq('list_id', id).eq('episode_id', row.ep.id);
    render();
  });
  root.querySelectorAll('[data-move]').forEach((b) => b.onclick = async () => {
    const i = Number(b.dataset.move);
    const j = i + Number(b.dataset.dir);
    const order = rows.map((r) => r.ep.id);
    [order[i], order[j]] = [order[j], order[i]];
    await Promise.all(order.map((epId, pos) => supabase.from('list_items').update({ position: pos }).eq('list_id', id).eq('episode_id', epId)));
    render();
  });
}

await render();
