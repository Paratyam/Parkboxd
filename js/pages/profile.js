import { initPage } from '../layout.js?v=20261127144749';
import { supabase } from '../supabase.js?v=20261127144749';
import { SITE_NAME } from '../config.js?v=20261127144749';
import { thumbHTML, loadAllEpisodes } from '../episodes.js?v=20261127144749';
import { allLatestRatings, characterTags, episodeAverages, computeBadges, personality, tasteMatch, tasteLabel } from '../insights.js?v=20261127144749';
import { shareInvite } from '../invite.js?v=20261127144749';
import { $, esc, params, avatarHTML, formatDate, stars, epCode, profileTabsHTML, toast } from '../ui.js?v=20261127144749';
import { countRatings, histogramHTML } from '../histogram.js?v=20261127144749';
import { followingIds, followButtonHTML, wireFollowButtons, reviewHTML, reviewExtras, wireReviewLikes, REVIEW_SELECT } from '../social.js?v=20261127144749';
import { line } from '../jokes.js?v=20261127144749';
import { characterColours } from '../data/character-tags.js?v=20261127144749';
import { loadVotes, scoreVotes, champion } from '../cage.js?v=20261127144749';
import { streakInfo } from '../streak.js?v=20261127144749';
import { loadPicks } from '../club.js?v=20261127144749';
import { attendance, attendanceHTML, clubOffsets } from '../attendance.js?v=20261127144749';
import { beltSVG } from '../art.js?v=20261127144749';
import { roastJokes } from '../jimmy.js?v=20261127144749';

const { profile: me } = await initPage({ title: 'Profile', auth: 'required' });
const root = $('#profile');

const wanted = (params.get('u') || me.username).toLowerCase();
// Butters' and Kyle's (pretend) accounts live in code, not the database.
const renderGuest = wanted === 'butters' ? (await import('../butters-profile.js?v=20261127144749')).renderButtersProfile
  : wanted === 'kyle' ? (await import('../kyle-profile.js?v=20261127144749')).renderKyleProfile : null;
const { data: person } = renderGuest ? { data: null } : await supabase.from('profiles').select('*').eq('username', wanted).maybeSingle();

