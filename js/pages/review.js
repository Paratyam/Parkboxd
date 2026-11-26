// review.html?id=LOG_ID: one review with its likes and comments.
import { initPage } from '../layout.js';
import { supabase } from '../supabase.js';
import { SITE_NAME } from '../config.js';
import { $, esc, params, avatarHTML, notify } from '../ui.js';
import { reviewHTML, reviewExtras, wireReviewLikes, followingIds, REVIEW_SELECT } from '../social.js';

const { user } = await initPage({ title: 'Review', auth: 'required' });
const root = $('#review');
const id = Number(params.get('id'));

async function render() {
  const [{ data: r }, { data: comments }, friends] = await Promise.all([
    supabase.from('logs').select(`${REVIEW_SELECT}, episodes(id, kind, season, number, title, air_date, still_path)`).eq('id', id).maybeSingle(),
    supabase.from('comments').select('id, user_id, body, created_at, profiles(username, display_name, avatar_color)').eq('log_id', id).order('created_at'),
    followingIds(user.id),
  ]);
  if (!r) {
    root.innerHTML = `<div class="big-message"><h1 class="cut">Review not found</h1><p>It may have been deleted.</p><a class="btn btn-green" href="index.html">Home</a></div>`;
    root.removeAttribute('aria-busy');
    return;
  }
  const extras = await reviewExtras([r.id], user.id);
  const who = r.profiles?.display_name || r.profiles?.username;
  document.title = `${who} on ${r.episodes.title} · ${SITE_NAME}`;
  const reviewOwner = r.user_id === user.id;

  const { data: likers } = await supabase.from('review_likes').select('profiles(username, display_name)').eq('log_id', id).limit(20);
  const likerNames = (likers || []).map((l) => l.profiles).filter(Boolean);

  root.innerHTML = `
    <div class="section-head"><h2>Review</h2><a href="episode.html?id=${r.episodes.id}">All reviews of this episode</a></div>
    ${r.review ? reviewHTML(r, { me: user.id, extras, friends, showEpisode: true, full: true }) : '<p class="empty">This log has no review text.</p>'}
    ${likerNames.length ? `<p style="margin:-8px 0 0;font-size:13px;color:var(--muted)">Liked by ${likerNames.map((p) =>
      `<a href="profile.html?u=${encodeURIComponent(p.username)}">${esc(p.display_name || p.username)}</a>`).join(', ')}</p>` : ''}

    <section>
      <div class="section-head"><h2>${(comments || []).length} ${(comments || []).length === 1 ? 'comment' : 'comments'}</h2></div>
      ${comments?.length ? `<ol class="comments">${comments.map((c) => `
        <li>
          ${avatarHTML(c.profiles, 32)}
          <div class="body">
            <div class="meta">
              <a href="profile.html?u=${encodeURIComponent(c.profiles?.username || '')}"><strong>${esc(c.profiles?.display_name || c.profiles?.username)}</strong></a>
              <time datetime="${esc(c.created_at)}">${esc(new Date(c.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))}</time>
              ${c.user_id === user.id || reviewOwner ? `<button type="button" class="link-button" data-delete="${c.id}" style="font-size:12px">Delete</button>` : ''}
            </div>
            <p>${esc(c.body)}</p>
          </div>
        </li>`).join('')}</ol>` : '<p class="empty">No comments yet. Start the argument.</p>'}
    </section>

    <form class="form" id="comment-form" novalidate>
      <div class="field">
        <label for="comment-body">Add a comment</label>
        <textarea id="comment-body" maxlength="2000" rows="3" placeholder="Be nice. Or don't, it's South Park."></textarea>
      </div>
      <p class="notice" id="comment-msg" hidden></p>
      <div><button type="submit" class="btn btn-green">Post comment</button></div>
    </form>`;
  root.removeAttribute('aria-busy');

  wireReviewLikes(root, render);
  root.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this comment? This can\'t be undone.')) return;
    const { error } = await supabase.from('comments').delete().eq('id', Number(b.dataset.delete));
    if (error) return alert(error.message);
    render();
  }));
  $('#comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = $('#comment-body').value.trim();
    if (!body) return notify($('#comment-msg'), 'Write something first.', 'error');
    const btn = e.submitter || $('#comment-form button[type="submit"]');
    btn.disabled = true;
    const { error } = await supabase.from('comments').insert({ log_id: id, body });
    btn.disabled = false;
    if (error) return notify($('#comment-msg'), error.message, 'error');
    render();
  });
}

await render();
