// club.html: Episode of the week. Everyone gets the same episode; logs from this week show here.
import { initPage, logEpisode } from '../layout.js';
import { supabase } from '../supabase.js';
import { $, esc, epCode, avatarHTML, formatDate } from '../ui.js';
import { loadAllEpisodes, thumbHTML, cardHTML, myLogMap } from '../episodes.js';
import { weeklyPick, weekStart } from '../club.js';
import { reviewHTML, reviewExtras, wireReviewLikes, followingIds, REVIEW_SELECT } from '../social.js';
import { episodeAverages } from '../insights.js';

const { user } = await initPage({ title: 'Episode of the week', auth: 'required' });
const root = $('#club');

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

  const [{ data: logs }, avgs] = await Promise.all([
    supabase.from('logs').select(REVIEW_SELECT).eq('episode_id', ep.id).gte('created_at', start.toISOString()).order('created_at', { ascending: false }),
    episodeAverages(),
  ]);
  const watchers = [...new Map((logs || []).map((l) => [l.user_id, l.profiles])).values()];
  const reviews = (logs || []).filter((l) => l.review && l.review.trim());
  const extras = await reviewExtras(reviews.map((r) => r.id), user.id);
  const iWatched = (logs || []).some((l) => l.user_id === user.id);
  const past = [-1, -2, -3, -4].map((o) => ({ ep: weeklyPick(all, o), start: weekStart(o) })).filter((x) => x.ep);

  root.innerHTML = `
    <div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px">Week of ${esc(formatDate(start.toISOString().slice(0, 10)))} · new pick in ${daysLeft} day${daysLeft === 1 ? '' : 's'}</div>
      <h1 class="cut" style="margin:0;color:var(--white);font-size:clamp(30px,4vw,44px)">Episode of the week</h1>
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
      <div class="reviews" id="club-reviews">${reviews.length
        ? reviews.map((r) => reviewHTML(r, { me: user.id, extras, friends, avgs })).join('')
        : '<p class="empty">No reviews yet this week. Log it and say something!</p>'}</div>
    </section>
    <section>
      <div class="section-head"><h2>Previous weeks</h2></div>
      <div class="ep-grid">${past.map((x) => cardHTML(x.ep, { mine: mine.get(x.ep.id), meta: `Week of ${formatDate(x.start.toISOString().slice(0, 10), { month: 'short', day: 'numeric' })}` })).join('')}</div>
    </section>`;
  root.removeAttribute('aria-busy');

  $('#club-log').onclick = () => logEpisode({ episode: ep, rewatch: mine.has(ep.id) });
  wireReviewLikes($('#club-reviews'), render);
}

await render();
window.addEventListener('parkboxd:logged', render);
