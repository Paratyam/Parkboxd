// club.html: Butters' Book Club. Everyone gets the same episode each week (it's not a book, nobody has told him); Butters reviews it first.
import { pcTalkButtonHTML } from '../pc.js?v=20261127211246';
import { initPage, logEpisode } from '../layout.js?v=20261127211246';
import { supabase } from '../supabase.js?v=20261127211246';
import { $, esc, epCode, avatarHTML, formatDate, stars, toast, params } from '../ui.js?v=20261127211246';
import { buttersReview, buttersComment, buttersLikes } from '../butters.js?v=20261127211246';
import { loadAllEpisodes, thumbHTML, cardHTML, myLogMap } from '../episodes.js?v=20261127211246';
import { weekStart, loadPicks, weekKey as keyOf, CLUB_START } from '../club.js?v=20261127211246';
import { booksSVG } from '../art.js?v=20261127211246';
import { attendance, attendanceHTML, clubOffsets } from '../attendance.js?v=20261127211246';
import { BUTTERS_NOTES } from '../data/butters-notes.js?v=20261127211246';
import { BUTTERS } from '../butters-profile.js?v=20261127211246';
import { threadHTML, wireThread } from '../comments.js?v=20261127211246';

import { clubGuest } from '../club-guest.js?v=20261127211246';
import { guestReviewHTML, loadGuestExtras, wireGuestReviews } from '../guest-reviews.js?v=20261127211246';

const SHELF = 12; // past weeks on the shelf
import { reviewHTML, reviewExtras, wireReviewLikes, followingIds, REVIEW_SELECT } from '../social.js?v=20261127211246';
import { episodeAverages } from '../insights.js?v=20261127211246';

const { user } = await initPage({ title: "Butters' Book Club", auth: 'required' });
const root = $('#club');

// About 1 in 5 reviews get a reply from Butters, tucked under the review text.
function withButters(html, r) {
  // Butters likes every review his best friend writes (and, rarely, other positive ones), and says so.
  if (buttersLikes(r)) {
    html = html.replace('<div class="review-foot">', '<div class="review-foot"><span class="butters-liked" title="Butters liked this review">♥ Liked by Butters</span>');
  }
  const c = buttersComment(r);
  if (!c) return html;
  const reply = `
        <div class="butters-reply">
          <a href="profile.html?u=butters" aria-hidden="true" tabindex="-1">${avatarHTML(BUTTERS, 24)}</a>
          <div><span class="who"><a href="profile.html?u=butters" style="color:inherit">Butters Stotch</a> <span class="host-tag">📚 Host</span></span><p>${esc(c)}</p>${pcTalkButtonHTML('butters', c)}</div>
        </div>`;
  return html.replace(/<\/div>\s*<\/article>\s*$/, `${reply}</div></article>`);
}

