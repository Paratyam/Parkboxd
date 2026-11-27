// notifications.html: who followed you, liked your reviews, or commented on them.
import { initPage, refreshBell } from '../layout.js?v=20261127073448';
import { supabase } from '../supabase.js?v=20261127073448';
import { $, esc, avatarHTML } from '../ui.js?v=20261127073448';
import { clubNotes, markClubNotesRead, hideClubNotes } from '../club-notes.js?v=20261127073448';

const { user } = await initPage({ title: 'Notifications', auth: 'required' });
const root = $('#notifs');

const ago = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  if (mins < 10080) return `${Math.round(mins / 1440)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

async function render() {
  const { data: dbItems } = await supabase.from('notifications')
    .select('id, type, read, created_at, log_id, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_color, avatar_icon), logs(id, episodes(id, title)), comments(body)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(60);
  // Book Club notes (new book, vote result) join the list, from Butters.
  const club = await clubNotes(user.id);
  const BUTTERS = { display_name: 'Butters', avatar_color: '#f5c518', avatar_icon: 'books' };
  const items = [...(dbItems || []), ...club.map((n) => ({ ...n, type: 'club', actor: BUTTERS }))]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const line = (n) => {
    const who = `<a href="profile.html?u=${encodeURIComponent(n.actor?.username || '')}"><strong>${esc(n.actor?.display_name || n.actor?.username || 'Someone')}</strong></a>`;
    const ep = n.logs?.episodes?.title ? `<a href="review.html?id=${n.log_id}">${esc(n.logs.episodes.title)}</a>` : 'an episode';
    if (n.type === 'club') return `<a href="${n.href}">${esc(n.text)}</a>`;
    if (n.type === 'follow') return `${who} followed you. New friend, or new stalker?`;
    if (n.type === 'review_like') return `${who} liked your review of ${ep}. ♥ What a t-t-terrific audience!`;
    if (n.type === 'reply') {
      const body = n.comments?.body || '';
      return `${who} replied to your comment on ${ep}.<span class="quote">“${esc(body.length > 160 ? `${body.slice(0, 160)}…` : body)}”</span>`;
    }
    if (n.type === 'comment') {
      const body = n.comments?.body || '';
      return `${who} commented on your review of ${ep}.<span class="quote">“${esc(body.length > 160 ? `${body.slice(0, 160)}…` : body)}”</span>`;
    }
    return '';
  };

  const unread = (items || []).filter((n) => !n.read).length;
  root.innerHTML = `
    <div class="section-head"><h2>Notifications</h2>
      ${items?.length ? '<button type="button" class="link-button" id="clear-all" style="font-size:13px">Clear all</button>' : ''}</div>
    ${items?.length
      ? `<ol class="notif-list">${items.map((n) => `
          <li class="${n.read ? '' : 'unread'}">
            ${avatarHTML(n.actor, 34)}
            <div class="body">${line(n)}</div>
            <time datetime="${esc(n.created_at)}">${ago(n.created_at)}</time>
          </li>`).join('')}</ol>`
      : '<p class="empty">No notifications. Nobody is talking about you. Yet.</p>'}`;
  root.removeAttribute('aria-busy');

  $('#clear-all')?.addEventListener('click', async () => {
    if (!confirm('Clear all notifications? They\'ll be gone for good.')) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    hideClubNotes(user.id, club);
    render();
    refreshBell();
  });

  // Seeing them counts as reading them. The highlight stays until you leave the page.
  if (unread) {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    markClubNotesRead(user.id, club);
    refreshBell();
  }
}

await render();
