// review.html?id=LOG_ID: one review with its likes and comments.
import { initPage } from '../layout.js?v=20261127173208';
import { supabase } from '../supabase.js?v=20261127173208';
import { SITE_NAME } from '../config.js?v=20261127173208';
import { $, esc, params, avatarHTML, notify, toast } from '../ui.js?v=20261127173208';
import { reviewHTML, reviewExtras, wireReviewLikes, followingIds, REVIEW_SELECT } from '../social.js?v=20261127173208';
import { line } from '../jokes.js?v=20261127173208';
import { episodeAverages } from '../insights.js?v=20261127173208';
import { buttersLikes } from '../butters.js?v=20261127173208';
import { threadHTML, wireThread } from '../comments.js?v=20261127173208';

const { user } = await initPage({ title: 'Review', auth: 'required' });
const root = $('#review');
const id = Number(params.get('id'));

async function render() {
  const [{ data: r }, { data: comments }, friends] = await Promise.all([
    supabase.from('logs').select(`${REVIEW_SELECT}, episodes(id, kind, season, number, title, air_date, still_path)`).eq('id', id).maybeSingle(),
    supabase.from('comments').select('id, user_id, parent_id, body, created_at, profiles(username, display_name, avatar_color, avatar_icon)').eq('log_id', id).order('created_at'),
    followingIds(user.id),
  ]);
  if (!r) {
    root.innerHTML = `<div class="big-message"><h1 class="cut">Review not found</h1><p>It may have been deleted.</p><a class="btn btn-green" href="index.html">Home</a></div>`;
    root.removeAttribute('aria-busy');
    return;
  }
  const [extras, avgs] = await Promise.all([reviewExtras([r.id], user.id), episodeAverages()]);
  const who = r.profiles?.display_name || r.profiles?.username;
  document.title = `${who} on ${r.episodes.title} · ${SITE_NAME}`;
  const reviewOwner = r.user_id === user.id;

  const { data: likers } = await supabase.from('review_likes').select('profiles(username, display_name)').eq('log_id', id).limit(20);
  const likerNames = (likers || []).map((l) => l.profiles).filter(Boolean);
  if (buttersLikes(r)) likerNames.unshift({ username: 'butters', display_name: 'Butters' });

  root.innerHTML = `
    <div class="section-head"><h2>Review</h2><a href="episode.html?id=${r.episodes.id}">All reviews of this episode</a></div>
    ${r.review ? reviewHTML(r, { me: user.id, extras, friends, avgs, showEpisode: true, full: true }) : '<p class="empty">This log has no review text.</p>'}
    ${likerNames.length ? `<p style="margin:-8px 0 0;font-size:13px;color:var(--muted)">Liked by ${likerNames.map((p) =>
      `<a href="profile.html?u=${encodeURIComponent(p.username)}">${esc(p.display_name || p.username)}</a>`).join(', ')}</p>` : ''}

    <section>
      <div class="section-head"><h2>${(comments || []).length} ${(comments || []).length === 1 ? 'comment' : 'comments'}</h2></div>
      ${comments?.length ? threadHTML(comments, { me: user.id, canModerate: reviewOwner }) : `<p class="empty">${esc(line('commentsEmpty'))}</p>`}
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
  wireThread(root, { table: 'comments', extra: { log_id: id }, comments: comments || [], onChange: render });
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
