// Reviews from the built-in character accounts (Butters, Kyle), shown on episode pages.
// They live in code, not the database, so they never count toward averages or likes.
import { esc, stars, avatarHTML } from './ui.js?v=20261127070806';
import { BUTTERS, RATED as B_RATED, REVIEWS as B_REVIEWS } from './butters-profile.js?v=20261127070806';
import { KYLE, RATED as K_RATED, REVIEWS as K_REVIEWS } from './kyle-profile.js?v=20261127070806';

const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

const GUESTS = [
  { who: BUTTERS, rated: B_RATED, reviews: B_REVIEWS, noteLabel: '' },
  { who: KYLE, rated: K_RATED, reviews: K_REVIEWS, noteLabel: "Kyle's note" },
];

export function guestReviewsFor(ep) {
  if (!ep?.title) return [];
  const key = norm(ep.title);
  return GUESTS.flatMap(({ who, rated, reviews, noteLabel }) => {
    const rev = reviews.find(([t]) => norm(t) === key);
    if (!rev) return [];
    const rate = rated.find(([t]) => norm(t) === key);
    return [{ who, rating: rate?.[1] ?? 5, liked: rate?.[2] ?? false, text: rev[1], note: rev[2], noteLabel }];
  });
}

export function guestReviewHTML(g) {
  const name = g.who.display_name;
  return `
    <article class="review guest-review">
      ${avatarHTML(g.who, 36)}
      <div class="review-body">
        <div class="review-meta">
          <span>Review by <a href="profile.html?u=${encodeURIComponent(g.who.username)}"><strong>${esc(name)}</strong></a></span>
          <span class="guest-tag" title="A built-in character account. Doesn't count toward the average.">Character</span>
          <span class="rating">${stars(g.rating)}</span>
          ${g.liked ? '<span class="heart" aria-label="Liked">♥</span>' : ''}
        </div>
        <p>${esc(g.text)}</p>
        ${g.note ? `<p class="guest-note">📖 <strong>${esc(g.noteLabel)}:</strong> ${esc(g.note)}</p>` : ''}
      </div>
    </article>`;
}
