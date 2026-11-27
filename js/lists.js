// "Add to a list…" dialog for an episode.
import { supabase } from './supabase.js?v=20261127201827';
import { esc } from './ui.js?v=20261127201827';

export async function openAddToList(ep) {
  const { data: { user } } = await supabase.auth.getUser();
  const d = document.createElement('dialog');
  d.className = 'log-dialog';
  d.setAttribute('aria-labelledby', 'list-title');
  document.body.append(d);
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => d.remove());

  const [{ data: lists }, { data: inLists }] = await Promise.all([
    supabase.from('lists').select('id, title').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('list_items').select('list_id').eq('episode_id', ep.id),
  ]);
  const has = new Set((inLists || []).map((r) => r.list_id));

  d.innerHTML = `
    <div class="sheet paper">
      <h2 class="cut" id="list-title">Add to a list</h2>
      <p style="margin:0;color:var(--text-soft)">${esc(ep.title)}</p>
      ${lists?.length ? `<ul class="pick-results">${lists.map((l) => `
        <li><button type="button" data-list="${l.id}" ${has.has(l.id) ? 'disabled' : ''}>
          <span>${esc(l.title)}</span><span class="code">${has.has(l.id) ? 'already in it' : 'add'}</span></button></li>`).join('')}</ul>`
        : '<p class="empty">You have no lists yet.</p>'}
      <form class="row" id="new-list" style="align-items:flex-end">
        <div class="field" style="flex:1;min-width:200px">
          <label for="new-list-title">New list</label>
          <input type="text" id="new-list-title" maxlength="100" placeholder="e.g. Best Butters episodes">
        </div>
        <button type="submit" class="btn btn-green">Create &amp; add</button>
      </form>
      <p class="notice" id="list-msg" hidden></p>
      <div class="actions"><a class="btn btn-ghost" href="lists.html?tab=mine">My lists</a><button type="button" class="btn btn-ghost" data-close>Done</button></div>
    </div>`;
  d.querySelector('[data-close]').onclick = () => d.close();

  const msg = (text, type = 'ok') => {
    const m = d.querySelector('#list-msg');
    m.textContent = text;
    m.className = `notice notice-${type}`;
    m.hidden = false;
  };

  async function add(listId, title) {
    const { data: last } = await supabase.from('list_items').select('position').eq('list_id', listId).order('position', { ascending: false }).limit(1);
    const { error } = await supabase.from('list_items').insert({ list_id: listId, episode_id: ep.id, position: (last?.[0]?.position ?? -1) + 1 });
    if (error) return msg(error.message, 'error');
    msg(`Added to "${title}".`);
  }

  d.querySelectorAll('[data-list]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    await add(Number(b.dataset.list), b.querySelector('span').textContent);
    b.querySelector('.code').textContent = 'added';
  }));
  d.querySelector('#new-list').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = d.querySelector('#new-list-title').value.trim();
    if (!title) return msg('Give the list a name.', 'error');
    const { data, error } = await supabase.from('lists').insert({ title }).select('id').single();
    if (error) return msg(error.message, 'error');
    await add(data.id, title);
    d.querySelector('#new-list-title').value = '';
  });

  d.showModal();
}
