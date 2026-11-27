// Reviews from the built-in character accounts (Butters, Kyle), shown on episode pages.
// The reviews live in code, not the database, so they never count toward averages. People can
// still like and comment on them: guest_review_likes / guest_review_comments, keyed by
// '<character>:<normalised episode title>'.
import { supabase } from './supabase.js?v=20261127122852';
import { esc, stars, avatarHTML, toast } from './ui.js?v=20261127122852';
import { threadHTML, wireThread } from './comments.js?v=20261127122852';
import { pcButtonHTML, installPC } from './pc.js?v=20261127122852';
import { BUTTERS, RATED as B_RATED, REVIEWS as B_REVIEWS } from './butters-profile.js?v=20261127122852';
import { KYLE, RATED as K_RATED, REVIEWS as K_REVIEWS } from './kyle-profile.js?v=20261127122852';

const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

const GUESTS = [
  { who: BUTTERS, rated: B_RATED, reviews: B_REVIEWS, noteLabel: '',
    thanks: ['Gee, thanks! Nobody ever likes my stuff!', "Oh. That's okay. I'll just go sit by myself for a bit."],
    placeholder: 'Say something nice to Butters… or about his review' },
  { who: KYLE, rated: K_RATED, reviews: K_REVIEWS, noteLabel: "Kyle's note",
    thanks: ['Thanks, dude. Finally, someone gets it.', 'Wow. Okay. Cartman put you up to this, right?'],
    placeholder: 'Agree with Kyle? Argue with Kyle? He can take it.' },
];

installPC(); // "PC it" toggle (also installed by social.js; installing twice is a no-op)

// Threads stay open across re-renders (a new comment re-renders the whole list).
const openThreads = new Set();
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function guestReviewsFor(ep) {
  if (!ep?.title) return [];
  const key = norm(ep.title);
  return GUESTS.flatMap((g) => {
    const rev = g.reviews.find(([t]) => norm(t) === key);
    if (!rev) return [];
    const rate = g.rated.find(([t]) => norm(t) === key);
    return [{ ...g, key: `${g.who.username}:${key}`, rating: rate?.[1] ?? 5, liked: rate?.[2] ?? false, text: rev[1], note: rev[2] }];
  });
}

// Likes and comments for these reviews: { likes: Map(key -> n), mine: Set(key), comments: Map(key -> rows) }.
export async function loadGuestExtras(guests, me) {
  const keys = guests.map((g) => g.key);
  const out = { likes: new Map(), mine: new Set(), comments: new Map() };
  if (!keys.length) return out;
  const [{ data: likes }, { data: comments }] = await Promise.all([
    supabase.from('guest_review_likes').select('review_key, user_id').in('review_key', keys),
    supabase.from('guest_review_comments')
      .select('id, review_key, user_id, parent_id, body, created_at, profiles(username, display_name, avatar_color, avatar_icon)')
      .in('review_key', keys).order('created_at'),
  ]);
  for (const l of likes || []) {
    out.likes.set(l.review_key, (out.likes.get(l.review_key) || 0) + 1);
    if (l.user_id === me) out.mine.add(l.review_key);
  }
  for (const c of comments || []) out.comments.set(c.review_key, [...(out.comments.get(c.review_key) || []), c]);
  return out;
}

export function guestReviewHTML(g, extras, me) {
  const likes = extras?.likes.get(g.key) || 0;
  const liked = extras?.mine.has(g.key);
  const comments = extras?.comments.get(g.key) || [];
  const open = openThreads.has(g.key);
  return `
    <article class="review guest-review" data-guest="${esc(g.key)}">
      ${avatarHTML(g.who, 36)}
      <div class="review-body">
        <div class="review-meta">
          <span>Review by <a href="profile.html?u=${encodeURIComponent(g.who.username)}"><strong>${esc(g.who.display_name)}</strong></a></span>
          <span class="guest-tag" title="A built-in character account. Doesn't count toward the average.">Character</span>
          <span class="rating">${stars(g.rating)}</span>
          ${g.liked ? '<span class="heart" aria-label="Liked">♥</span>' : ''}
        </div>
        <p>${esc(g.text)}</p>
        ${g.note ? `<p class="guest-note">📖 <strong>${esc(g.noteLabel)}:</strong> ${esc(g.note)}</p>` : ''}
        ${extras ? `
        <div class="review-foot">
          <button type="button" class="link-button review-like" data-guest-like aria-pressed="${!!liked}">${liked ? '♥ Liked' : '♡ Like review'}</button>
          <button type="button" class="link-button" data-guest-toggle aria-expanded="${open}">${plural(likes, 'like')} · ${plural(comments.length, 'comment')}</button>
          ${pcButtonHTML(g.rating)}
        </div>
        <div class="butters-thread guest-thread" data-guest-thread ${open ? '' : 'hidden'}>
          ${comments.length ? threadHTML(comments, { me }) : ''}
          <form class="butters-comment-form" data-guest-form novalidate>
            <label class="visually-hidden" for="gc-${esc(g.key)}">Comment on ${esc(g.who.display_name)}'s review</label>
            <textarea id="gc-${esc(g.key)}" maxlength="2000" rows="2" placeholder="${esc(g.placeholder)}"></textarea>
            <button type="submit" class="btn btn-green">Comment</button>
          </form>
        </div>` : ''}
      </div>
    </article>`;
}

// Like buttons, the comments toggle, the comment form and reply/edit/delete in each thread.
export function wireGuestReviews(root, guests, extras, onChange) {
  for (const g of guests) {
    const card = root.querySelector(`[data-guest="${g.key}"]`);
    if (!card) continue;
    const thread = card.querySelector('[data-guest-thread]');
    card.querySelector('[data-guest-toggle]').onclick = (e) => {
      const show = thread.hidden;
      thread.hidden = !show;
      e.currentTarget.setAttribute('aria-expanded', String(show));
      if (show) { openThreads.add(g.key); thread.querySelector('textarea').focus(); } else openThreads.delete(g.key);
    };
    card.querySelector('[data-guest-like]').onclick = async (e) => {
      const b = e.currentTarget;
      const liked = b.getAttribute('aria-pressed') === 'true';
      b.disabled = true;
      const { error } = liked
        ? await supabase.from('guest_review_likes').delete().eq('review_key', g.key) // RLS: only your own row
        : await supabase.from('guest_review_likes').insert({ review_key: g.key });
      if (error) { b.disabled = false; return toast(error.message); }
      toast(g.thanks[liked ? 1 : 0]);
      onChange();
    };
    card.querySelector('[data-guest-form]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const ta = e.currentTarget.querySelector('textarea');
      const body = ta.value.trim();
      if (!body) return toast('Write something first.');
      const btn = e.submitter;
      if (btn) btn.disabled = true;
      const { error } = await supabase.from('guest_review_comments').insert({ review_key: g.key, body });
      if (btn) btn.disabled = false;
      if (error) return toast(error.message);
      openThreads.add(g.key);
      onChange();
    });
    wireThread(thread, { table: 'guest_review_comments', extra: { review_key: g.key }, comments: extras.comments.get(g.key) || [], onChange });
  }
}
