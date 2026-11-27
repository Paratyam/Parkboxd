// Follows, review likes and the shared review block.
import { supabase } from './supabase.js?v=20261127150845';
import { esc, epCode, stars, avatarHTML, formatDate } from './ui.js?v=20261127150845';
import { thumbHTML } from './episodes.js?v=20261127150845';
import { line } from './jokes.js?v=20261127150845';
import { isHotTake } from './insights.js?v=20261127150845';
import { buttersLikes } from './butters.js?v=20261127150845';
import './share.js?v=20261127150845';
import { pcButtonHTML, installPC } from './pc.js?v=20261127150845';

installPC(); // PC Principal's "PC it" toggle on review cards

export async function followingIds(userId) {
  const { data } = await supabase.from('follows').select('followee_id').eq('follower_id', userId);
  return new Set((data || []).map((r) => r.followee_id));
}

export async function setFollow(targetId, follow) {
  return follow
    ? supabase.from('follows').insert({ followee_id: targetId })
    : supabase.from('follows').delete().eq('followee_id', targetId).eq('follower_id', (await supabase.auth.getUser()).data.user.id);
}

export function followButtonHTML(targetId, following) {
  return `<button type="button" class="btn ${following ? 'btn-ghost' : 'btn-green'}" data-follow="${targetId}" aria-pressed="${following}">${following ? 'Following' : 'Follow'}</button>`;
}

// Wire every [data-follow] button inside root. onChange runs after each toggle.
export function wireFollowButtons(root, onChange) {
  root.querySelectorAll('[data-follow]').forEach((b) => b.addEventListener('click', async () => {
    const following = b.getAttribute('aria-pressed') === 'true';
    if (following && !confirm(line('unfollow'))) return;
    b.disabled = true;
    const { error } = await setFollow(b.dataset.follow, !following);
    b.disabled = false;
    if (error) return alert(error.message);
    b.setAttribute('aria-pressed', String(!following));
    b.textContent = following ? 'Follow' : 'Following';
    b.className = `btn ${following ? 'btn-green' : 'btn-ghost'}`;
    onChange?.();
  }));
}

/** Like and comment counts for a set of logs, plus which ones the viewer liked. */
export async function reviewExtras(logIds, myId) {
  const out = { likes: new Map(), comments: new Map(), mine: new Set() };
  if (!logIds.length) return out;
  const [{ data: likes }, { data: comments }] = await Promise.all([
    supabase.from('review_likes').select('log_id, user_id').in('log_id', logIds),
    supabase.from('comments').select('log_id').in('log_id', logIds),
  ]);
  for (const l of likes || []) {
    out.likes.set(l.log_id, (out.likes.get(l.log_id) || 0) + 1);
    if (l.user_id === myId) out.mine.add(l.log_id);
  }
  for (const c of comments || []) out.comments.set(c.log_id, (out.comments.get(c.log_id) || 0) + 1);
  return out;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * One review.
 *   r: log row with profiles(...) and optionally episodes(...)
 *   opts: { me, extras, friends (Set of ids), showEpisode, full }
 */
export function reviewHTML(r, { me, extras, friends, avgs, showEpisode = false, full = false } = {}) {
  const hot = isHotTake(r.rating, avgs?.get(r.episode_id ?? r.episodes?.id));
  // Butters (built-in, not a real member) adds a like to some reviews: see buttersLikes().
  const likes = (extras?.likes.get(r.id) || 0) + (buttersLikes(r) ? 1 : 0);
  const comments = extras?.comments.get(r.id) || 0;
  const liked = extras?.mine.has(r.id);
  const own = r.user_id === me;
  const text = !full && r.review.length > 400 ? `${r.review.slice(0, 400)}…` : r.review;
  const who = r.profiles?.display_name || r.profiles?.username;
  const ep = r.episodes;

  return `
    <article class="review">
      ${showEpisode && ep
        ? `<a href="episode.html?id=${ep.id}" style="flex:0 0 110px" aria-hidden="true" tabindex="-1">${thumbHTML(ep, { showTitle: false })}</a>`
        : avatarHTML(r.profiles, 36)}
      <div class="review-body">
        ${showEpisode && ep ? `<div style="font-size:14px"><a class="ep-link" href="episode.html?id=${ep.id}">${esc(ep.title)}</a> <span style="color:var(--muted)">${esc(epCode(ep))}</span></div>` : ''}
        <div class="review-meta">
          ${showEpisode ? avatarHTML(r.profiles, 22) : ''}
          <span>${showEpisode ? '' : 'Review by '}<a href="profile.html?u=${encodeURIComponent(r.profiles?.username || '')}"><strong>${esc(who)}</strong></a></span>
          ${friends?.has(r.user_id) ? '<span class="friend-tag">Friend</span>' : ''}
          <span class="rating">${stars(r.rating)}</span>
          ${hot ? `<span class="hot-tag" title="${Math.abs(Number(r.rating) - avgs.get(r.episode_id ?? r.episodes?.id).avg).toFixed(1)}★ away from the average">🌶️ Hot take</span>` : ''}
          ${r.liked ? '<span class="heart" aria-label="Liked">♥</span>' : ''}
          ${r.is_rewatch ? '<span>Rewatch</span>' : ''}
          ${r.watched_on ? `<span>${esc(formatDate(r.watched_on, { month: 'short', day: 'numeric', year: 'numeric' }))}</span>` : ''}
        </div>
        <p>${esc(text)}</p>
        <div class="review-foot">
          ${own
            ? `<button type="button" class="link-button review-edit" data-edit-review="${r.id}">✎ Edit review</button>
              <button type="button" class="link-button" data-share-review="${r.id}">🖼️ Share review</button>`
            : `<button type="button" class="link-button review-like" data-like-log="${r.id}" aria-pressed="${!!liked}">${liked ? '♥ Liked' : '♡ Like review'}</button>`}
          <a href="review.html?id=${r.id}">${plural(likes, 'like')} · ${plural(comments, 'comment')}</a>
          ${pcButtonHTML(r.rating)}
        </div>
      </div>
    </article>`;
}

// Wire [data-like-log] buttons. onChange runs after each toggle so counts can refresh.
export function wireReviewLikes(root, onChange) {
  root.querySelectorAll('[data-like-log]').forEach((b) => b.addEventListener('click', async () => {
    const id = Number(b.dataset.likeLog);
    const liked = b.getAttribute('aria-pressed') === 'true';
    b.disabled = true;
    const { error } = liked
      ? await supabase.from('review_likes').delete().eq('log_id', id).eq('user_id', (await supabase.auth.getUser()).data.user.id)
      : await supabase.from('review_likes').insert({ log_id: id });
    b.disabled = false;
    if (error) return alert(error.message);
    onChange?.();
  }));
  // Your own reviews: [data-edit-review] opens the log dialog on that log (save fires parkboxd:logged).
  root.querySelectorAll('[data-edit-review]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    const { data: log, error } = await supabase.from('logs')
      .select('*, episodes(id, kind, season, number, title, air_date, still_path)').eq('id', Number(b.dataset.editReview)).maybeSingle();
    b.disabled = false;
    if (error || !log) return alert(error?.message || "Couldn't find that review.");
    const { logEpisode } = await import('./layout.js?v=20261127150845');
    const changed = await logEpisode({ episode: log.episodes, log });
    if (changed) onChange?.();
  }));
}

export const REVIEW_SELECT = 'id, user_id, episode_id, rating, liked, review, is_rewatch, watched_on, created_at, profiles!logs_user_id_fkey(username, display_name, avatar_color, avatar_icon)';
