import { initPage, logEpisode } from '../layout.js';
import { supabase } from '../supabase.js';
import { $, esc, epCode, stars, avatarHTML } from '../ui.js';
import { loadAllEpisodes, myLogMap, cardHTML, thumbHTML, isAired } from '../episodes.js';

const { user, profile } = await initPage();
const root = $('#home');
const COLOURS = ['#3fb950', '#4a90e2', '#f5c518', '#f2711c', '#d63a3a'];

if (profile?.username) {
  const name = profile.display_name || profile.username;
  $('.hero h1').innerHTML = `Welcome back,<br>${esc(name)}.`;
  $('.hero p').textContent = 'What did you watch? Log it, rate it, and roast your friends\' takes.';
  $('#hero-actions').innerHTML = `
    <button type="button" class="paper btn-paper" style="background-color:var(--green);border:0;cursor:pointer" id="hero-log">+ Log an episode</button>
    <a class="paper btn-paper" style="background-color:var(--yellow)" href="episodes.html">Browse episodes</a>`;
  $('#hero-log').onclick = () => logEpisode();
  await renderHome();
  window.addEventListener('parkboxd:logged', renderHome);
}

async function renderHome() {
  const now = new Date();
  const [all, mine, { data: today }, { data: popular }, { data: reviews }] = await Promise.all([
    loadAllEpisodes(),
    myLogMap(user.id),
    supabase.rpc('aired_on_this_day', { p_month: now.getMonth() + 1, p_day: now.getDate() }),
    supabase.rpc('popular_episodes', { p_days: 7, p_limit: 12 }),
    supabase.from('logs')
      .select('id, rating, liked, review, episodes(id, kind, season, number, title, air_date, still_path), profiles(username, display_name, avatar_color)')
      .not('review', 'is', null).neq('review', '')
      .order('created_at', { ascending: false }).limit(5),
  ]);
  const byId = new Map(all.map((e) => [e.id, e]));

  // Aired on this day: pick the oldest so it feels like a classic.
  const anniversary = (today || []).filter((e) => e.air_date < `${now.getFullYear()}`)[0];
  const anniversaryHTML = anniversary ? `
    <div class="paper callout tilt-left" style="background-color:var(--yellow)">
      <div class="cut">Aired on this day</div>
      <p><strong>${esc(anniversary.title)}</strong> · ${esc(epCode(anniversary))} · first aired ${esc(anniversary.air_date.slice(0, 4))}, ${now.getFullYear() - Number(anniversary.air_date.slice(0, 4))} years ago.</p>
      <a href="episode.html?id=${anniversary.id}">Log it</a>
    </div>` : '';

  // Popular this week, or the newest aired episodes if nobody has logged anything yet.
  let popTitle = 'Popular this week';
  let popCards;
  if (popular?.length) {
    popCards = popular.map((p) => byId.get(p.episode_id)).filter(Boolean).map((e) => {
      const p = popular.find((x) => x.episode_id === e.id);
      return cardHTML(e, { mine: mine.get(e.id), rating: p.avg_rating ? Number(p.avg_rating) : null, meta: `${p.watcher_count} watched` });
    });
  } else {
    popTitle = 'Latest episodes';
    popCards = all.filter((e) => e.kind === 'episode' && isAired(e))
      .sort((a, b) => b.air_date.localeCompare(a.air_date)).slice(0, 6)
      .map((e) => cardHTML(e, { mine: mine.get(e.id), meta: e.air_date.slice(0, 4) }));
  }

  const reviewsHTML = reviews?.length
    ? reviews.map((r) => `
      <article class="review">
        <a href="episode.html?id=${r.episodes.id}" style="flex:0 0 110px" aria-hidden="true" tabindex="-1">${thumbHTML(r.episodes, { showTitle: false })}</a>
        <div class="review-body">
          <div style="font-size:14px"><a class="ep-link" href="episode.html?id=${r.episodes.id}">${esc(r.episodes.title)}</a> <span style="color:var(--muted)">${esc(epCode(r.episodes))}</span></div>
          <div class="review-meta">${avatarHTML(r.profiles, 22)}
            <a href="profile.html?u=${encodeURIComponent(r.profiles.username)}"><strong>${esc(r.profiles.display_name || r.profiles.username)}</strong></a>
            <span class="rating">${stars(r.rating)}</span>${r.liked ? '<span class="heart" aria-label="Liked">♥</span>' : ''}</div>
          <p>${esc(r.review.length > 280 ? `${r.review.slice(0, 280)}…` : r.review)}</p>
        </div>
      </article>`).join('')
    : '<p class="empty">No reviews yet. Log an episode and write one!</p>';

  // Season progress: seasons you've started (most recent activity first isn't tracked, so most complete first).
  const seasons = new Map();
  for (const e of all.filter((x) => x.kind === 'episode')) {
    const s = seasons.get(e.season) || { season: e.season, total: 0, watched: 0 };
    s.total++;
    if (mine.has(e.id)) s.watched++;
    seasons.set(e.season, s);
  }
  const started = [...seasons.values()].filter((s) => s.watched > 0).sort((a, b) => b.watched / b.total - a.watched / a.total).slice(0, 4);
  const totalEps = all.length;
  const totalSeen = all.filter((e) => mine.has(e.id)).length;
  const bar = (name, href, w, t, i) => `
    <div class="progress-row">
      <div class="label"><a href="${href}" style="color:var(--text);font-weight:600">${name}</a><span>${w} / ${t}</span></div>
      <div class="bar"><div style="width:${t ? Math.round((w / t) * 100) : 0}%;background:${COLOURS[i % 5]}"></div></div>
    </div>`;
  const progressHTML = `<div class="progress-list">
    ${started.map((s, i) => bar(`Season ${s.season}`, `seasons.html?s=${s.season}`, s.watched, s.total, i)).join('')}
    ${bar('Everything', 'seasons.html', totalSeen, totalEps, 4)}
    ${started.length ? '' : '<p class="empty" style="margin:0">Log something to start filling these up.</p>'}
  </div>`;

  root.innerHTML = `
    ${anniversaryHTML}
    <section>
      <div class="section-head"><h2>${popTitle}</h2><a href="episodes.html">More</a></div>
      <div class="ep-grid">${popCards.join('')}</div>
    </section>
    <div class="two-col">
      <section>
        <div class="section-head"><h2>Recent reviews</h2></div>
        <div class="reviews">${reviewsHTML}</div>
      </section>
      <aside style="display:flex;flex-direction:column;gap:32px">
        <section>
          <div class="section-head"><h2>Your progress</h2></div>
          ${progressHTML}
        </section>
        <section class="paper" style="background-color:var(--surface-2);padding:22px">
          <div class="cut" style="font-size:20px;color:var(--orange);margin-bottom:8px">Can't decide?</div>
          <p style="margin:0 0 14px;font-size:14px;color:var(--text-soft)">Get a random episode you haven't seen, or one you rated 4★ or higher.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-orange" id="rand-new">Unwatched</button>
            <button type="button" class="btn btn-outline" id="rand-fav">Rewatch a 4★+</button>
          </div>
          <p class="notice" id="rand-msg" hidden style="margin-top:12px"></p>
        </section>
      </aside>
    </div>`;

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  $('#rand-new').onclick = () => {
    const e = pick(all.filter((x) => isAired(x) && !mine.has(x.id)));
    if (e) location.href = `episode.html?id=${e.id}`;
    else showRand("You've seen literally everything. Go outside.");
  };
  $('#rand-fav').onclick = () => {
    const e = pick(all.filter((x) => (mine.get(x.id)?.rating ?? 0) >= 4));
    if (e) location.href = `episode.html?id=${e.id}`;
    else showRand('Rate a few episodes 4★ or higher first.');
  };
  function showRand(text) {
    const m = $('#rand-msg');
    m.textContent = text;
    m.className = 'notice notice-info';
    m.hidden = false;
  }
}
