import { pcTalkButtonHTML } from '../pc.js?v=20261128090606';
import { initPage, logEpisode } from '../layout.js?v=20261128090606';
import { supabase } from '../supabase.js?v=20261128090606';
import { $, esc, epCode, stars, avatarHTML, toast } from '../ui.js?v=20261128090606';
import { loadAllEpisodes, myLogMap, cardHTML, isAired } from '../episodes.js?v=20261128090606';
import { followingIds, reviewHTML, reviewExtras, wireReviewLikes, REVIEW_SELECT } from '../social.js?v=20261128090606';
import { line } from '../jokes.js?v=20261128090606';
import { episodeAverages, allLatestRatings } from '../insights.js?v=20261128090606';
import { stanPicks, stanLine } from '../stan.js?v=20261128090606';
import { loadPicks } from '../club.js?v=20261128090606';
import { isChaos } from '../fx.js?v=20261128090606';
import { loadStreaks, streakHTML } from '../streak.js?v=20261128090606';
import { loadVotes, loadRatings, scoreVotes, champion } from '../cage.js?v=20261128090606';
import { gloveSVG, booksSVG, mysterySVG, chefHatSVG } from '../art.js?v=20261128090606';
import { REVIEWS as KYLE_REVIEWS } from '../kyle-profile.js?v=20261128090606';
import { guestReviewsFor } from '../guest-reviews.js?v=20261128090606';
import { showInstallAd } from '../install.js?v=20261128090606';

const { user, profile } = await initPage();
const root = $('#home');
showInstallAd();

// Hero: gentle falling snow over the mountains.
document.querySelector('.hero-mountains')?.insertAdjacentHTML('afterend', `
  <div class="hero-snow" aria-hidden="true"></div>`);

if (profile?.username) {
  const name = profile.display_name || profile.username;
  $('.hero h1').innerHTML = `Welcome back,<br>${esc(name)}.`;
  $('.hero p').textContent = 'What did you watch? Log it, rate it, and roast your friends\' takes.';
  $('#hero-actions').innerHTML = `
    <button type="button" class="paper btn-paper" style="background-color:var(--green);border:0;cursor:pointer" id="hero-log">+ Log an episode</button>
    <button type="button" class="paper btn-paper" style="background-color:var(--yellow);border:0;cursor:pointer" id="hero-random" title="Chef's menu: pick a dish and get an episode to watch">${chefHatSVG()} Chef's menu</button>`;
  $('#hero-log').onclick = () => logEpisode();
  $('#hero-random').onclick = async () => {
    const r = await import('../random.js?v=20261128090606');
    if (isChaos()) r.rollWorst((m) => toast(m)); else r.openRandomPicker();
  };
  syncHeroRandom();
  await renderHome();
  window.addEventListener('parkboxd:logged', renderHome);
}

