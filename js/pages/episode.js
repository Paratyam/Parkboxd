import { initPage, logEpisode } from '../layout.js?v=20261128095147';
import { supabase } from '../supabase.js?v=20261128095147';
import { SITE_NAME } from '../config.js?v=20261128095147';
import { $, esc, params, epCode, formatDate, toast, stars, avatarHTML } from '../ui.js?v=20261128095147';
import { line } from '../jokes.js?v=20261128095147';
import { celebrate } from '../fx.js?v=20261128095147';
import { loadEpisode, loadAllEpisodes, stillUrl, fallbackColour, thumbHTML, seasonLabel, seasonHref, myLogMap } from '../episodes.js?v=20261128095147';
import { mackeyNoteHTML } from '../mackey.js?v=20261128095147';
import { starInput } from '../stars.js?v=20261128095147';
import { reviewHTML, reviewExtras, wireReviewLikes, followingIds, REVIEW_SELECT } from '../social.js?v=20261128095147';
import { pcButtonHTML } from '../pc.js?v=20261128095147';
import { loadArcs, openLogArc } from '../arcs.js?v=20261128095147';
import { loadVotes, loadRatings, scoreVotes, ranking, peoplesChampion } from '../cage.js?v=20261128095147';
import { peoplesCupSVG, chefHatSVG } from '../art.js?v=20261128095147';
import { openRecommend, recommendationsFor } from '../recommend.js?v=20261128095147';
import { guestReviewsFor, guestReviewHTML, loadGuestExtras, wireGuestReviews } from '../guest-reviews.js?v=20261128095147';
import { DISHES, serve, dishHref } from '../chef.js?v=20261128095147';

const { user, profile } = await initPage({ title: 'Episode', auth: 'required' });
let top4 = profile.top4 || [];
const root = $('#episode');
const ep = await loadEpisode(Number(params.get('id')));

const EYE = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const HEART = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 6-8 11-8 11z"/></svg>';
const PLUS = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const CHECK = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';

let myLogs = [];
let onWatchlist = false;
let cageInfo = null;
let tagNames = [];

if (!ep) {
  document.title = `Not found · ${SITE_NAME}`;
  root.innerHTML = `<div class="wrap big-message"><h1 class="cut">Episode not found</h1>
    <p>${esc(line('notFound'))}</p><a class="btn btn-green" href="episodes.html">Browse episodes</a></div>`;
  root.removeAttribute('aria-busy');
} else {
  renderShell();
  $('#roll-again')?.addEventListener('click', async () => {
    const how = params.get('rolled');
    const dish = chefDish();
    if (dish) {
      const next = await serve(dish.id, { unseen: params.get('unseen') === '1', not: ep.id });
      if (!next.ep || next.ep.id === ep.id) return toast(next.message || "That's the only one in this dish.");
      location.href = dishHref(next.ep.id, dish.id, params.get('unseen') === '1');
      return;
    }
    const r = await import('../random.js?v=20261128095147');
    if (how === 'chaos') r.rollWorst((m) => toast(m));
    else r.rollAndGo(r.savedSettings(), (m) => toast(m));
  });
  await Promise.all([refreshMine(), refreshCommunity(), renderNeighbours(), renderTags(), renderArc(), renderPeoplesChamp().catch(() => {}), renderRecs().catch(() => {})]);
  root.removeAttribute('aria-busy');
  window.addEventListener('parkboxd:logged', () => { refreshMine(); refreshCommunity(); renderArc(); renderRecs().catch(() => {}); });
}

// The dish this episode was served from, if it came from the Chef's menu.
function chefDish() {
  return params.get('rolled') === 'chef' ? DISHES.find((d) => d.id === params.get('dish')) : null;
}

