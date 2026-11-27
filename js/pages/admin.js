// admin.html: manage tags and arcs. Episode import lives on import.html.
import { initPage } from '../layout.js?v=20261127190744';
import { supabase } from '../supabase.js?v=20261127190744';
import { $, esc, epCode, notify } from '../ui.js?v=20261127190744';
import { loadAllEpisodes } from '../episodes.js?v=20261127190744';
import { loadArcs } from '../arcs.js?v=20261127190744';
import { CHARACTER_TAGS } from '../data/character-tags.js?v=20261127190744';

const { profile } = await initPage({ title: 'Admin', auth: 'required' });
const root = $('#admin');

// Names only; you attach them to episodes from each episode page.
const STARTER_TAGS = {
  character: ['Cartman', 'Stan', 'Kyle', 'Kenny', 'Butters', 'Randy', 'Mr. Garrison', 'Mr. Mackey', 'Chef', 'Wendy',
    'Tolkien', 'Jimmy', 'Timmy', 'Craig', 'Tweek', 'Towelie', 'Mr. Hankey', 'Satan', 'Terrance and Phillip', 'PC Principal',
    'Ike', 'Sharon', 'Gerald', 'Sheila', 'Big Gay Al', 'Jesus', 'Officer Barbrady', 'Mayor McDaniels', 'Scott Tenorman', 'Professor Chaos'],
  theme: ['Celebrity parody', 'Politics', 'Religion', 'Holiday special', 'Video games', 'Movie parody', 'Kenny dies',
    'Revenge', 'Meta / TV industry', 'Technology', 'Social media', 'Sports', 'Science', 'Musical numbers', 'Superheroes',
    'School', 'Family', 'Money schemes', 'Aliens', 'Classic'],
};

// Suggested arcs, matched against episode titles. Nothing is saved until you click Add.
const STARTER_ARCS = [
  ["Cartman's Mom", ["Cartman's Mom Is a Dirty Slut", "Cartman's Mom Is Still a Dirty Slut"]],
  ['Cartoon Wars', ['Cartoon Wars (1)', 'Cartoon Wars (2)']],
  ['Go God Go', ['Go God Go (1)', 'Go God Go XII (2)']],
  ['Imaginationland', ['Imaginationland', 'Imaginationland Episode II', 'Imaginationland Episode III']],
  ['Pandemic', ['Pandemic', 'Pandemic 2: The Startling']],
  ['200 / 201', ['200', '201']],
  ['The Coon trilogy', ['Coon 2: Hindsight', 'Mysterion Rises', 'Coon vs. Coon & Friends']],
  ["You're Getting Old", ["You're Getting Old", 'Ass Burgers']],
  ['Black Friday trilogy', ['Black Friday', 'A Song of Ass and Fire', 'Titties and Dragons']],
  ['Post COVID', ['South Park: Post COVID', 'South Park: Post COVID: The Return of COVID']],
  ['The Streaming Wars', ['South Park the Streaming Wars', 'South Park the Streaming Wars Part 2']],
];

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

if (!profile.is_admin) {
  root.innerHTML = `<div class="big-message"><h1 class="cut">Respect my authoritah!</h1><p>This page is for admins only.</p>
    <a class="btn btn-green" href="index.html">Go home</a></div>`;
  root.removeAttribute('aria-busy');
} else {
  await render();
}