async function render() {
  const [all, mine, friends] = await Promise.all([loadAllEpisodes(), myLogMap(user.id), followingIds(user.id)]);
  // ?week=YYYY-MM-DD shows a past week's page: its book, Butters' note and that week's reviews.
  const asked = params.get('week');
  const viewOffset = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked >= CLUB_START && asked < keyOf(0)
    ? Math.round((Date.parse(`${asked}T00:00:00Z`) - weekStart(0).getTime()) / (7 * 86400000)) : 0;
  const archive = viewOffset < 0;
  // The week on screen, the shelf (last SHELF weeks), and next week (the one being voted on).
  const picks = await loadPicks(all, [viewOffset, ...Array.from({ length: SHELF }, (_, i) => -(i + 1)), 1]);
  const ep = picks[0].pick;
  const upcoming = picks[picks.length - 1];
  if (!ep) {
    root.innerHTML = '<p class="empty">No episodes yet. Ask your admin to run the import.</p>';
    root.removeAttribute('aria-busy');
    return;
  }
  const start = picks[0].start;
  const next = picks[0].end;
  const daysLeft = Math.max(1, Math.ceil((next - Date.now()) / 86400000));
  const weekLabel = formatDate(start.toISOString().slice(0, 10), { month: 'long', day: 'numeric' });
  if (archive) document.title = `Book Club: week of ${weekLabel} · Parkboxd`;

  const weekKey = start.toISOString().slice(0, 10);
  const [{ data: logs }, avgs, { data: tagRows }, { data: bLikes }] = await Promise.all([
    supabase.from('logs').select(REVIEW_SELECT).eq('episode_id', ep.id).gte('created_at', start.toISOString()).lt('created_at', next.toISOString()).order('created_at', { ascending: false }),
    episodeAverages(),
    supabase.from('episode_tags').select('tags(name)').eq('episode_id', ep.id),
    supabase.from('butters_likes').select('user_id').eq('week_start', weekKey),
  ]);
  const butters = buttersReview(ep, (tagRows || []).map((t) => t.tags?.name).filter(Boolean), start, BUTTERS_NOTES[`${ep.season}.${ep.number}`]);
  const { data: bComments } = await supabase.from('butters_comments')
    .select('id, user_id, parent_id, body, created_at, profiles(username, display_name, avatar_color, avatar_icon)')
    .eq('week_start', weekKey).order('created_at');
  const bCount = (bLikes || []).length;
  const bLiked = (bLikes || []).some((l) => l.user_id === user.id);
  const buttersHTML = `
    <article class="review butters-review">
      <span class="club-tape small" aria-hidden="true"></span>
      <span class="butters-star" aria-hidden="true">⭐</span>
      <a href="profile.html?u=butters" aria-hidden="true" tabindex="-1">${avatarHTML(BUTTERS, 36)}</a>
      <div class="review-body">
        <div class="review-meta">
          <span>Review by <a href="profile.html?u=butters"><strong>Butters Stotch</strong></a></span>
          <span class="host-tag">📚 Book Club host</span>
          <span class="rating">${stars(butters.rating)}</span>
          <span class="heart" aria-label="Liked">♥</span>
        </div>
        <p>${esc(butters.text)}</p>
        ${pcTalkButtonHTML('butters', butters.text)}
        <div class="review-foot">
          <button type="button" class="link-button review-like" id="butters-like" aria-pressed="${bLiked}">${bLiked ? '♥ Liked' : '♡ Like review'}</button>
          <span>${bCount} like${bCount === 1 ? '' : 's'} · ${(bComments || []).length} comment${(bComments || []).length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </article>
    <div class="butters-thread" id="butters-thread">
      ${bComments?.length ? threadHTML(bComments, { me: user.id }) : ''}
      <form class="butters-comment-form" id="butters-comment-form" novalidate>
        <label class="visually-hidden" for="butters-comment">Comment on Butters' review</label>
        <textarea id="butters-comment" maxlength="2000" rows="2" placeholder="Say something nice to Butters… or about his review"></textarea>
        <button type="submit" class="btn btn-green">Comment</button>
      </form>
    </div>`;
  // This week's guest reader (a character other than Butters).
  const guest = { ...clubGuest(ep, start), tag: archive ? "🎟️ That week's guest" : "🎟️ This week's guest" };
  const guestExtras = await loadGuestExtras([guest], user.id);
  const watchers = [...new Map((logs || []).map((l) => [l.user_id, l.profiles])).values()];
  const reviews = (logs || []).filter((l) => l.review && l.review.trim());
  const extras = await reviewExtras(reviews.map((r) => r.id), user.id);
  const iWatched = (logs || []).some((l) => l.user_id === user.id);
  const past = picks.slice(1, 1 + SHELF).filter((p) => p.real).map((p) => ({ ep: p.pick, key: p.key, start: p.start, end: p.end })).filter((x) => x.ep);
  // Club average: ratings members gave each past pick during its week.
  const { data: pastLogs } = past.length
    ? await supabase.from('logs').select('user_id, episode_id, rating, created_at')
      .in('episode_id', past.map((x) => x.ep.id)).gte('created_at', past[past.length - 1].start.toISOString()).limit(2000)
    : { data: [] };
  const clubStats = (x) => {
    const inWeek = (pastLogs || []).filter((l) => l.episode_id === x.ep.id && new Date(l.created_at) >= x.start && new Date(l.created_at) < x.end);
    const latest = new Map();
    for (const l of inWeek) if (l.rating != null) latest.set(l.user_id, Number(l.rating));
    const r = [...latest.values()];
    return { members: new Set(inWeek.map((l) => l.user_id)).size, avg: r.length ? r.reduce((a, b) => a + b, 0) / r.length : null };
  };
  const pastMeta = (x) => {
    const s = clubStats(x);
    const week = `Week of ${formatDate(x.start.toISOString().slice(0, 10), { month: 'short', day: 'numeric' })}`;
    return s.avg != null ? `${week} · club ★${s.avg.toFixed(1)} (${s.members})` : s.members ? `${week} · ${s.members} read it` : `${week} · nobody read it`;
  };
  // Your attendance streak (this week's page only).
  let attendHTML = '';
  if (!archive) {
    const clubPicks = await loadPicks(all, clubOffsets());
    const { data: myLogs } = await supabase.from('logs').select('episode_id, created_at').eq('user_id', user.id)
      .in('episode_id', clubPicks.filter((p) => p.real && p.pick).map((p) => p.pick.id)).limit(2000);
    attendHTML = attendanceHTML(attendance(clubPicks, myLogs || []), { mine: true, card: true });
  }
  // Next week's vote.
  const myVote = upcoming.votes.find((v) => v.user_id === user.id)?.episode_id ?? null;
  const totalVotes = upcoming.votes.length;
  const voteHTML = upcoming.candidates.length ? `
    <section class="club-vote">
      <div class="section-head"><h2>🗳️ Vote for next week's book</h2><span class="result-count">${totalVotes} vote${totalVotes === 1 ? '' : 's'} · closes when the new book starts</span></div>
      <p class="club-vote-butters">“I picked three and I couldn't decide, so you fellas decide! If nobody votes, I get to pick. I'll pick the first one.” <span>— Butters</span></p>
      <div class="club-vote-grid">${upcoming.candidates.map((c, i) => {
        const n = upcoming.counts.get(c.id) || 0;
        const pct = totalVotes ? Math.round((n / totalVotes) * 100) : 0;
        const leading = totalVotes && upcoming.pick?.id === c.id;
        return `<div class="club-vote-card${myVote === c.id ? ' mine' : ''}${leading ? ' leading' : ''}">
          ${leading ? '<span class="club-vote-flag cut">📈 Leading</span>' : i === 0 && !totalVotes ? '<span class="club-vote-flag cut">Butters\' fave</span>' : ''}
          <a href="episode.html?id=${c.id}" tabindex="-1" aria-hidden="true">${thumbHTML(c, { showTitle: false })}</a>
          <a href="episode.html?id=${c.id}" class="club-vote-title">${esc(c.title)}</a>
          <span class="club-vote-code">${esc(epCode(c))}${mine.has(c.id) ? ' · you\'ve seen it' : ''}</span>
          <div class="club-vote-bar" role="img" aria-label="${n} votes"><div style="width:${pct}%"></div></div>
          <button type="button" class="btn ${myVote === c.id ? 'btn-green' : 'btn-ghost'}" data-vote="${c.id}">${myVote === c.id ? '✓ Your vote' : 'Vote'} · ${n}</button>
        </div>`;
      }).join('')}</div>
    </section>` : '';

  const newPickDay = new Date(next).toLocaleDateString(undefined, { weekday: 'long' });
  root.innerHTML = `
    <section class="club-hero">
      <span class="club-tape" aria-hidden="true"></span>
      <span class="club-hero-art">${booksSVG()}</span>
      <div class="club-head">
        <span class="club-kicker">${archive ? 'From the Book Club archives' : 'South Park Elementary Library presents'}</span>
        <h1 class="club-title cut">Butters' Book Club</h1>
        <p class="club-sub">${archive
          ? `Week of ${esc(weekLabel)}. The discussion is closed, but the reviews live forever. <a href="club.html">Go to this week's book →</a>`
          : `It's episodes, not books. Nobody has the heart to tell him. Week of ${esc(weekLabel)}.`}</p>
      </div>
      ${archive ? `<div class="club-due archived"><span>Returned</span><b>✓</b><span>${esc(formatDate(next.toISOString().slice(0, 10), { month: 'short', day: 'numeric' }))}</span></div>`
        : `<div class="club-due" title="New pick on ${esc(newPickDay)}">
        <span>Due back in</span>
        <b>${daysLeft}</b>
        <span>day${daysLeft === 1 ? '' : 's'}</span>
      </div>`}
    </section>
    <section class="club-book">
      <a href="episode.html?id=${ep.id}" class="club-cover">
        ${thumbHTML(ep, { size: 'w780', showTitle: false })}
        <span class="club-ribbon cut">${archive ? 'Past read' : "This week's book"}</span>
        <span class="club-sticker" aria-hidden="true">⭐<small>Butters' pick</small></span>
      </a>
      <div class="club-card">
        <div class="club-code">${esc(epCode(ep))}${ep.air_date ? ` · ${esc(ep.air_date.slice(0, 4))}` : ''}</div>
        <h2 class="cut"><a href="episode.html?id=${ep.id}">${esc(ep.title)}</a></h2>
        ${ep.overview ? `<p class="club-blurb">${esc(ep.overview)}</p>` : ''}
        <div class="toolbar">
          ${archive ? "<a class=\"btn btn-green\" href=\"club.html\">See this week's book</a>" : `<button type="button" class="btn btn-green" id="club-log">${iWatched ? 'Log it again' : "I read it! Let's talk"}</button>`}
          ${!archive && mine.has(ep.id) && !iWatched ? '<span class="result-count">You\'ve read it before, but not this week.</span>' : ''}
        </div>
        <div class="club-members">
          <span class="club-members-label">Checked out ${archive ? 'that' : 'this'} week</span>
          <div>${watchers.length ? `${watchers.map((p) => `<a href="profile.html?u=${encodeURIComponent(p?.username || '')}" title="${esc(p?.display_name || p?.username)}">${avatarHTML(p, 30)}</a>`).join('')}
            <span class="result-count">${watchers.length} member${watchers.length === 1 ? '' : 's'}</span>`
            : '<span class="result-count">Nobody yet. Be the first, Butters is waiting!</span>'}</div>
        </div>
      </div>
    </section>
    ${attendHTML ? `<section class="library-card"><h2 class="cut">Your library card</h2>${attendHTML}</section>` : ''}
    <section class="area-talk">
      <div class="section-head"><h2>📝${archive ? 'That' : 'This'} week's discussion</h2></div>
      <div class="reviews" id="club-reviews">${buttersHTML}${guestReviewHTML(guest, guestExtras, user.id)}${reviews.length
        ? reviews.map((r) => withButters(reviewHTML(r, { me: user.id, extras, friends, avgs }), r)).join('')
        : `<p class="empty">${archive ? 'Nobody else reviewed it that week. Butters had the whole discussion to himself.' : 'Nobody else has reviewed it yet. Don\'t leave Butters hanging!'}</p>`}</div>
    </section>
    ${archive ? "" : voteHTML}
    <section class="area-shelf">
      <div class="section-head"><h2>📚 Past reads</h2></div>
      ${past.length
        ? `<div class="club-shelf"><div class="ep-grid">${past.map((x) => cardHTML(x.ep, { mine: mine.get(x.ep.id), meta: pastMeta(x), href: `club.html?week=${x.key}`, current: archive && x.key === weekKey })).join('')}</div></div>`
        : "<div class=\"club-shelf\"><p class=\"empty\" style=\"margin:0\">The shelf is empty! This is the club's very first week. Every book we read goes up here, so make it a good one.</p></div>"}
    </section>`;
  root.classList.toggle('is-archive', archive);
  root.removeAttribute('aria-busy');

  $('#club-log')?.addEventListener('click', () => logEpisode({ episode: ep, rewatch: mine.has(ep.id) }));
  wireReviewLikes($('#club-reviews'), render);
  wireGuestReviews($('#club-reviews'), [guest], guestExtras, render);
  // Comments (and replies) on Butters' review.
  wireThread($('#butters-thread'), { table: 'butters_comments', extra: { week_start: weekKey }, comments: bComments || [], onChange: render });
  $('#butters-comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = $('#butters-comment').value.trim();
    if (!body) return toast('Write something first. Butters is waiting!');
    const btn = e.submitter;
    if (btn) btn.disabled = true;
    const { error } = await supabase.from('butters_comments').insert({ week_start: weekKey, body });
    if (btn) btn.disabled = false;
    if (error) return toast(error.message);
    render();
  });
  root.querySelectorAll('[data-vote]').forEach((b) => b.addEventListener('click', async () => {
    const id = Number(b.dataset.vote);
    root.querySelectorAll('[data-vote]').forEach((x) => { x.disabled = true; });
    const { error } = myVote === id
      ? await supabase.from('club_votes').delete().eq('week_start', upcoming.key).eq('user_id', user.id)
      : await supabase.from('club_votes').upsert({ user_id: user.id, week_start: upcoming.key, episode_id: id }, { onConflict: 'user_id,week_start' });
    if (error) { root.querySelectorAll('[data-vote]').forEach((x) => { x.disabled = false; }); return toast(error.message); }
    toast(myVote === id ? "Aw, you took your vote back. That's okay, I won't cry." : 'Gee, thanks for voting! Democracy is swell!');
    render();
  }));
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
