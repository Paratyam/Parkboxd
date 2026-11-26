import { initPage } from '../layout.js';
import { supabase } from '../supabase.js';
import { SITE_NAME } from '../config.js';
import { thumbHTML } from '../episodes.js';
import { $, esc, params, avatarHTML, formatDate, stars, epCode, profileTabsHTML } from '../ui.js';
import { countRatings, histogramHTML } from '../histogram.js';

const { profile: me } = await initPage({ title: 'Profile', auth: 'required' });
const root = $('#profile');

const wanted = (params.get('u') || me.username).toLowerCase();
const { data: person } = await supabase.from('profiles').select('*').eq('username', wanted).maybeSingle();

if (!person) {
  document.title = `Not found · ${SITE_NAME}`;
  root.innerHTML = `
    <div class="big-message">
      <h1 class="cut">They killed ${esc(wanted)}!</h1>
      <p>Nobody on ${esc(SITE_NAME)} goes by that name. Maybe they never existed.</p>
      <a class="btn btn-green" href="profile.html">Back to your profile</a>
    </div>`;
  root.removeAttribute('aria-busy');
} else {
  await render(person);
  window.addEventListener('parkboxd:logged', () => render(person));
}

async function render(p) {
  const isMe = p.id === me.id;
  const name = p.display_name || p.username;
  document.title = `${name} · ${SITE_NAME}`;

  const [{ data: stats }, { data: recent }, { data: top4Eps }, { data: progress }, { data: ratings }] = await Promise.all([
    supabase.from('user_stats').select('*').eq('user_id', p.id).maybeSingle(),
    supabase.from('logs')
      .select('id, watched_on, rating, liked, is_rewatch, review, episodes(id, kind, season, number, title, air_date)')
      .eq('user_id', p.id)
      .order('watched_on', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(8),
    p.top4.length
      ? supabase.from('episodes').select('id, kind, season, number, title, air_date, still_path').in('id', p.top4)
      : Promise.resolve({ data: [] }),
    supabase.rpc('season_progress', { p_user: p.id }),
    supabase.from('latest_ratings').select('rating').eq('user_id', p.id).limit(5000),
  ]);
  const ratingCounts = countRatings((ratings || []).map((r) => r.rating));
  const ratedTotal = ratingCounts.reduce((a, b) => a + b, 0);
  const u = encodeURIComponent(p.username);

  const s = stats || {};
  const statItems = [
    ['Episodes', s.episodes_watched ?? 0],
    ['Hours', Math.round((s.minutes_watched ?? 0) / 60)],
    ['This year', s.logs_this_year ?? 0],
    ['Reviews', s.review_count ?? 0],
    ['Followers', s.followers ?? 0],
    ['Following', s.following ?? 0],
  ];

  const top4Html = [0, 1, 2, 3].map((i) => {
    const ep = (top4Eps || []).find((e) => e.id === p.top4[i]);
    if (!ep) {
      return isMe
        ? `<a class="top4-slot paper empty" href="settings.html#top4">+ Pick a favourite</a>`
        : '<div class="top4-slot paper empty">Empty slot</div>';
    }
    return `<a class="ep-card" href="episode.html?id=${ep.id}">${thumbHTML(ep, { size: 'w500' })}</a>`;
  }).join('');

  const diaryHtml = recent?.length
    ? `<ol class="diary">${recent.map((l) => `
        <li>
          <span class="date">${esc(formatDate(l.watched_on, { month: 'short', day: 'numeric', year: 'numeric' }))}</span>
          <span class="title"><a class="title" href="episode.html?id=${l.episodes?.id}">${esc(l.episodes?.title ?? 'Unknown episode')}</a><span class="code">${esc(epCode(l.episodes))}</span></span>
          <span class="rating" aria-label="${l.rating ? `${l.rating} stars` : 'No rating'}">${stars(l.rating)}</span>
          ${l.liked ? '<span class="heart" aria-label="Liked">♥</span>' : ''}
        </li>`).join('')}</ol>`
    : `<p class="empty">${isMe ? "You haven't logged anything yet. Hit \"+ Log\" up top to start." : `${esc(name)} hasn't logged anything yet.`}</p>`;

  const started = (progress || []).filter((r) => r.watched > 0);
  const progressHtml = started.length
    ? `<div class="progress-list">${started.map((r) => `
        <div class="progress-row">
          <div class="label"><a href="seasons.html?s=${r.season}" style="color:var(--text)">Season ${r.season}</a><span>${r.watched} / ${r.total}</span></div>
          <div class="bar"><div style="width:${Math.round((r.watched / r.total) * 100)}%;background:var(--green)"></div></div>
        </div>`).join('')}</div>
      <p style="margin:12px 0 0;font-size:13px"><a href="stats.html?u=${u}">All stats and season rankings →</a></p>`
    : '<p class="empty">No seasons started yet.</p>';

  root.innerHTML = `
    <section class="profile-head paper" aria-label="Profile">
      ${avatarHTML(p, 96)}
      <div class="who">
        <h1 class="cut">${esc(name)}</h1>
        <span class="handle">@${esc(p.username)} · joined ${esc(formatDate(p.created_at, { month: 'long', year: 'numeric' }))}</span>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
      </div>
      <div class="stats">${statItems.map(([label, n]) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`).join('')}</div>
      ${isMe ? `<div class="profile-actions" style="width:100%">
        <a class="btn btn-ghost" href="settings.html">Edit profile</a>
      </div>` : ''}
    </section>

    ${profileTabsHTML(p.username, 'profile')}

    <section>
      <div class="section-head"><h2>Favourite episodes</h2></div>
      <div class="top4">${top4Html}</div>
    </section>

    <div class="two-col">
      <section>
        <div class="section-head"><h2>Recent diary</h2><a href="diary.html?u=${encodeURIComponent(p.username)}">All</a></div>
        ${diaryHtml}
      </section>
      <aside style="display:flex;flex-direction:column;gap:32px">
        <section>
          <div class="section-head"><h2><a href="ratings.html?u=${u}" style="color:inherit">Ratings</a></h2><a href="ratings.html?u=${u}">${ratedTotal}</a></div>
          ${ratedTotal
            ? histogramHTML(ratingCounts, { href: (b) => `ratings.html?u=${u}&r=${b}` })
            : `<p class="empty">${isMe ? 'Rate some episodes and your chart shows up here.' : 'No ratings yet.'}</p>`}
        </section>
        <section>
          <div class="section-head"><h2>Season progress</h2></div>
          ${progressHtml}
        </section>
      </aside>
    </div>`;
  root.removeAttribute('aria-busy');
}