async function render() {
  const [{ data: tags }, { data: links }, arcs, all] = await Promise.all([
    supabase.from('tags').select('id, name, kind').order('name'),
    supabase.from('episode_tags').select('tag_id, episode_id').limit(10000),
    loadArcs(),
    loadAllEpisodes(),
  ]);
  const byId = new Map(all.map((e) => [e.id, e]));
  // First match wins, so a regular episode beats a special or movie with the same title.
  const byTitle = new Map();
  for (const e of all) if (!byTitle.has(norm(e.title))) byTitle.set(norm(e.title), e);
  const uses = new Map();
  for (const l of links || []) uses.set(l.tag_id, (uses.get(l.tag_id) || 0) + 1);
  const existingTag = new Set((tags || []).map((t) => `${t.kind}:${t.name.toLowerCase()}`));
  const missingTags = Object.entries(STARTER_TAGS).flatMap(([kind, names]) =>
    names.filter((n) => !existingTag.has(`${kind}:${n.toLowerCase()}`)).map((name) => ({ name, kind })));
  const arcNames = new Set(arcs.map((a) => a.name.toLowerCase()));
  const suggestions = STARTER_ARCS.filter(([name]) => !arcNames.has(name.toLowerCase())).map(([name, titles]) => ({
    name, parts: titles.map((t) => ({ title: t, ep: byTitle.get(norm(t)) })),
  }));

  // Character focus tags from js/data/character-tags.js
  const focus = CHARACTER_TAGS.map(([title, names]) => ({ title, names, ep: byTitle.get(norm(title)) }));
  const focusHit = focus.filter((f) => f.ep);
  const focusMiss = focus.filter((f) => !f.ep);
  const tagKey = (name) => (tags || []).find((t) => t.kind === 'character' && t.name.toLowerCase() === name.toLowerCase());
  const linkSet = new Set((links || []).map((l) => `${l.episode_id}:${l.tag_id}`));
  const focusNew = focusHit.reduce((n, f) => n + f.names.filter((name) => {
    const t = tagKey(name);
    return !t || !linkSet.has(`${f.ep.id}:${t.id}`);
  }).length, 0);
  const focusHTML = `
    <section class="import-card paper" style="max-width:none">
      <h2 class="cut" style="margin:0 0 6px;color:var(--white);font-size:24px">Character focus tags</h2>
      <p style="margin:0 0 12px">${focus.length} episodes that mainly centre on one character (Cartman, Stan, Kyle, Kenny, Butters, Randy and others).
        <strong>${focusHit.length}</strong> matched your episodes${focusMiss.length ? `, ${focusMiss.length} didn't` : ''}.
        ${focusNew ? `<strong>${focusNew}</strong> tags to add.` : 'All of them are already applied.'}</p>
      ${focusMiss.length ? `<details style="margin-bottom:12px;font-size:13px;color:var(--muted)"><summary>Titles not found</summary>
        <p style="margin:6px 0 0">${focusMiss.map((f) => esc(f.title)).join(' · ')}</p></details>` : ''}
      <div class="toolbar"><button type="button" class="btn btn-green" id="apply-focus" ${focusNew ? '' : 'disabled'}>Apply character tags</button>
        <span class="result-count">Adds tags only; never removes any. Safe to run again.</span></div>
    </section>`;

  const tagList = (kind) => (tags || []).filter((t) => t.kind === kind).map((t) => `
    <li>
      <div class="who"><a href="episodes.html?tag=${t.id}">${esc(t.name)}</a><span>${uses.get(t.id) || 0} episodes</span></div>
      <button type="button" class="link-button" data-rename="${t.id}">Rename</button>
      <button type="button" class="link-button" data-deltag="${t.id}">Delete</button>
    </li>`).join('') || '<li class="empty">None yet.</li>';

  root.innerHTML = `
    <div>
      <h1 class="cut" style="margin:0 0 8px;color:var(--white);font-size:clamp(30px,4vw,44px)">Admin</h1>
      <p style="margin:0;color:var(--text-soft)">Episode data: <a href="import.html">Import from TMDB</a>. Tag episodes from each episode page (the "+ Add tag" box under the synopsis).</p>
    </div>
    <p class="notice" id="msg" hidden></p>
    ${focusHTML}

    <div class="admin-grid">
      <section>
        <div class="section-head"><h2>Tags · ${(tags || []).length}</h2></div>
        ${missingTags.length ? `<div class="toolbar" style="margin-bottom:14px"><button type="button" class="btn btn-ghost" id="starter-tags">Add ${missingTags.length} starter tags</button>
          <span class="result-count">Common characters and themes (names only)</span></div>` : ''}
        <h3 style="font:600 13px var(--font-body);color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin:0 0 4px">Characters</h3>
        <ul class="people">${tagList('character')}</ul>
        <h3 style="font:600 13px var(--font-body);color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin:18px 0 4px">Themes</h3>
        <ul class="people">${tagList('theme')}</ul>
      </section>

      <section>
        <div class="section-head"><h2>Arcs · ${arcs.length}</h2></div>
        <form class="toolbar" id="new-arc" style="margin-bottom:14px">
          <label class="visually-hidden" for="arc-name">New arc name</label>
          <input type="text" id="arc-name" placeholder="New arc name" maxlength="100" style="max-width:240px">
          <button type="submit" class="btn btn-green">Create</button>
        </form>
        <ul class="people">${arcs.map((a) => `
          <li style="flex-wrap:wrap">
            <div class="who"><a href="arc.html?id=${a.id}">${esc(a.name)}</a>
              <span>${a.episodeIds.map((x) => byId.get(x)).filter(Boolean).map((e) => esc(e.title)).join(' → ') || 'No episodes yet'}</span></div>
            <button type="button" class="link-button" data-editarc="${a.id}">Edit parts</button>
            <button type="button" class="link-button" data-delarc="${a.id}">Delete</button>
            <div class="arc-editor" id="arc-editor-${a.id}" hidden style="width:100%"></div>
          </li>`).join('') || '<li class="empty">No arcs yet.</li>'}</ul>

        ${suggestions.length ? `
          <div class="section-head" style="margin-top:28px"><h2>Suggested arcs</h2></div>
          <p style="margin:0 0 10px;font-size:13px;color:var(--muted)">Matched by title against your episodes. Check the matches, then add.</p>
          <ul class="people">${suggestions.map((s, i) => {
            const ok = s.parts.every((p) => p.ep);
            return `<li>
              <div class="who"><strong style="color:var(--white)">${esc(s.name)}</strong>
                <span>${s.parts.map((p) => p.ep ? `${esc(p.ep.title)} (${esc(epCode(p.ep))})` : `<span style="color:#ff8a8a">not found: ${esc(p.title)}</span>`).join(' → ')}</span></div>
              <button type="button" class="btn ${ok ? 'btn-green' : 'btn-ghost'}" data-suggest="${i}" ${ok ? '' : 'disabled title="Some parts weren\'t found"'}>Add</button>
            </li>`;
          }).join('')}</ul>` : ''}
      </section>
    </div>`;
  root.removeAttribute('aria-busy');

  const msg = (t, type = 'ok') => notify($('#msg'), t, type);

  $('#apply-focus')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Applying…';
    // Create any character tags that don't exist yet.
    const needed = [...new Set(focusHit.flatMap((f) => f.names))].filter((n) => !tagKey(n));
    let allTags = tags || [];
    if (needed.length) {
      const { data, error } = await supabase.from('tags').insert(needed.map((name) => ({ name, kind: 'character' }))).select('id, name, kind');
      if (error) return msg(error.message, 'error');
      allTags = [...allTags, ...data];
    }
    const idOf = (name) => allTags.find((t) => t.kind === 'character' && t.name.toLowerCase() === name.toLowerCase())?.id;
    const rows = focusHit.flatMap((f) => f.names.map((name) => ({ episode_id: f.ep.id, tag_id: idOf(name) }))).filter((r) => r.tag_id);
    const { error } = await supabase.from('episode_tags').upsert(rows, { onConflict: 'episode_id,tag_id', ignoreDuplicates: true });
    if (error) return msg(error.message, 'error');
    await render();
    msg(`Done: ${rows.length} character tags across ${focusHit.length} episodes.`);
  });

  $('#starter-tags')?.addEventListener('click', async () => {
    const { error } = await supabase.from('tags').insert(missingTags);
    if (error) return msg(error.message, 'error');
    render();
  });
  root.querySelectorAll('[data-rename]').forEach((b) => b.onclick = async () => {
    const t = tags.find((x) => x.id === Number(b.dataset.rename));
    const name = prompt('Rename tag:', t.name);
    if (!name || name.trim() === t.name) return;
    const { error } = await supabase.from('tags').update({ name: name.trim() }).eq('id', t.id);
    if (error) return msg(error.message, 'error');
    render();
  });
  root.querySelectorAll('[data-deltag]').forEach((b) => b.onclick = async () => {
    const t = tags.find((x) => x.id === Number(b.dataset.deltag));
    if (!confirm(`Delete the tag "${t.name}"? It comes off ${uses.get(t.id) || 0} episodes. This can't be undone.`)) return;
    const { error } = await supabase.from('tags').delete().eq('id', t.id);
    if (error) return msg(error.message, 'error');
    render();
  });

  $('#new-arc').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#arc-name').value.trim();
    if (!name) return;
    const { error } = await supabase.from('arcs').insert({ name });
    if (error) return msg(error.message, 'error');
    render();
  });
  root.querySelectorAll('[data-delarc]').forEach((b) => b.onclick = async () => {
    const a = arcs.find((x) => x.id === Number(b.dataset.delarc));
    if (!confirm(`Delete the arc "${a.name}"? Episodes and logs stay; only the grouping goes. This can't be undone.`)) return;
    const { error } = await supabase.from('arcs').delete().eq('id', a.id);
    if (error) return msg(error.message, 'error');
    render();
  });
  root.querySelectorAll('[data-suggest]').forEach((b) => b.onclick = async () => {
    const s = suggestions[Number(b.dataset.suggest)];
    b.disabled = true;
    const { data: arc, error } = await supabase.from('arcs').insert({ name: s.name }).select('id').single();
    if (error) return msg(error.message, 'error');
    const { error: e2 } = await supabase.from('arc_episodes').insert(s.parts.map((p, i) => ({ arc_id: arc.id, episode_id: p.ep.id, position: i })));
    if (e2) return msg(e2.message, 'error');
    render();
  });
  root.querySelectorAll('[data-editarc]').forEach((b) => b.onclick = () => {
    const a = arcs.find((x) => x.id === Number(b.dataset.editarc));
    arcEditor(a, all, byId);
  });
}