async function renderHome() {
  const now = new Date();
  const friends = await followingIds(user.id);
  const friendIds = [...friends];
  const hasFriends = friendIds.length > 0;
  const EP = 'episodes(id, kind, season, number, title, air_date, still_path)';

  let reviewsQ = supabase.from('logs').select(`${REVIEW_SELECT}, ${EP}`).not('review', 'is', null).neq('review', '')
    .order('created_at', { ascending: false }).limit(5);
  if (hasFriends) reviewsQ = reviewsQ.in('user_id', friendIds);

  const [all, mine, { data: today }, { data: friendPopular }, { data: everyonePopular }, { data: reviews }, { data: activity }] = await Promise.all([
    loadAllEpisodes(),
    myLogMap(user.id),
    supabase.rpc('aired_on_this_day', { p_month: now.getMonth() + 1, p_day: now.getDate() }),
    hasFriends ? supabase.rpc('popular_with_friends', { p_days: 7, p_limit: 12 }) : Promise.resolve({ data: [] }),
    supabase.rpc('popular_episodes', { p_days: 7, p_limit: 12 }),
    reviewsQ,
    hasFriends
      ? supabase.from('logs').select(`id, user_id, rating, liked, review, is_rewatch, created_at, profiles!logs_user_id_fkey(username, display_name, avatar_color, avatar_icon), ${EP}`)
        .in('user_id', friendIds).order('created_at', { ascending: false }).limit(12)
      : Promise.resolve({ data: [] }),
  ]);
  const byId = new Map(all.map((e) => [e.id, e]));
  const popular = friendPopular?.length ? friendPopular : everyonePopular;

  // Aired on this day: pick the oldest so it feels like a classic.
  const anniversary = (today || []).filter((e) => e.air_date < `${now.getFullYear()}`)[0];
  const anniversaryHTML = anniversary ? `
    <div class="paper callout tilt-left" style="background-color:var(--yellow)">
      <div class="cut">Aired on this day</div>
      <p><strong>${esc(anniversary.title)}</strong> · ${esc(epCode(anniversary))} · first aired ${esc(anniversary.air_date.slice(0, 4))}, ${now.getFullYear() - Number(anniversary.air_date.slice(0, 4))} years ago.</p>
      <a href="episode.html?id=${anniversary.id}">Log it</a>
    </div>` : '';

  // Popular this week, or the newest aired episodes if nobody has logged anything yet.
  let popTitle = friendPopular?.length ? 'Popular with friends this week' : 'Popular this week';
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

  const [extras, avgs] = await Promise.all([reviewExtras((reviews || []).map((r) => r.id), user.id), episodeAverages()]);
  const reviewsTitle = hasFriends ? 'Recent reviews from friends' : 'Recent reviews';
  const reviewsHTML = reviews?.length
    ? reviews.map((r) => reviewHTML(r, { me: user.id, extras, avgs, showEpisode: true })).join('')
    : `<p class="empty">${hasFriends ? 'Your friends haven\'t reviewed anything lately. Too busy at Casa Bonita, probably.' : esc(line('reviewsEmpty'))}</p>`;

  // Friends' latest logs (anything, not just reviews).
  const ago = (iso) => {
    const mins = Math.round((Date.now() - new Date(iso)) / 60000);
    if (mins < 60) return `${Math.max(1, mins)}m`;
    if (mins < 1440) return `${Math.round(mins / 60)}h`;
    return `${Math.round(mins / 1440)}d`;
  };
  const activityHTML = hasFriends
    ? (activity?.length
      ? `<ul class="activity">${activity.map((a) => `
          <li>
            ${avatarHTML(a.profiles, 26)}
            <span><a href="profile.html?u=${encodeURIComponent(a.profiles.username)}">${esc(a.profiles.display_name || a.profiles.username)}</a>
              ${a.review ? 'reviewed' : a.is_rewatch ? 'rewatched' : 'watched'}
              <a class="ep" href="${a.review ? `review.html?id=${a.id}` : `episode.html?id=${a.episodes.id}`}">${esc(a.episodes.title)}</a>
              <span class="rating">${stars(a.rating)}</span>${a.liked ? ' <span class="heart" aria-label="Liked">♥</span>' : ''}</span>
            <time datetime="${esc(a.created_at)}">${ago(a.created_at)}</time>
          </li>`).join('')}</ul>`
      : `<p class="empty">${esc(line('activityEmpty'))}</p>`)
    : `<p class="empty">Follow your friends to see what they're watching. <a href="friends.html?tab=everyone">Find people</a></p>`;

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
      <div class="bar"><div style="width:${t ? Math.round((w / t) * 100) : 0}%;background:var(--green)"></div></div>
    </div>`;
  const progressHTML = `<div class="progress-list">
    ${started.map((s, i) => bar(`Season ${s.season}`, `seasons.html?s=${s.season}`, s.watched, s.total, i)).join('')}
    ${bar('Everything', 'seasons.html', totalSeen, totalEps, 4)}
    ${started.length ? '' : '<p class="empty" style="margin:0">Log something to start filling these up.</p>'}
  </div>`;

  const weekly = (await loadPicks(all, [0]))[0].pick; // this week's book (follows last week's vote)
  const weeklyHTML = weekly ? `
    <a class="club-ad" href="club.html">
      <span class="club-tape" aria-hidden="true"></span>
      <span class="club-ad-head"><span class="club-ad-books">${booksSVG()}</span><span class="club-ad-title cut">Butters' Book Club</span></span>
      <span class="club-ad-text">This week's book: <strong>${esc(weekly.title)}</strong> · ${esc(epCode(weekly))}. Butters already wrote a review, and it's real nice.</span>
      <span class="club-ad-cta cut">${mine.has(weekly.id) ? 'See the reviews' : 'Join the club'} →</span>
      <span class="club-sticker" aria-hidden="true">⭐<small>Butters' pick</small></span>
    </a>` : '';

  // Kenny's Daily Mystery Episode card: today's puzzle number and whether you've solved it.
  const dayNo = Math.floor(Date.now() / 86400000);
  const puzzleNo = dayNo - Math.floor(Date.UTC(2026, 10, 27) / 86400000) + 1;
  const { data: todayGame } = await supabase.from('mystery_plays').select('guesses, done, won').eq('user_id', user.id).eq('day', dayNo).maybeSingle();
  const kennyAd = `
    <a class="kenny-ad" href="mystery.html">
      <span class="kenny-ad-head"><span class="kenny-ad-logo">${mysterySVG()}</span><span class="kenny-ad-title cut">Kenny's Mystery Episode</span></span>
      <span class="kenny-ad-text">Daily puzzle #${puzzleNo}. Guess the episode from a blurry picture. Kenny gives hints. They're muffled.</span>
      <span class="kenny-ad-cta cut">${todayGame?.done ? (todayGame.won ? `Solved in ${todayGame.guesses.length}! ✓` : 'Kenny didn\'t make it. See you tomorrow') : todayGame?.guesses?.length ? 'Keep guessing →' : "Play today's puzzle →"}</span>
    </a>`;

  // Stan's Picks: unseen episodes that people with your taste loved.
  const [everyone, { data: people }] = await Promise.all([
    allLatestRatings(),
    supabase.from('profiles').select('id, username, display_name').not('username', 'is', null),
  ]);
  const names = new Map((people || []).map((p) => [p.id, p.display_name || p.username]));
  const picks = stanPicks({ meId: user.id, everyone, seen: new Set(mine.keys()), all, avgs, names });
  const stanHTML = picks.length ? `
    <section class="stan-picks">
      <div class="section-head"><h2>👦 Stan's Picks</h2><span class="result-count">Unseen episodes that people with your taste loved</span></div>
      <p class="stan-quote">“${esc(stanLine())}” <span>— Stan</span></p>
      <div class="ep-grid">${picks.map((p) => cardHTML(p.ep, { meta: p.reason })).join('')}</div>
    </section>` : '';

  // Cartman's Cage Match ad, with your current champion if you have one.
  const [cageVotes, cageRatings] = await Promise.all([loadVotes(user.id), loadRatings(user.id)]);
  const champ = champion(scoreVotes(cageVotes, cageRatings));
  const champEp = champ && byId.get(champ.top.id);
  const cageAd = `
    <a class="cage-ad" href="cage.html">
      <span class="cage-ad-head"><span class="cage-ad-glove">${gloveSVG()}</span><span class="cage-ad-title cut">Cartman's Cage Match</span></span>
      <span class="cage-ad-text">${champEp
        ? `Your champion: <strong>${esc(champEp.title)}</strong>${champ.undefeated ? ' (undefeated!)' : ''}. Think anything can take it down? Step into the cage.`
        : "Two episodes enter. One leaves. Pick winners until your true favourite episode is crowned. Hosted by Eric Cartman, who is very humble about it."}</span>
      <span class="cage-ad-cta cut">${champEp ? 'Defend the title' : 'Enter the cage'} →</span>
    </a>`;

  // Kyle's review of the day: one of his reviews, a different one each day (same for everyone).
  const normT = (t) => t.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  const kyleTitle = KYLE_REVIEWS[dayNo % KYLE_REVIEWS.length][0];
  const kyleEp = all.find((e) => normT(e.title) === normT(kyleTitle));
  const kyle = kyleEp && guestReviewsFor(kyleEp).find((g) => g.who.username === 'kyle');
  const kyleHTML = kyle ? `
        <section class="kyle-note paper">
          <div class="section-head"><h2>📖 Kyle's review of the day</h2></div>
          <a class="kyle-note-ep" href="episode.html?id=${kyleEp.id}"><strong>${esc(kyleEp.title)}</strong> <span>${esc(epCode(kyleEp))}</span></a>
          <span class="rating">${stars(kyle.rating)}</span>
          <p class="kyle-note-text">“${esc(kyle.text)}”</p>
          <p class="guest-note"><strong>What it's about:</strong> ${esc(kyle.note)}</p>
          <div class="kyle-note-foot"><a href="episode.html?id=${kyleEp.id}">Like or comment →</a><a href="profile.html?u=kyle">All of Kyle's reviews</a>${pcTalkButtonHTML('kyle', kyle.text)}</div>
        </section>` : '';

  // Tegridy streak (only once you've started one).
  const streak = (await loadStreaks([user.id])).get(user.id);
  const streakBox = streak.longest ? `<a href="diary.html" class="streak-link" title="Your diary: every day you logged">${streakHTML(streak)}</a>` : '';

  root.innerHTML = `
    ${anniversaryHTML}
    <div class="home-promos">${weeklyHTML}${cageAd}${kennyAd}</div>
    ${streakBox}
    ${stanHTML}
    <section>
      <div class="section-head"><h2>${popTitle}</h2><a href="episodes.html">More</a></div>
      <div class="ep-grid">${popCards.join('')}</div>
    </section>
    <div class="two-col">
      <section>
        <div class="section-head"><h2>${reviewsTitle}</h2></div>
        <div class="reviews" id="home-reviews">${reviewsHTML}</div>
      </section>
      <aside style="display:flex;flex-direction:column;gap:32px">
        ${kyleHTML}
        <section>
          <div class="section-head"><h2>Friends' activity</h2><a href="friends.html">Friends</a></div>
          ${activityHTML}
        </section>
        <section>
          <div class="section-head"><h2>Your progress</h2></div>
          ${progressHTML}
        </section>
        <section class="paper" id="decide-box" style="background-color:var(--surface-2);padding:22px"></section>
      </aside>
    </div>`;

  wireReviewLikes($('#home-reviews'), renderHome);
  renderDecideBox();
}

// "Can't decide?" box. In Professor Chaos mode it turns evil and picks from your worst-rated episodes.
function renderDecideBox() {
  const box = $('#decide-box');
  if (!box) return;
  const random = () => import('../random.js?v=20261128090606');
  const evil = isChaos();
  box.innerHTML = evil
    ? `<div class="cut" style="font-size:20px;color:var(--green);margin-bottom:8px">Can't decide? Professor Chaos can.</div>
       <p style="margin:0 0 14px;font-size:14px;color:var(--text-soft)">He'll pick one of the episodes you rated lowest. Suffer.</p>
       <div style="display:flex;gap:8px;flex-wrap:wrap">
         <button type="button" class="btn btn-green" id="rand-evil">😈 Make me suffer</button>
       </div>
       <p class="notice" id="rand-msg" hidden style="margin-top:12px"></p>`
    : `<div class="cut" style="font-size:20px;color:var(--orange);margin-bottom:8px">Can't decide?</div>
       <p style="margin:0 0 14px;font-size:14px;color:var(--text-soft)">Get a random episode you haven't seen, or one you rated 4★ or higher.</p>
       <div style="display:flex;gap:8px;flex-wrap:wrap">
         <button type="button" class="btn btn-orange" id="rand-new">Unwatched</button>
         <button type="button" class="btn btn-outline" id="rand-fav">Rewatch a 4★+</button>
         <button type="button" class="link-button" id="rand-more" style="color:var(--text-soft);font-size:13px">More options…</button>
       </div>
       <p class="notice" id="rand-msg" hidden style="margin-top:12px"></p>`;

  const showRand = (text) => {
    const m = $('#rand-msg');
    m.textContent = text;
    m.className = 'notice notice-info';
    m.hidden = false;
  };
  if (evil) {
    $('#rand-evil').onclick = async () => (await random()).rollWorst(showRand);
    return;
  }
  $('#rand-new').onclick = async () => (await random()).rollAndGo({ pool: 'unwatched', min: 0, kinds: ['episode', 'special', 'movie'], season: '' }, showRand);
  $('#rand-fav').onclick = async () => (await random()).rollAndGo({ pool: 'rated', min: 4, kinds: ['episode', 'special', 'movie'], season: '' }, showRand);
  $('#rand-more').onclick = async () => (await random()).openRandomPicker();
}

// Big hero button: chef hat normally, 😈 in Professor Chaos mode.
function syncHeroRandom() {
  const b = $('#hero-random');
  if (!b) return;
  b.innerHTML = isChaos() ? '😈 Unleash chaos' : `${chefHatSVG()} Chef's menu`;
  b.title = isChaos() ? 'Rewatch one of your worst-rated episodes' : "Chef's menu: pick a dish and get an episode to watch";
}

window.addEventListener('parkboxd:mode', () => {
  syncHeroRandom();
  renderDecideBox();
});
