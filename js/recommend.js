// "You have to watch this": send an episode to a friend with a note. The database function
// recommend_episode() puts it on their watchlist, messages it to them, and tells you when they
// rate it. Only people who follow each other can send to each other.
import { supabase } from './supabase.js?v=20261128095147';
import { esc, avatarHTML, toast, stars } from './ui.js?v=20261128095147';

async function mutuals(me) {
  const [{ data: out }, { data: inc }] = await Promise.all([
    supabase.from('follows').select('followee_id').eq('follower_id', me),
    supabase.from('follows').select('follower_id').eq('followee_id', me),
  ]);
  const followers = new Set((inc || []).map((f) => f.follower_id));
  const ids = (out || []).map((f) => f.followee_id).filter((id) => followers.has(id));
  if (!ids.length) return [];
  const { data } = await supabase.from('profiles').select('id, username, display_name, avatar_color, avatar_icon').in('id', ids);
  const name = (p) => p.display_name || p.username || '';
  return (data || []).sort((a, b) => name(a).localeCompare(name(b)));
}

export async function openRecommend(ep) {
  const { data: { user } } = await supabase.auth.getUser();
  const people = await mutuals(user.id);
  const d = document.createElement('dialog');
  d.className = 'log-dialog';
  d.setAttribute('aria-labelledby', 'rec-title');
  d.innerHTML = `
    <form class="sheet paper" novalidate>
      <h2 class="cut" id="rec-title">You have to watch this</h2>
      <p style="margin:0;color:var(--text-soft)">${esc(ep.title)}</p>
      ${people.length ? `
        <ul class="rec-people">${people.map((p) => `
          <li><label><input type="checkbox" value="${p.id}">${avatarHTML(p, 30)}<span>${esc(p.display_name || p.username)}</span></label></li>`).join('')}</ul>
        <div class="field"><label for="rec-note-text">Why? <span style="font-weight:400;color:var(--muted)">(optional)</span></label>
          <textarea id="rec-note-text" maxlength="500" rows="3" placeholder="Trust me on this one."></textarea></div>
        <p style="margin:0;font-size:13px;color:var(--muted)">It goes to their messages and watchlist. You'll get a notification when they rate it.</p>`
      : '<p class="empty">You can send episodes to people who follow you back. <a href="friends.html?tab=everyone">Find people</a></p>'}
      <p class="notice" id="rec-msg" hidden></p>
      <div class="actions">
        <button type="button" class="btn btn-ghost" data-close>${people.length ? 'Cancel' : 'Close'}</button>
        ${people.length ? '<button type="submit" class="btn btn-green">Send</button>' : ''}
      </div>
    </form>`;
  document.body.append(d);
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => d.remove());
  d.querySelector('[data-close]').onclick = () => d.close();

  d.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const say = (text) => {
      const m = d.querySelector('#rec-msg');
      m.textContent = text;
      m.className = 'notice notice-error';
      m.hidden = false;
    };
    const boxes = [...d.querySelectorAll('.rec-people input:checked')];
    if (!boxes.length) return say('Pick at least one person.');
    const send = d.querySelector('[type="submit"]');
    send.disabled = true;
    const note = d.querySelector('#rec-note-text').value.trim() || null;
    const done = [];
    for (const box of boxes) {
      const who = people.find((p) => p.id === box.value);
      const name = who.display_name || who.username;
      const { data, error } = await supabase.rpc('recommend_episode', { p_to: who.id, p_episode: ep.id, p_note: note });
      if (error) { send.disabled = false; return say(`Couldn't send it to ${name}: ${error.message}`); }
      box.checked = false; // a retry after an error won't send it twice
      done.push(data?.rating != null ? `${name} already rated it ${stars(Number(data.rating))}` : `Sent to ${name}`);
    }
    d.close();
    toast(`${done.join('. ')}.`);
  });

  d.showModal();
}

/** Recommendations waiting for you: not rated yet. episodeId narrows it to one episode. */
export async function recommendationsFor(me, episodeId = null) {
  let q = supabase.from('recommendations')
    .select('episode_id, note, from:profiles!recommendations_from_user_fkey(username, display_name, avatar_color, avatar_icon)')
    .eq('to_user', me).is('rated_at', null).order('created_at', { ascending: false });
  if (episodeId) q = q.eq('episode_id', episodeId);
  const { data } = await q;
  return data || [];
}