function arcEditor(arc, all, byId) {
  const box = $(`#arc-editor-${arc.id}`);
  box.hidden = false;
  let ids = [...arc.episodeIds];

  const draw = () => {
    box.innerHTML = `
      <div class="import-card paper form" style="max-width:none;margin-top:10px;padding:18px">
        <ol class="people">${ids.map((x, i) => {
          const e = byId.get(x);
          return `<li><span class="result-count">${i + 1}</span><div class="who"><span style="color:var(--text)">${esc(e?.title || '?')}</span><span>${esc(epCode(e))}</span></div>
            <button type="button" class="link-button" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
            <button type="button" class="link-button" data-down="${i}" ${i === ids.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
            <button type="button" class="link-button" data-rm="${i}">Remove</button></li>`;
        }).join('')}</ol>
        <div class="field"><label for="arc-search-${arc.id}">Add a part</label>
          <input type="search" id="arc-search-${arc.id}" placeholder="Search episodes" autocomplete="off"></div>
        <ul class="pick-results" id="arc-results-${arc.id}"></ul>
        <div class="toolbar"><button type="button" class="btn btn-green" data-save>Save parts</button><button type="button" class="btn btn-ghost" data-cancel>Cancel</button></div>
      </div>`;
    box.querySelectorAll('[data-up]').forEach((x) => x.onclick = () => { const i = +x.dataset.up; [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; draw(); });
    box.querySelectorAll('[data-down]').forEach((x) => x.onclick = () => { const i = +x.dataset.down; [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; draw(); });
    box.querySelectorAll('[data-rm]').forEach((x) => x.onclick = () => { ids.splice(+x.dataset.rm, 1); draw(); });
    box.querySelector('[data-cancel]').onclick = () => { box.hidden = true; box.innerHTML = ''; };
    const search = box.querySelector('input[type="search"]');
    search.oninput = () => {
      const q = search.value.trim().toLowerCase();
      const hits = q ? all.filter((e) => e.title.toLowerCase().includes(q) && !ids.includes(e.id)).slice(0, 20) : [];
      const list = box.querySelector('.pick-results');
      list.innerHTML = hits.map((e) => `<li><button type="button" data-add="${e.id}"><span>${esc(e.title)}</span><span class="code">${esc(epCode(e))}</span></button></li>`).join('');
      list.querySelectorAll('[data-add]').forEach((x) => x.onclick = () => { ids.push(+x.dataset.add); draw(); box.querySelector('input[type="search"]').focus(); });
    };
    box.querySelector('[data-save]').onclick = async () => {
      const del = await supabase.from('arc_episodes').delete().eq('arc_id', arc.id);
      if (del.error) return alert(del.error.message);
      if (ids.length) {
        const { error } = await supabase.from('arc_episodes').insert(ids.map((x, i) => ({ arc_id: arc.id, episode_id: x, position: i })));
        if (error) return alert(error.message);
      }
      render();
    };
  };
  draw();
}