// Tag above the title when something else picked the episode for you.
function pickedTagHTML() {
  const how = params.get('rolled');
  if (!how) return '';
  const other = { chaos: '😈 Professor Chaos chose this. Suffer.', coon: "🦝 The Coon chose this. It's about him." }[how];
  const dish = chefDish();
  const hint = other ? '' : dish ? 'Not feeling it? Get another episode from the same dish' : 'Not feeling it? Get a different episode';
  return `<div class="toolbar" style="margin-bottom:10px"><span class="tag-chip">${other || `${chefHatSVG(18)} Chef's choice${dish ? `: ${esc(dish.name)}` : ''}`}</span>
    <button type="button" class="btn btn-ghost" id="roll-again" style="padding:6px 12px" title="${hint}">${other ? 'Roll again' : 'Send it back'}</button></div>`;
}

function renderShell() {
  document.title = `${ep.title} · ${SITE_NAME}`;
  const big = stillUrl(ep, 'w1280');
  const year = ep.air_date ? ep.air_date.slice(0, 4) : '';
  const crumbs = ep.kind === 'movie'
    ? `<a href="${seasonHref(ep)}">Movies</a>${year ? ` · ${year}` : ''}${ep.runtime ? ` · ${ep.runtime} min` : ''}`
    : `<a href="${seasonHref(ep)}">${esc(seasonLabel(ep))}</a> · ${ep.kind === 'special' ? 'Special' : 'Episode'} ${ep.number}${ep.air_date ? ` · Aired ${esc(formatDate(ep.air_date))}` : ''}`;

  root.innerHTML = `
    <section class="ep-hero" style="background-color:${fallbackColour(ep)}">${big ? `<img src="${esc(big)}" alt="">` : ''}</section>
    <div class="wrap ep-layout">
      <div class="ep-side">
        ${thumbHTML(ep, { showTitle: false })}
        <div class="ep-counts" id="ep-counts"></div>
      </div>

      <div class="ep-main">
        <div>
          ${pickedTagHTML()}
          <div class="crumbs">${crumbs}</div>
          <h1 class="cut">${esc(ep.title)}</h1>
        </div>
        <div id="peoples-champ" hidden></div>
        <div id="recs" hidden></div>
        ${ep.overview ? `<p class="overview">${esc(ep.overview)}</p>` : ''}
        ${mackeyNoteHTML(ep)}
        <div class="tag-chips" id="tags"></div>

        <section>
          <div class="section-head"><h2>Ratings</h2><span id="avg" style="font-size:13px;color:var(--muted)"></span></div>
          <div id="histogram"></div>
        </section>

        <section id="my-review" hidden></section>

        <section>
          <div class="section-head"><h2>Reviews</h2></div>
          <div class="reviews" id="reviews"></div>
        </section>

        <nav class="toolbar" id="neighbours" aria-label="Previous and next" style="justify-content:space-between"></nav>
      </div>

      <aside class="ep-aside">
        <div class="action-panel paper" id="panel"></div>
        <div id="note"></div>
        <div id="arc-box"></div>
      </aside>
    </div>`;
}

// A banner on the one episode everyone's Cage Match picks put first.
async function renderPeoplesChamp() {
  const champ = await peoplesChampion();
  const box = $('#peoples-champ');
  if (!box || champ?.episode_id !== ep.id) return;
  box.innerHTML = `<a class="ep-peoples paper" href="cage.html">${peoplesCupSVG()}
    <span><strong class="cut">The people's champion</strong>
      <span>Number one in Cartman's Cage Match across everyone's picks · ${champ.wins}–${champ.losses} from ${champ.judges} judge${champ.judges === 1 ? '' : 's'}</span></span></a>`;
  box.hidden = false;
}

// Friends who told you that you have to watch this one (until you rate it).
async function renderRecs() {
  const recs = await recommendationsFor(user.id, ep.id);
  const box = $('#recs');
  if (!box) return;
  box.hidden = !recs.length;
  box.innerHTML = recs.map((r) => `<div class="rec-note">${avatarHTML(r.from, 34)}
    <p><strong>${esc(r.from?.display_name || r.from?.username || 'Someone')}</strong> says you have to watch this.${r.note ? `<q>${esc(r.note)}</q>` : ''}</p></div>`).join('');
}

// ---- Your actions ----

async function refreshMine() {
  const [{ data: logs }, { count }, cageVotes, cageRatings] = await Promise.all([
    supabase.from('logs').select('*').eq('episode_id', ep.id).eq('user_id', user.id)
      .order('watched_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
    supabase.from('watchlist').select('episode_id', { count: 'exact', head: true }).eq('episode_id', ep.id).eq('user_id', user.id),
    loadVotes(user.id),
    loadRatings(user.id),
  ]);
  myLogs = logs || [];
  onWatchlist = count > 0;
  // Your Cage Match record for this episode, if it has fought.
  const cageList = ranking(scoreVotes(cageVotes, cageRatings));
  const cagePos = cageList.findIndex((x) => x.id === ep.id);
  cageInfo = cagePos < 0 ? null : { pos: cagePos + 1, of: cageList.length, ...cageList[cagePos] };
  renderPanel();
}

function renderPanel() {
  const latest = myLogs[0];
  const rating = myLogs.find((l) => l.rating != null)?.rating ?? null;
  const watched = myLogs.length > 0;

  $('#panel').innerHTML = `
    <div class="action-row">
      <button type="button" class="action-btn watched" id="btn-watched" aria-pressed="${watched}">${EYE}${watched ? 'Watched' : 'Watch'}</button>
      <button type="button" class="action-btn liked" id="btn-liked" aria-pressed="${!!latest?.liked}">${HEART}${latest?.liked ? 'Liked' : 'Like'}</button>
      <button type="button" class="action-btn watchlist" id="btn-watchlist" aria-pressed="${onWatchlist}">${onWatchlist ? CHECK : PLUS}Watchlist</button>
    </div>
    <div class="rate-box">
      <div class="label" id="rate-label">${rating ? 'Rated' : 'Rate'}</div>
      <div id="rate-stars"></div>
    </div>
    <button type="button" class="btn btn-green" id="btn-log">${watched ? 'Review or log again' : 'Review or log'}</button>
    <button type="button" class="rec-btn" id="btn-rec">
      <span class="rec-btn-icon" aria-hidden="true">📨</span>
      <span><strong>Send to a friend</strong>
        <small>Tell them “you have to watch this!” You'll hear when they rate it.</small></span>
    </button>
    <div class="panel-links">
      ${top4.includes(ep.id)
        ? '<button type="button" class="link-button" id="btn-top4" style="color:var(--text-soft)">★ In your Top 4 · Remove</button>'
        : top4.length < 4
          ? '<button type="button" class="link-button" id="btn-top4" style="color:var(--text-soft)">Add to your Top 4</button>'
          : '<a href="settings.html#top4" style="color:var(--text-soft)">Top 4 is full · Edit favourites</a>'}
      <button type="button" class="link-button" id="btn-list" style="color:var(--text-soft)">Add to a list…</button>    </div>`;
  $('#btn-list').addEventListener('click', async () => (await import('../lists.js?v=20261128095147')).openAddToList(ep));
  $('#btn-rec').addEventListener('click', () => openRecommend(ep));
  $('#btn-top4')?.addEventListener('click', toggleTop4);

  starInput($('#rate-stars'), { value: rating, size: 34, label: 'Your rating', onChange: setRating });
  $('#rate-stars').setAttribute('aria-labelledby', 'rate-label');
  $('#btn-watched').onclick = toggleWatched;
  $('#btn-liked').onclick = toggleLiked;
  $('#btn-watchlist').onclick = toggleWatchlist;
  $('#btn-log').onclick = () => logEpisode({ episode: ep, rewatch: watched });

  renderMyReview();

  const dated = myLogs.filter((l) => l.watched_on);
  $('#note').innerHTML = myLogs.length
    ? `<div class="note-card paper tilt-right"><strong>You've logged this ${myLogs.length === 1 ? 'once' : `${myLogs.length} times`}.</strong>
        ${dated.length ? `Last watched ${esc(formatDate(dated[0].watched_on))}.` : ''}
        <a href="diary.html" style="color:var(--bg);text-decoration:underline">See your diary</a>
        ${cageInfo ? `<span class="cage-note">🥊 Cage Match: <b>#${cageInfo.pos}</b> of ${cageInfo.of}${cageInfo.pos === 1 ? " · 👑 your champion" : ""} · <a href="cage.html" style="color:var(--bg);text-decoration:underline">Fight</a></span>` : ""}</div>`
    : '';
}

// Your own review(s) up top, like Letterboxd. Rated but no review yet: a prompt that
// adds the review to your existing log instead of making a new one.
function renderMyReview() {
  const box = $('#my-review');
  const reviewed = myLogs.filter((l) => l.review && l.review.trim());
  if (!myLogs.length) { box.hidden = true; return; }
  box.hidden = false;
  const meta = (l) => [
    l.rating != null ? `<span class="rating">${stars(l.rating)}</span>` : '',
    l.liked ? '<span class="heart" aria-label="Liked">♥</span>' : '',
    l.is_rewatch ? '<span>Rewatch</span>' : '',
    l.watched_on ? `<span>${esc(formatDate(l.watched_on, { month: 'short', day: 'numeric', year: 'numeric' }))}</span>` : '',
  ].join('');
  box.innerHTML = `
    <div class="section-head"><h2>Your review${reviewed.length > 1 ? 's' : ''}</h2></div>
    <div class="reviews">${reviewed.length
      ? reviewed.map((l) => `
        <article class="review my-review">
          ${avatarHTML(profile, 36)}
          <div class="review-body">
            <div class="review-meta"${l.rating != null && Number(l.rating) <= 1 ? ` data-going-home="${esc(profile.username)}"` : ''}><span>Review by <strong>you</strong></span>${meta(l)}</div>
            <p>${esc(l.review)}</p>
            <div class="review-foot">
              <button type="button" class="link-button" data-edit-log="${l.id}">Edit review</button>
              <a href="review.html?id=${l.id}">Likes and comments</a>
              <button type="button" class="link-button" data-share-review="${l.id}">🖼️ Share review</button>
              ${pcButtonHTML(l.rating)}
            </div>
          </div>
        </article>`).join('')
      : `<div class="review my-review">
          ${avatarHTML(profile, 36)}
          <div class="review-body">
            <div class="review-meta"><span>You</span>${meta(myLogs[0])}</div>
            <p>${myLogs[0].rating != null ? 'You rated this but haven\'t said why. Go on, the people need to know.' : 'You watched this but haven\'t reviewed it yet.'}</p>
            <div class="review-foot"><button type="button" class="btn btn-green" data-edit-log="${myLogs[0].id}" style="padding:6px 14px">Write a review</button></div>
          </div>
        </div>`}</div>`;
  box.querySelectorAll('[data-edit-log]').forEach((b) => {
    b.onclick = () => logEpisode({ episode: ep, log: myLogs.find((l) => l.id === Number(b.dataset.editLog)) });
  });
}

async function run(promise) {
  const { error } = await promise;
  if (error) alert(error.message);
  await refreshMine();
  refreshCommunity();
}

// A quick log with no date, used by the Watch/Like/Rate buttons when there's no log yet.
// Watching something takes it off your watchlist, same as the log dialog.
async function quickLog(extra) {
  const res = await supabase.from('logs').insert({ episode_id: ep.id, watched_on: null, ...extra });
  if (!res.error) await supabase.from('watchlist').delete().eq('episode_id', ep.id).eq('user_id', user.id);
  return res;
}

async function toggleWatched() {
  if (!myLogs.length) return run(quickLog({}));
  const n = myLogs.length;
  if (!confirm(`Remove ${n === 1 ? 'your log' : `all ${n} of your logs`} for this episode, including ratings and reviews? They'll be gone like Kenny, except they won't come back next week.`)) return;
  await run(supabase.from('logs').delete().eq('episode_id', ep.id).eq('user_id', user.id));
}

async function toggleLiked() {
  const latest = myLogs[0];
  await run(latest ? supabase.from('logs').update({ liked: !latest.liked }).eq('id', latest.id) : quickLog({ liked: true }));
}

async function toggleWatchlist() {
  await run(onWatchlist
    ? supabase.from('watchlist').delete().eq('episode_id', ep.id).eq('user_id', user.id)
    : supabase.from('watchlist').insert({ episode_id: ep.id }));
}

async function toggleTop4() {
  const next = top4.includes(ep.id) ? top4.filter((id) => id !== ep.id) : [...top4, ep.id].slice(0, 4);
  const { error } = await supabase.from('profiles').update({ top4: next }).eq('id', user.id);
  if (error) return alert(error.message);
  top4 = next;
  renderPanel();
}

async function setRating(value) {
  const target = myLogs[0];
  await run(target ? supabase.from('logs').update({ rating: value }).eq('id', target.id) : quickLog({ rating: value }));
  celebrate(value, tagNames, profile.favourite_character);
}

// ---- Everyone's numbers and reviews ----

async function refreshCommunity() {
  const [{ data: stats }, { data: hist }, { data: reviews }, { data: friendRating }, friends] = await Promise.all([
    supabase.from('episode_ratings').select('*').eq('episode_id', ep.id).maybeSingle(),
    supabase.from('episode_rating_histogram').select('rating, count').eq('episode_id', ep.id),
    supabase.from('logs')
      .select(REVIEW_SELECT)
      .eq('episode_id', ep.id).not('review', 'is', null).neq('review', '')
      .order('created_at', { ascending: false }).limit(50),
    supabase.rpc('friends_episode_rating', { p_episode: ep.id }),
    followingIds(user.id),
  ]);
  const fr = friendRating?.[0];

  const s = stats || {};
  $('#ep-counts').innerHTML = `
    <span title="People who watched">${EYE.replace(/28/g, '16').replace('currentColor', 'var(--green)')}${s.watcher_count ?? 0} watched</span>
    <span title="People who liked it">${HEART.replace(/28/g, '16').replace('currentColor', 'var(--orange)')}${s.like_count ?? 0} likes</span>`;

  const avgPart = (label, avg, n) => `<span title="${n} rating${n === 1 ? '' : 's'}">${label} <strong class="avg-big">${Number(avg).toFixed(1)}</strong></span>`;
  $('#avg').innerHTML = s.avg_rating
    ? `<span style="display:inline-flex;gap:16px;align-items:baseline">
        ${fr?.rating_count ? avgPart('Friends', fr.avg_rating, fr.rating_count) : ''}
        ${avgPart(fr?.rating_count ? 'Everyone' : 'Average', s.avg_rating, s.rating_count)}
        <span>${s.rating_count} rating${s.rating_count === 1 ? '' : 's'}</span></span>`
    : 'No ratings yet';

  const buckets = Array.from({ length: 10 }, (_, i) => (i + 1) / 2);
  const counts = buckets.map((b) => (hist || []).find((h) => Number(h.rating) === b)?.count ?? 0);
  const max = Math.max(1, ...counts);
  $('#histogram').innerHTML = `
    <div class="histogram" role="img" aria-label="Rating spread: ${buckets.map((b, i) => `${counts[i]} at ${b}`).join(', ')}">
      <span class="end">★</span>
      ${counts.map((c, i) => `<div class="bucket" style="height:${Math.max(3, (c / max) * 100)}%" title="${buckets[i]}★: ${c}"></div>`).join('')}
      <span class="end">★★★★★</span>
    </div>`;

  // Your own reviews are in "Your review" above. Friends first, then everyone else, newest first within each.
  const rank = (r) => (friends.has(r.user_id) ? 0 : 1);
  const sorted = (reviews || []).filter((r) => r.user_id !== user.id).sort((a, b) => rank(a) - rank(b));
  // Character accounts (Butters, Kyle) go first: the reviews live in code, their likes and comments in the DB.
  const guestList = guestReviewsFor(ep);
  const [extras, guestExtras] = await Promise.all([reviewExtras(sorted.map((r) => r.id), user.id), loadGuestExtras(guestList, user.id)]);
  const guests = guestList.map((g) => guestReviewHTML(g, guestExtras, user.id)).join('');
  $('#reviews').innerHTML = guests + (sorted.length
    ? sorted.map((r) => reviewHTML(r, { me: user.id, extras, friends, avgs: new Map([[ep.id, { avg: Number(s.avg_rating), count: s.rating_count ?? 0 }]]) })).join('')
    : guests ? '' : `<p class="empty">${esc(line('reviewsEmpty'))}</p>`);
  wireReviewLikes($('#reviews'), refreshCommunity);
  wireGuestReviews($('#reviews'), guestList, guestExtras, refreshCommunity);
}

// ---- Tags (everyone sees them; admins can add and remove) ----

async function renderTags() {
  const [{ data: mineTags }, { data: allTags }] = await Promise.all([
    supabase.from('episode_tags').select('tags(id, name, kind)').eq('episode_id', ep.id),
    profile.is_admin ? supabase.from('tags').select('id, name, kind').order('name') : Promise.resolve({ data: [] }),
  ]);
  const tags = (mineTags || []).map((t) => t.tags).filter(Boolean)
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  tagNames = tags.map((t) => t.name);

  $('#tags').innerHTML = `
    ${tags.map((t) => `<span class="tag-chip ${t.kind}"><a href="episodes.html?tag=${t.id}" style="color:inherit">${esc(t.name)}</a>
      ${profile.is_admin ? `<button type="button" data-untag="${t.id}" aria-label="Remove tag ${esc(t.name)}">×</button>` : ''}</span>`).join('')}
    ${profile.is_admin ? `
      <form class="tag-add" id="tag-add">
        <label class="visually-hidden" for="tag-name">Add a tag</label>
        <input type="text" id="tag-name" list="tag-options" placeholder="+ Add tag" maxlength="60" autocomplete="off">
        <datalist id="tag-options">${(allTags || []).map((t) => `<option value="${esc(t.name)}">${t.kind}</option>`).join('')}</datalist>
        <label class="visually-hidden" for="tag-kind">Tag type (for new tags)</label>
        <select id="tag-kind"><option value="character">Character</option><option value="theme">Theme</option></select>
        <button type="submit" class="btn btn-ghost" style="padding:6px 10px">Add</button>
      </form>` : ''}`;

  if (!profile.is_admin) return;
  $('#tags').querySelectorAll('[data-untag]').forEach((b) => b.onclick = async () => {
    await supabase.from('episode_tags').delete().eq('episode_id', ep.id).eq('tag_id', Number(b.dataset.untag));
    renderTags();
  });
  $('#tag-add').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#tag-name').value.trim();
    if (!name) return;
    let tag = (allTags || []).find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (!tag) {
      const { data, error } = await supabase.from('tags').insert({ name, kind: $('#tag-kind').value }).select('id, name, kind').single();
      if (error) return alert(error.message);
      tag = data;
    }
    const { error } = await supabase.from('episode_tags').upsert({ episode_id: ep.id, tag_id: tag.id });
    if (error) return alert(error.message);
    await renderTags();
    $('#tag-name')?.focus();
  });
}

// ---- Arc this episode belongs to ----

async function renderArc() {
  const arcs = await loadArcs();
  const arc = arcs.find((a) => a.episodeIds.includes(ep.id));
  if (!arc) { $('#arc-box').innerHTML = ''; return; }
  const [all, mine] = await Promise.all([loadAllEpisodes(), myLogMap(user.id)]);
  const byId = new Map(all.map((e) => [e.id, e]));
  const eps = arc.episodeIds.map((x) => byId.get(x)).filter(Boolean);
  const part = eps.findIndex((e) => e.id === ep.id) + 1;
  $('#arc-box').innerHTML = `
    <div class="arc-box paper">
      <div><span style="color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em">Part ${part} of ${eps.length}</span><br>
        <a href="arc.html?id=${arc.id}" style="font-weight:700">${esc(arc.name)}</a></div>
      <ol>${eps.map((e) => `<li${e.id === ep.id ? ' aria-current="true"' : ''}>${e.id === ep.id ? esc(e.title) : `<a href="episode.html?id=${e.id}">${esc(e.title)}</a>`}${mine.has(e.id) ? ' <span style="color:var(--green)" aria-label="watched">✓</span>' : ''}</li>`).join('')}</ol>
      <button type="button" class="btn btn-ghost" id="log-arc">Log the whole arc</button>
    </div>`;
  $('#log-arc').onclick = async () => {
    if (await openLogArc(arc, eps, mine)) window.dispatchEvent(new CustomEvent('parkboxd:logged'));
  };
}

async function renderNeighbours() {
  const all = await loadAllEpisodes();
  const i = all.findIndex((e) => e.id === ep.id);
  const prev = all[i - 1];
  const next = all[i + 1];
  $('#neighbours').innerHTML = `
    ${prev ? `<a href="episode.html?id=${prev.id}">← ${esc(epCode(prev))} ${esc(prev.title)}</a>` : '<span></span>'}
    ${next ? `<a href="episode.html?id=${next.id}">${esc(epCode(next))} ${esc(next.title)} →</a>` : '<span></span>'}`;
}