if (renderGuest) {
  await renderGuest(root);
} else if (!person) {
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
  const u = encodeURIComponent(p.username);

  const [{ data: stats }, { data: recent }, { data: top4Eps }, { data: progress }, { data: ratings }, everyone, chars, avgs, all, { data: allLogs }] = await Promise.all([
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
    allLatestRatings(),
    characterTags(),
    episodeAverages(),
    loadAllEpisodes(),
    supabase.from('logs').select('episode_id, rating, review, is_rewatch, watched_on, created_at').eq('user_id', p.id).limit(5000),
  ]);
  const theirRatings = everyone.get(p.id) || new Map();
  const streak = streakInfo(allLogs || []);
  const { data: recentReviews } = await supabase.from('logs')
    .select(`${REVIEW_SELECT}, episodes(id, kind, season, number, title, air_date, still_path)`)
    .eq('user_id', p.id).not('review', 'is', null).neq('review', '')
    .order('created_at', { ascending: false }).limit(3);
  const reviewExtrasData = await reviewExtras((recentReviews || []).map((r) => r.id), me.id);

  // Cage Match champion: #1 in their personal head-to-head ranking.
  const cageVotes = await loadVotes(p.id);
  const { count: mysteryWins } = await supabase.from('mystery_plays').select('day', { count: 'exact', head: true }).eq('user_id', p.id).eq('won', true);
  // Book Club: every week since it began, for the Bookworm badge, the library card and the streak.
  const clubPicks = (await loadPicks(all, clubOffsets())).filter((pk) => pk.real);
  const champ = champion(scoreVotes(cageVotes, theirRatings));
  const champEp = champ && all.find((e) => e.id === champ.top.id);
  const champHtml = champEp ? `
    <section>
      <div class="section-head"><h2>Cage Match champion</h2><a href="cage.html?u=${u}&view=ranking">Full ranking</a></div>
      <a class="cage-champ paper" href="episode.html?id=${champEp.id}"><span class="cage-champ-belt">${beltSVG()}</span>
        ${thumbHTML(champEp, { showTitle: false, size: 'w780' })}
        <div><span class="cut">${champ.undefeated ? '🏆 Undefeated champion' : '👑 Reigning champion'}</span>
          <strong>${esc(champEp.title)}</strong>
          <span>${esc(epCode(champEp))} · ${champ.top.wins}–${champ.top.losses} after ${cageVotes.length} matches${champ.undefeated ? ' · never lost' : ''}</span></div>
      </a>
    </section>`
    : isMe ? `
    <section>
      <div class="section-head"><h2>Cage Match champion</h2></div>
      <a class="callout paper tilt-left" href="cage.html" style="display:block;background-color:var(--surface);color:var(--text)">
        <strong>No champion yet.</strong> Play <span style="text-decoration:underline">Cage Match</span>: pick the better of two episodes until your true favourite rises to the top.
      </a>
    </section>` : '';

  // GROUNDED: rated a Butters episode 2★ or less in the last 24 hours.
  const butters = chars.byName.get('Butters') || new Set();
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const crime = (allLogs || [])
    .filter((l) => l.rating != null && l.rating <= 2 && butters.has(l.episode_id) && new Date(l.created_at).getTime() > dayAgo)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const crimeEp = crime && all.find((e) => e.id === crime.episode_id);
  const groundedHtml = crimeEp ? `
    <div class="grounded paper" role="note">
      <span class="cut">GROUNDED</span>
      <span>for giving <a href="episode.html?id=${crimeEp.id}">${esc(crimeEp.title)}</a> ${stars(crime.rating)}.
        Free at ${esc(new Date(new Date(crime.created_at).getTime() + 24 * 60 * 60 * 1000).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }))}.</span>
    </div>` : '';
  const [flairBg, flairFg] = characterColours(p.favourite_character);
  const flairHtml = p.favourite_character ? `<span class="team-flair paper" style="background-color:${flairBg};color:${flairFg}">Team ${esc(p.favourite_character)}</span>` : '';

  // Badges
  const badges = computeBadges({
    username: p.username, logs: allLogs || [], ratings: theirRatings, all, byName: chars.byName, avgs, following: stats?.following ?? 0,
    clubPicks, cageMatches: cageVotes.length, mysteryWins: mysteryWins || 0, seasonTiers: p.season_tiers,
  }).sort((a, b) => Number(b.earned) - Number(a.earned)); // unlocked first; within each group the sort is stable, so the difficulty order from computeBadges stays
  const earned = badges.filter((b) => b.earned).length;

  // Library card: the last 10 Book Club picks, stamped if read during their week.
  const readInWeek = (pk) => pk.pick && (allLogs || []).some((l) => l.episode_id === pk.pick.id
    && new Date(l.created_at) >= pk.start && new Date(l.created_at) < pk.end);
  const lastTen = clubPicks.slice(0, 10).reverse(); // oldest first, this week last
  const readCount = lastTen.filter(readInWeek).length;
  const libraryHtml = `
    <div class="library-card">
      <div class="lc-head"><span class="cut">South Park Elementary Library</span><span>Book Club card</span></div>
      <div class="lc-body">
        <div class="lc-who"><span>Member</span><strong>${esc(name)}</strong><span class="lc-count">Read <b>${readCount}</b> of ${lastTen.length < 10 ? `${lastTen.length} pick${lastTen.length === 1 ? "" : "s"} so far` : "the last 10 picks"}</span></div>
        <div class="lc-stamps">${lastTen.map((pk, i) => {
          const done = readInWeek(pk);
          const current = i === lastTen.length - 1;
          const label = formatDate(pk.start.toISOString().slice(0, 10), { month: 'short', day: 'numeric' });
          return `<a class="lc-slot${done ? ' read' : ''}${current ? ' now' : ''}" href="episode.html?id=${pk.pick?.id || ''}" title="Week of ${esc(label)}: ${esc(pk.pick?.title || '')}${done ? ' (read)' : current ? ' (this week)' : ' (missed)'}">
            <span class="lc-date">${esc(label)}</span>${done ? '<span class="lc-stamp cut">Read</span>' : current ? '<span class="lc-now">this week</span>' : ''}
          </a>`;
        }).join('')}</div>
      </div>
      <div class="lc-attend">${attendanceHTML(attendance(clubPicks, allLogs || []), { mine: isMe })}</div>
    </div>`;
  // Two badges unlock a secret mode. Only the person who earned it sees how to use it.
  const SECRETS = {
    chaos: 'Secret unlocked: type "chaos" anywhere on the site (or tap the logo 5 times on a phone) to become Professor Chaos.',
    kenny: 'Secret unlocked: type "mysterion" anywhere on the site (or press and hold the logo on a phone) to become Mysterion.',
  };
  const secretLine = (b) => {
    if (!SECRETS[b.id]) return '';
    return b.earned && isMe
      ? `<span class="secret-hint">🔓 ${esc(SECRETS[b.id])}</span>`
      : ''; // no teaser: nobody should know there's a secret until they've earned it
  };
  const badgesHtml = `<div class="badges">${badges.map((b) => `
    <div class="badge paper${b.earned ? ' earned' : ''}" title="${esc(b.desc)}${b.earned ? '' : ` (${b.have} / ${b.need})`}">
      <span class="emoji" aria-hidden="true">${b.emoji}</span>
      <strong>${esc(b.name)}</strong>
      <span>${esc(b.desc)}</span>
      ${b.earned ? '<span class="got">Unlocked</span>' : `<div class="bar" aria-label="${b.have} of ${b.need}"><div style="width:${b.need ? (b.have / b.need) * 100 : 0}%;background:var(--green)"></div></div>`}
      ${secretLine(b)}
      ${b.earned && isMe ? `<button type="button" class="link-button badge-share" data-share-award data-kicker="Badge unlocked" data-emoji="${esc(b.emoji)}" data-heading="${esc(b.name)}" data-line="${esc(b.desc)}" data-name="${esc(name)}">Share</button>` : ''}
    </div>`).join('')}</div>`;

  // The first time you see a secret badge you've earned, announce the secret.
  if (isMe) {
    const seenKey = 'parkboxd-secrets-seen';
    const seen = new Set(JSON.parse(localStorage.getItem(seenKey) || '[]'));
    for (const b of badges.filter((x) => x.earned && SECRETS[x.id] && !seen.has(x.id))) {
      setTimeout(() => toast(`${b.emoji} You earned the ${b.name} badge! ${SECRETS[b.id]}`, 9000), 600);
      seen.add(b.id);
    }
    localStorage.setItem(seenKey, JSON.stringify([...seen]));
  }

  // South Park personality, from how they rate, review and rewatch.
  const persona = personality({ username: p.username, logs: allLogs || [], ratings: theirRatings, avgs });
  const characterHtml = persona
    ? `<div class="char-card paper">
        <div style="display:flex;gap:14px;align-items:center">
          <span style="font-size:40px;line-height:1" aria-hidden="true">${persona.emoji}</span>
          <div class="cut" style="font-size:26px;color:var(--white);line-height:1.1">${isMe ? "You're" : `${esc(name)} is`} a ${esc(persona.name)}</div>
        </div>
        <p style="margin:10px 0 0;color:var(--text-soft)">${esc(persona.line)}</p>
        <p style="margin:8px 0 0;font-size:12px;color:var(--muted)">Why: ${esc(persona.why)}</p>
        ${isMe ? `<button type="button" class="link-button" style="margin-top:10px" data-share-award data-kicker="My South Park personality" data-emoji="${esc(persona.emoji)}" data-heading="I'm a ${esc(persona.name)}" data-line="${esc(persona.line)}" data-name="${esc(name)}">🖼️ Share my personality</button>` : ''}
      </div>`
    : `<p class="empty">Log and rate a few more episodes and we'll tell ${isMe ? 'you who you are' : 'you who they are'}. Hopefully not Cartman.</p>`;

  // Taste match (on other people's profiles)
  let tasteHtml = '';
  if (!isMe) {
    const tm = tasteMatch(everyone.get(me.id) || new Map(), theirRatings);
    const byId = new Map(all.map((e) => [e.id, e]));
    tasteHtml = `
      <section>
        <div class="section-head"><h2>Taste match</h2>${tm ? `<a href="compare.html?u=${u}">Compare</a>` : ''}</div>
        ${tm?.score != null
          ? `<div class="char-card paper">
              <div class="cut" style="font-size:34px;color:var(--white);line-height:1">${tm.score}%</div>
              <div style="color:var(--text-soft);font-size:14px;margin-top:4px">${esc(tasteLabel(tm.score))} · ${tm.shared} episodes you both rated</div>
              ${tm.pairs[0].diff >= 1.5 ? `<p style="margin:12px 0 0;font-size:13px;color:var(--text-soft)">Biggest fight:
                <a href="episode.html?id=${tm.pairs[0].epId}">${esc(byId.get(tm.pairs[0].epId)?.title || '')}</a>.
                You gave it ${stars(tm.pairs[0].a)}, ${esc(name)} gave it ${stars(tm.pairs[0].b)}.</p>` : ''}
            </div>`
          : `<p class="empty">You need at least 3 episodes you've both rated. ${tm ? `You have ${tm.shared}.` : ''} Get watching.</p>`}
      </section>`;
  }
  const ratingCounts = countRatings((ratings || []).map((r) => r.rating));
  const ratedTotal = ratingCounts.reduce((a, b) => a + b, 0);

  const s = stats || {};
  const statItems = [
    ['Episodes', s.episodes_watched ?? 0],
    ['Hours', Math.round((s.minutes_watched ?? 0) / 60)],
    ['This year', s.logs_this_year ?? 0],
    ['Reviews', s.review_count ?? 0, `reviews.html?u=${u}`],
    ['Followers', s.followers ?? 0, `friends.html?u=${u}&tab=followers`],
    ['Following', s.following ?? 0, `friends.html?u=${u}&tab=following`],
    ['🌱 Streak', streak.current, `stats.html?u=${u}`],
  ];
  const iFollow = isMe ? false : (await followingIds(me.id)).has(p.id);
  const { count: followsMeCount } = isMe ? { count: 0 } : await supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', p.id).eq('followee_id', me.id);
  const canMessage = !isMe && iFollow && followsMeCount > 0; // messages are for people who follow each other

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
    : `<p class="empty">${esc(isMe ? line('diaryEmptyMine') : line('diaryEmptyOther', { name }))}</p>`;

  const started = (progress || []).filter((r) => r.watched > 0);
  const progressHtml = started.length
    ? `<div class="progress-list">${started.map((r) => `
        <div class="progress-row">
          <div class="label"><a href="seasons.html?s=${r.season}" style="color:var(--text)">Season ${r.season}</a><span>${r.watched} / ${r.total}</span></div>
          <div class="bar"><div style="width:${Math.round((r.watched / r.total) * 100)}%;background:var(--green)"></div></div>
        </div>`).join('')}</div>
      <p style="margin:12px 0 0;font-size:13px"><a href="stats.html?u=${u}">All stats and season rankings →</a></p>`
    : '<p class="empty">No seasons started yet. Season 1 is right there, dude.</p>';

  root.innerHTML = `
    <section class="profile-head paper" aria-label="Profile">
      ${avatarHTML(p, 96)}
      <div class="who">
        <h1 class="cut">${esc(name)}</h1>
        <span class="handle">@${esc(p.username)} · joined ${esc(formatDate(p.created_at, { month: 'long', year: 'numeric' }))}</span>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
        ${flairHtml ? `<div style="margin-top:6px">${flairHtml}</div>` : ''}
      </div>
      ${groundedHtml}
      <div class="stats">${statItems.map(([label, n, href]) => href
        ? `<a class="stat" href="${href}" style="color:inherit"><b>${n}</b><span>${label}</span></a>`
        : `<div class="stat"><b>${n}</b><span>${label}</span></div>`).join('')}</div>
      <div class="profile-actions" style="width:100%">
        ${isMe ? '<a class="btn btn-ghost" href="settings.html">Edit profile</a>' : followButtonHTML(p.id, iFollow)}
        ${canMessage ? `<a class="btn btn-ghost" href="messages.html?u=${u}">💬 Message</a>` : ''}
        ${isMe ? '<button type="button" class="btn btn-ghost" id="invite-friends">📨 Invite friends</button>' : ''}
        <button type="button" class="btn btn-ghost jimmy-btn" id="jimmy-roast">🎤 ${isMe ? 'Roast me, Jimmy' : 'Get Jimmy to roast them'}</button>
      </div>
    </section>

    ${profileTabsHTML(p.username, 'profile')}

    <section>
      <div class="section-head"><h2>Favourite episodes</h2>${isMe && top4Eps?.length ? `<button type="button" class="link-button" data-share-top4="${esc(p.username)}">🖼️ Share my Top 4</button>` : ''}</div>
      <div class="top4">${top4Html}</div>
    </section>

    ${champHtml}

    <section>
      <div class="section-head"><h2>Badges</h2><span class="result-count">${earned} of ${badges.length} unlocked</span></div>
      ${badgesHtml}
    </section>

    <section>
      <div class="section-head"><h2><a href="club.html" style="color:inherit">📚 Library card</a></h2></div>
      ${libraryHtml}
    </section>

    <div class="two-col">
      <section>
        <div class="section-head"><h2>Recent diary</h2><a href="diary.html?u=${encodeURIComponent(p.username)}">All</a></div>
        ${diaryHtml}
        <div class="section-head" style="margin-top:32px"><h2><a href="reviews.html?u=${u}" style="color:inherit">Recent reviews</a></h2><a href="reviews.html?u=${u}">All</a></div>
        <div class="reviews" id="profile-reviews">${recentReviews?.length
          ? recentReviews.map((r) => reviewHTML(r, { me: me.id, extras: reviewExtrasData, avgs, showEpisode: true })).join('')
          : `<p class="empty">${isMe ? 'No reviews yet. Open an episode you rated and hit "Write a review".' : 'No reviews yet.'}</p>`}</div>
      </section>
      <aside style="display:flex;flex-direction:column;gap:32px">
        ${tasteHtml}
        <section>
          <div class="section-head"><h2>South Park personality</h2></div>
          ${characterHtml}
        </section>
        <section>
          <div class="section-head"><h2><a href="ratings.html?u=${u}" style="color:inherit">Ratings</a></h2><a href="ratings.html?u=${u}">${ratedTotal}</a></div>
          ${ratedTotal
            ? histogramHTML(ratingCounts, { href: (b) => `ratings.html?u=${u}&r=${b}` })
            : `<p class="empty">${esc(line(isMe ? 'ratingsEmptyMine' : 'ratingsEmptyOther'))}</p>`}
        </section>
        <section>
          <div class="section-head"><h2>Season progress</h2></div>
          ${progressHtml}
        </section>
      </aside>
    </div>`;
  root.removeAttribute('aria-busy');
  wireFollowButtons(root, () => render(p));
  $('#invite-friends')?.addEventListener('click', () => shareInvite(p.username));

  // Jimmy's Comedy Roast: one joke per click, from this person's real stats. Stat jokes come
  // first; when they run out the list reshuffles.
  let jokes = [];
  let jokeAt = 0;
  $('#jimmy-roast')?.addEventListener('click', (e) => {
    if (jokeAt >= jokes.length) {
      jokes = roastJokes({
        name, logs: allLogs || [], ratings: theirRatings, avgs, byId: new Map(all.map((ep) => [ep.id, ep])),
        hours: Math.round((s.minutes_watched ?? 0) / 60), reviewCount: s.review_count ?? 0,
        champTitle: champEp?.title, streak, persona: persona?.name, fav: p.favourite_character, top4: p.top4,
      });
      jokeAt = 0;
    }
    const joke = jokes[jokeAt++];
    let bubble = $('#jimmy-bubble');
    if (!bubble) {
      e.currentTarget.closest('.profile-actions').insertAdjacentHTML('afterend', '<div class="jimmy-bubble" id="jimmy-bubble" aria-live="polite"></div>');
      bubble = $('#jimmy-bubble');
    }
    bubble.innerHTML = `<span class="jimmy-mic" aria-hidden="true">🎤</span><p>${esc(joke)}</p><span class="jimmy-rim" aria-hidden="true">🥁 ba-dum-tss</span>`;
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
    e.currentTarget.textContent = '🎤 Another one, Jimmy';
  });
  wireReviewLikes($('#profile-reviews'), () => render(p));
}
