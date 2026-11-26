// club.html: Butters' Book Club. Everyone gets the same episode each week (it's not a book, nobody has told him); Butters reviews it first.
import { initPage, logEpisode } from '../layout.js';
import { supabase } from '../supabase.js';
import { $, esc, epCode, avatarHTML, formatDate, stars, toast } from '../ui.js';
import { buttersReview, buttersComment } from '../butters.js';
import { loadAllEpisodes, thumbHTML, cardHTML, myLogMap } from '../episodes.js';
import { weeklyPick, weekStart } from '../club.js';
import { reviewHTML, reviewExtras, wireReviewLikes, followingIds, REVIEW_SELECT } from '../social.js';
import { episodeAverages } from '../insights.js';

const { user } = await initPage({ title: "Butters' Book Club", auth: 'required' });
const root = $('#club');

// About 1 in 5 reviews get a reply from Butters, tucked under the review text.
function withButters(html, r) {
  const c = buttersComment(r);
  if (!c) return html;
  const reply = `
        <div class="butters-reply">
          ${avatarHTML({ display_name: 'Butters', avatar_color: '#f5c518' }, 24)}
          <div><span class="who">Butters Stotch <span class="host-tag">📚 Host</span></span><p>${esc(c)}</p></div>
        </div>`;
  return html.replace(/<\/div>\s*<\/article>\s*$/, `${reply}</div></article>`);
}

async function render() {
  const [all, mine, friends] = await Promise.all([loadAllEpisodes(), myLogMap(user.id), followingIds(user.id)]);
  const ep = weeklyPick(all);
  if (!ep) {
    root.innerHTML = '<p class="empty">No episodes yet. Ask your admin to run the import.</p>';
    root.removeAttribute('aria-busy');
    return;
  }
  const start = weekStart();
  const next = weekStart(1);
  const daysLeft = Math.max(1, Math.ceil((next - Date.now()) / 86400000));

  const weekKey = start.toISOString().slice(0, 10);
  const [{ data: logs }, avgs, { data: tagRows }, { data: bLikes }] = await Promise.all([
    supabase.from('logs').select(REVIEW_SELECT).eq('episode_id', ep.id).gte('created_at', start.toISOString()).order('created_at', { ascending: false }),
    episodeAverages(),
    supabase.from('episode_tags').select('tags(name)').eq('episode_id', ep.id),
    supabase.from('butters_likes').select('user_id').eq('week_start', weekKey),
  ]);
  const butters = buttersReview(ep, (tagRows || []).map((t) => t.tags?.name).filter(Boolean), start);
  const bCount = (bLikes || []).length;
  const bLiked = (bLikes || []).some((l) => l.user_id === user.id);
  const buttersHTML = `
    <article class="review butters-review">
      ${avatarHTML({ display_name: 'Butters', avatar_color: '#f5c518' }, 36)}
      <div class="review-body">
        <div class="review-meta">
          <span>Review by <strong>Butters Stotch</strong></span>
          <span class="host-tag">📚 Book Club host</span>
          <span class="rating">${stars(butters.rating)}</span>
          <span class="heart" aria-label="Liked">♥</span>
        </div>
        <p>${esc(butters.text)}</p>
        <div class="review-foot">
          <button type="button" class="link-button review-like" id="butters-like" aria-pressed="${bLiked}">${bLiked ? '♥ Liked' : '♡ Like review'}</button>
          <span>${bCount} like${bCount === 1 ? '' : 's'}</span>
        </div>
      </div>
    </article>`;
  const watchers = [...new Map((logs || []).map((l) => [l.user_id, l.profiles])).values()];
  const reviews = (logs || []).filter((l) => l.review && l.review.trim());
  const extras = await reviewExtras(reviews.map((r) => r.id), user.id);
  const iWatched = (logs || []).some((l) => l.user_id === user.id);
  const past = [-1, -2, -3, -4].map((o) => ({ ep: weeklyPick(all, o), start: weekStart(o) })).filter((x) => x.ep);

  root.innerHTML = `
    <div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px">Week of ${esc(formatDate(start.toISOString().slice(0, 10)))} · new pick in ${daysLeft} day${daysLeft === 1 ? '' : 's'}</div>
      <h1 class="cut" style="margin:0;color:var(--white);font-size:clamp(30px,4vw,44px)">Butters' Book Club</h1>
    </div>
    <section class="two-col" style="align-items:center">
      <a href="episode.html?id=${ep.id}" style="display:block">${thumbHTML(ep, { size: 'w780' })}</a>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="color:var(--muted);font-size:13px">${esc(epCode(ep))}${ep.air_date ? ` · ${esc(ep.air_date.slice(0, 4))}` : ''}</div>
        <h2 class="cut" style="margin:0;color:var(--white);font-size:32px;line-height:1.1"><a href="episode.html?id=${ep.id}" style="color:inherit">${esc(ep.title)}</a></h2>
        ${ep.overview ? `<p style="margin:0;color:var(--text-soft)">${esc(ep.overview)}</p>` : ''}
        <div class="toolbar">
          <button type="button" class="btn btn-green" id="club-log">${iWatched ? 'Log it again' : "I watched it, let's talk"}</button>
          ${mine.has(ep.id) && !iWatched ? '<span class="result-count">You\'ve seen it before, but not this week.</span>' : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${watchers.length ? `${watchers.map((p) => `<a href="profile.html?u=${encodeURIComponent(p?.username || '')}" title="${esc(p?.display_name || p?.username)}">${avatarHTML(p, 30)}</a>`).join('')}
            <span class="result-count">${watchers.length} watched this week</span>`
            : '<span class="result-count">Nobody has watched it this week yet. Be the first, dude.</span>'}
        </div>
      </div>
    </section>
    <section>
      <div class="section-head"><h2>This week's reviews</h2></div>
      <div class="reviews" id="club-reviews">${buttersHTML}${reviews.length
        ? reviews.map((r) => withButters(reviewHTML(r, { me: user.id, extras, friends, avgs }), r)).join('')
        : '<p class="empty">Nobody else has reviewed it yet. Don\'t leave Butters hanging!</p>'}</div>
    </section>
    <section>
      <div class="section-head"><h2>Previous weeks</h2></div>
      <div class="ep-grid">${past.map((x) => cardHTML(x.ep, { mine: mine.get(x.ep.id), meta: `Week of ${formatDate(x.start.toISOString().slice(0, 10), { month: 'short', day: 'numeric' })}` })).join('')}</div>
    </section>`;
  root.removeAttribute('aria-busy');

  $('#club-log').onclick = () => logEpisode({ episode: ep, rewatch: mine.has(ep.id) });
  wireReviewLikes($('#club-reviews'), render);
  $('#butters-like').onclick = async (e) => {
    const b = e.currentTarget;
    const liked = b.getAttribute('aria-pressed') === 'true';
    b.disabled = true;
    const { error } = liked
      ? await supabase.from('butters_likes').delete().eq('week_start', weekKey).eq('user_id', user.id)
      : await supabase.from('butters_likes').insert({ week_start: weekKey });
    if (error) { b.disabled = false; return toast(error.message); }
    toast(liked ? "Oh. That's okay. I'll just go sit by myself for a bit." : 'Gee, thanks! Nobody ever likes my stuff!');
    render();
  };
}

await render();
window.addEventListener('parkboxd:logged', render);
