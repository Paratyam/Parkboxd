// Rare surprise visits on members' reviews: Cartman leaves a nasty comment, Kenny likes the
// review and mumbles under it. Like Butters' likes, nothing is in the database: each is picked
// from the review id, so it is decided once per review and reloading never re-rolls it.
import { CARTMAN } from './cartman-profile.js?v=20261128085740';
import { KENNY } from './kenny-profile.js?v=20261128085740';

export const RARE = 1 / 500;
export const OFTEN = 1 / 10;
// Members (by username) who get visited more.
const CARTMAN_FAVOURITES = ['eliyagos'];
const KENNY_FAVOURITES = ['itai'];

export const CARTMAN_INSULTS = [
  "That is the dumbest fucking review I have ever read. Screw you guys, I'm going home!",
  "Who the hell asked you, asshole? Your opinion is pure shit. Respect my authoritah!",
  "Wow. You typed all that crap and still said nothing, you dumbass. Suck my balls!",
  "Seriously, you guys, this dipshit thinks they're a critic. Delete your damn account.",
  "I've read smarter shit on a bathroom stall, you useless asshole. Screw you, I'm going home!",
  "Your taste is complete ass and everybody fucking knows it. Whatever! I do what I want!",
  "Holy shit, shut the hell up. Nobody gives a crap what you think. Suck my balls!",
  "You call that a review, you brain-dead jackass? RESPECT MY FUCKING AUTHORITAH!",
];

export const KENNY_MUMBLES = [
  'Mmph mmf!', 'Mmf mm-hmm mmph!', 'MMPH! Mmf mmf!', 'Mm mmph mmf. Mmf!',
  'Woohoo-mmf!', 'Mmf mmph mmm-mmph!', 'Hmm-mmf! Mmph!', 'MMMPH!',
];

// A fixed number from 0 to 1 for this review (a different salt per question).
function roll(id, salt) {
  let x = Math.imul(Number(id) ^ salt, 0x9e3779b1);
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

const visited = (r, salt, favourites) => !!r?.review?.trim()
  && roll(r.id, salt) < (favourites.includes(r.profiles?.username) ? OFTEN : RARE);

export const cartmanVisits = (r) => visited(r, 0x0ca27a, CARTMAN_FAVOURITES);
/** When true, Kenny both likes the review and comments on it. */
export const kennyVisits = (r) => visited(r, 0x0be221, KENNY_FAVOURITES);

/**
 * Their comments on a review, shaped like comment rows for threadHTML (comments.js).
 *   r: a log row with id, review, created_at and profiles(username)
 */
export function visitComments(r) {
  return [
    [cartmanVisits(r), CARTMAN, CARTMAN_INSULTS, -1, 0x11],
    [kennyVisits(r), KENNY, KENNY_MUMBLES, -2, 0x22],
  ].filter(([came]) => came).map(([, who, lines, id, salt]) => ({
    id,
    parent_id: null,
    user_id: null,
    character: who.username,
    // A few minutes after the review, never in the future.
    created_at: new Date(Math.min(Date.now(), new Date(r.created_at).getTime() + -id * 180000)).toISOString(),
    body: lines[Math.floor(roll(r.id, salt) * lines.length)],
    profiles: who,
  }));
}
