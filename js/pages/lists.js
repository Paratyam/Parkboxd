// lists.html?tab=all|mine  (or ?u=name for one person's lists)
import { initPage } from '../layout.js?v=20261128084148';
import { supabase } from '../supabase.js?v=20261128084148';
import { SITE_NAME } from '../config.js?v=20261128084148';
import { $, esc, params, avatarHTML, notify, profileTabsHTML } from '../ui.js?v=20261128084148';
import { thumbHTML } from '../episodes.js?v=20261128084148';
import { line } from '../jokes.js?v=20261128084148';

const { user } = await initPage({ title: 'Lists', auth: 'required' });
const root = $('#lists');
const tab = params.get('tab') === 'mine' ? 'mine' : 'all';

let q = supabase.from('lists')
  .select('id, user_id, title, description, created_at, profiles(username, display_name, avatar_color, avatar_icon), list_items(position, episodes(id, kind, season, number, title, still_path))')
  .order('created_at', { ascending: false }).limit(200);
// ?u=name: one person's lists, shown as a tab of their profile.
const wantedU = (params.get('u') || '').toLowerCase();
const { data: person } = wantedU
  ? await supabase.from('profiles').select('id, username, display_name').eq('username', wantedU).maybeSingle()
  : { data: null };
const isMe = person ? person.id === user.id : tab === 'mine';
if (person) q = q.eq('user_id', person.id);
else if (tab === 'mine') q = q.eq('user_id', user.id);
const { data: lists } = await q;
const personName = person ? person.display_name || person.username : '';
const heading = person ? (isMe ? 'Your lists' : `${personName}'s lists`) : 'Lists';
document.title = `${person ? heading : tab === 'mine' ? 'My lists' : 'Lists'} · ${SITE_NAME}`;

root.innerHTML = `
  <div>
    <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">${esc(heading)}</h1>
    ${person ? profileTabsHTML(person.username, 'lists') : `
    <nav class="profile-tabs" aria-label="Which lists">
      <a href="lists.html"${tab === 'all' ? ' aria-current="page"' : ''}>Everyone's</a>
      <a href="lists.html?tab=mine"${tab === 'mine' ? ' aria-current="page"' : ''}>Mine</a>
    </nav>`}
  </div>
  <form class="toolbar" id="new-list"${person && !isMe ? ' hidden' : ''}>
    <label class="visually-hidden" for="new-title">New list name</label>
    <input type="text" id="new-title" maxlength="100" placeholder="Start a new list, e.g. Episodes that ruined my childhood" style="max-width:420px">
    <button type="submit" class="btn btn-green">Create list</button>
  </form>
  <p class="notice" id="msg" hidden></p>
  ${lists?.length ? `<div class="list-grid">${lists.map((l) => {
    const items = (l.list_items || []).sort((a, b) => a.position - b.position).map((i) => i.episodes).filter(Boolean);
    return `
    <a class="list-card" href="list.html?id=${l.id}">
      <div class="list-stack">${items.slice(0, 4).map((e) => thumbHTML(e, { showTitle: false, code: '' })).join('') || '<div class="ep-thumb paper" style="background-color:var(--surface)"><span></span></div>'}</div>
      <div class="list-info">
        <strong>${esc(l.title)}</strong>
        <span>${avatarHTML(l.profiles, 18)} ${esc(l.profiles?.display_name || l.profiles?.username)} · ${items.length} ${items.length === 1 ? 'episode' : 'episodes'}</span>
        ${l.description ? `<span class="desc">${esc(l.description.length > 120 ? `${l.description.slice(0, 120)}…` : l.description)}</span>` : ''}
      </div>
    </a>`;
  }).join('')}</div>`
    : `<p class="empty">${esc(person && !isMe ? `${personName} hasn't made any lists yet.` : line(isMe ? 'listsEmptyMine' : 'listsEmpty'))}</p>`}`;
root.removeAttribute('aria-busy');

$('#new-list').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = $('#new-title').value.trim();
  if (!title) return notify($('#msg'), 'Give the list a name.', 'error');
  const { data, error } = await supabase.from('lists').insert({ title }).select('id').single();
  if (error) return notify($('#msg'), error.message, 'error');
  location.href = `list.html?id=${data.id}`;
});
