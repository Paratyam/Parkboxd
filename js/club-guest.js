// The Book Club's weekly guest reader: Kyle, Cartman, Stan and Kenny take turns. Their review is
// their line about that episode (js/data/<name>-notes.js; Kenny's is muffled) plus one of their 15
// verdicts (js/data/guest-verdicts.js: 5 bad, 5 average, 5 good), picked at random but the same for
// everyone all week. If they've already reviewed the episode, they keep that review's rating.
import { CLUB_START } from './club.js?v=20261127211246';
import { guestReviewsFor, characterGuest } from './guest-reviews.js?v=20261127211246';
import { KYLE_NOTES } from './data/kyle-notes.js?v=20261127211246';
import { CARTMAN_NOTES } from './data/cartman-notes.js?v=20261127211246';
import { STAN_NOTES } from './data/stan-notes.js?v=20261127211246';
import { VERDICTS } from './data/guest-verdicts.js?v=20261127211246';

const ORDER = ['kyle', 'cartman', 'stan', 'kenny'];

const NOTES = { kyle: KYLE_NOTES, cartman: CARTMAN_NOTES, stan: STAN_NOTES };

// Only used if an episode has no note yet (a newly aired one).
const FALLBACK = {
  kyle: "Butters asked me to be the guest this week, so watch the whole thing before you argue about it.",
  cartman: "I'm only here because Butters promised snacks. There are no snacks. I'm reviewing this under protest.",
  stan: "Butters asked me to be the guest, so, hey. I don't have a whole speech or anything.",
};

// Kenny's take on any episode: muffled, built from the episode number so it never changes.
const MUFFLED = ['Mmph', 'mmf', 'mm-mmph', 'mmph mm', 'mm-hmm', 'mmf-mm', 'mmm', 'mph'];
function kennyNote(ep) {
  let n = (Math.imul(ep.season * 100 + ep.number, 2654435761) >>> 0) || 1;
  const next = (max) => { n = (Math.imul(n, 48271) + 11) >>> 0; return (n >>> 8) % max; };
  return Array.from({ length: 2 + next(2) }, () => {
    const words = Array.from({ length: 3 + next(4) }, () => MUFFLED[next(MUFFLED.length)].toLowerCase()).join(' ');
    return words[0].toUpperCase() + words.slice(1) + ['.', '!', '!', '?'][next(4)];
  }).join(' ');
}

// Star ratings that go with each kind of verdict.
const STARS = { bad: [0.5, 1, 1.5, 2], average: [2.5, 3, 3.5], good: [4, 4.5, 5] };
const tierOf = (rating) => (rating <= 2 ? 'bad' : rating < 4 ? 'average' : 'good');

// A random-looking but repeatable pick, so everyone sees the same review.
function rng(seed) {
  let a = seed >>> 0;
  return (list) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return list[((t ^ (t >>> 14)) >>> 0) % list.length];
  };
}

/** The guest review for the club week starting `start` (Date), about episode `ep`. */
export function clubGuest(ep, start) {
  const week = Math.max(0, Math.round((start.getTime() - Date.parse(`${CLUB_START}T00:00:00Z`)) / (7 * 86400000)));
  const username = ORDER[week % ORDER.length];
  const own = guestReviewsFor(ep).find((g) => g.who.username === username);
  const pick = rng(Math.imul(Math.floor(start.getTime() / 604800000), 7919) + ep.id);
  const tier = own ? tierOf(own.rating) : pick(Object.keys(STARS));
  const rating = own ? own.rating : pick(STARS[tier]);
  const line = username === 'kenny' ? kennyNote(ep) : NOTES[username][`${ep.season}.${ep.number}`] || FALLBACK[username];
  return {
    // No title: Cartman's comments belong under Kyle's own written reviews, not these.
    ...characterGuest(username), title: '', rating, liked: rating >= 4,
    key: `${username}:club${start.toISOString().slice(0, 10).replace(/-/g, '')}`,
    text: `${line} ${pick(VERDICTS[username][tier])}`,
  };
}
