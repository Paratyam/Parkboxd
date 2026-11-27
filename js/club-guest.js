// The Book Club's weekly guest reader: Kyle, Cartman, Stan and Kenny take turns giving a short
// take on Butters' pick. If the guest already reviewed that episode, that review is used (with its
// likes and comments); otherwise it's one of the lines below, the same for everyone.
import { CLUB_START } from './club.js?v=20261127204240';
import { guestReviewsFor, characterGuest } from './guest-reviews.js?v=20261127204240';
import { cartmanRating } from './cartman-profile.js?v=20261127204240';
import { kyleRating } from './kyle-profile.js?v=20261127204240';

const ORDER = ['kyle', 'cartman', 'stan', 'kenny'];

const LINES = {
  kyle: [
    "Butters asked me to be the guest this week, so I actually did the work. There's usually a real point in these if you pay attention. Please pay attention.",
    "Okay, I watched it again so I'd have something smart to say. Watch the whole thing before you argue about it.",
    "I told Butters it isn't a book. He gave me a library card anyway. So come to the discussion with an actual opinion, you guys.",
    "I've got two pages of notes. Butters said I get three sentences, so: worth discussing, and don't let Cartman summarise it for you.",
  ],
  cartman: [
    "I'm only here because Butters promised snacks. There are no snacks. I'm reviewing this under protest.",
    "As this week's guest of honour, which is what I'm calling it, I think this episode needs way more of me. All of them do.",
    "Butters, this club is lame, and I'm going to run it way better when I take over. Anyway, the episode. Whatever.",
    "You guys, seriously, a book club with no books? Even I wouldn't scam people this lazily.",
  ],
  stan: [
    "Butters asked me to be the guest, so, hey. I watched it. I don't have a whole speech or anything.",
    "Kyle said I should say something deep. I think it's an episode and you should watch it and see what you think.",
    "My dad found out I'm doing a book club and now he wants to be a guest too. Please don't let him.",
    "Dude, I didn't know there'd be homework. It wasn't bad homework, though.",
  ],
  kenny: [
    "Mmph mmf! Mmf mm-mmph mmf!",
    "Mmf mmph mm mmf. Mmph? Mmph!",
    "Mm-hmm! Mmf mmph mmph mm-mmf!",
    "Mmph mmf mm... mmf mmph. Mmf!!",
  ],
};

/** The guest review for the club week starting `start` (Date), about episode `ep`. */
export function clubGuest(all, ep, start) {
  const week = Math.max(0, Math.round((start.getTime() - Date.parse(`${CLUB_START}T00:00:00Z`)) / (7 * 86400000)));
  const username = ORDER[week % ORDER.length];
  const own = guestReviewsFor(ep).find((g) => g.who.username === username);
  if (own) return own;
  const g = characterGuest(username);
  // Kenny and Stan only show stars for episodes they've rated on their profiles.
  const rating = username === 'cartman' ? cartmanRating(ep) : username === 'kyle' ? kyleRating(all, ep)
    : g.rated.find(([t]) => t === ep.title)?.[1];
  const lines = LINES[username];
  return {
    ...g, title: ep.title, liked: false, note: undefined, rating: rating ?? null,
    key: `${username}:club${start.toISOString().slice(0, 10).replace(/-/g, '')}`,
    // Moves on one line each time the same guest comes back round.
    text: lines[Math.floor(week / ORDER.length) % lines.length],
  };
}
