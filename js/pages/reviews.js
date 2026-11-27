// reviews.html?u=name&sort=new|high|low|liked: every review a user has written.
import { initPage } from '../layout.js?v=20261127123333';
import { supabase } from '../supabase.js?v=20261127123333';
import { SITE_NAME } from '../config.js?v=20261127123333';
import { $, esc, params, profileTabsHTML } from '../ui.js?v=20261127123333';
import { reviewHTML, reviewExtras, wireReviewLikes, followingIds, REVIEW_SELECT } from '../social.js?v=20261127123333';
import { episodeAverages } from '../insights.js?v=20261127123333';

const { profile: me } = await initPage({ title: 'Reviews', auth: 'required' });
const root = $('#reviews');

const wanted = (params.get('u') || me.username).toLowerCase();
const SORTS = [['new', 'Newest'], ['high', 'Highest rated'], ['low', 'Lowest rated'], ['liked', 'Most liked']];
const sort = SORTS.some(([k]) => k === params.get('sort')) ? params.get('sort') : 'new';
const { data: person } = await supabase.from('profiles').select('id, username, display_name').eq('username', wanted).maybeSingle();

if (!person) {
  root.innerHTML = `<div class="big-message"><h1 class="cut">Nobody by that name</h1><a class="btn btn-green" href="reviews.html">Your reviews</a></div>`;
  root.removeAttribute('aria-busy');
} else {
  await render();
  window.addEventListener('parkboxd:logged', render);
}

async function render() {
  const isMe = person.id === me.id;
  const name = person.display_name || person.username;
  const u = encodeURIComponent(person.username);
  document.title = `${isMe ? 'Your reviews' : `${name}'s reviews`} · ${SITE_NAME}`;

  const [{ data: rows }, friends, avgs] = await Promise.all([
    supabase.from('logs').select(`${REVIEW_SELECT}, episodes(id, kind, season, number, title, air_date, still_path)`)
      .eq('user_id', person.id).not('review', 'is', null).neq('review', '')
      .order('created_at', { ascending: false }).limit(1000),
    followingIds(me.id),
    episodeAverages(),
  ]);
  const reviews = (rows || []).filter((r) => r.review.trim());
  const extras = await reviewExtras(reviews.map((r) => r.id), me.id);
  const rating = (r) => (r.rating == null ? -1 : Number(r.rating));
  if (sort === 'high') reviews.sort((a, b) => rating(b) - rating(a));
  if (sort === 'low') reviews.sort((a, b) => (a.rating == null) - (b.rating == null) || rating(a) - rating(b));
  if (sort === 'liked') reviews.sort((a, b) => (extras.likes.get(b.id) || 0) - (extras.likes.get(a.id) || 0));

  root.innerHTML = `
    <div>
      <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">${isMe ? 'Your reviews' : `${esc(name)}'s reviews`}</h1>
      ${profileTabsHTML(person.username, 'reviews')}
    </div>
    <section>
      <div class="section-head"><h2>${reviews.length} review${reviews.length === 1 ? '' : 's'}</h2>
        ${reviews.length > 1 ? `<div class="chips" role="group" aria-label="Sort">${SORTS.map(([k, label]) =>
          `<a class="chip" href="reviews.html?u=${u}&sort=${k}" aria-pressed="${k === sort}">${label}</a>`).join('')}</div>` : ''}
      </div>
      <div class="reviews" id="review-list">${reviews.length
        ? reviews.map((r) => reviewHTML(r, { me: me.id, extras, friends, avgs, showEpisode: true })).join('')
        : `<p class="empty">${isMe
          ? 'No reviews yet. Rate something, then hit "Review or log" and tell everyone what you think. Cartman already has opinions, why not you?'
          : `${esc(name)} hasn't written any reviews yet. The strong, silent type, like Kenny.`}</p>`}</div>
    </section>`;
  root.removeAttribute('aria-busy');
  wireReviewLikes($('#review-list'), render);
}
