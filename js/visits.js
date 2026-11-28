// Rare surprise visits on members' reviews: Cartman leaves a nasty comment, Kenny likes the
// review and mumbles under it, Butters cheers on his best friend. The visits aren't in the
// database: each is picked from the review id, so it is decided once per review and reloading
// never re-rolls it. Replies to them are real comments with `reply_character` set.
import { BUTTERS } from './butters-profile.js?v=20261128091302';
import { buttersComment } from './butters.js?v=20261128091302';
import { CARTMAN } from './cartman-profile.js?v=20261128091302';
import { KENNY } from './kenny-profile.js?v=20261128091302';

export const RARE = 1 / 500;
export const OFTEN = 1 / 10;
// Members (by username) who get visited more.
const CARTMAN_FAVOURITES = ['eliyagos'];
const KENNY_FAVOURITES = ['itai'];
// Butters only comments for these (the Book Club has its own comments from him).
const BUTTERS_FAVOURITES = ['paratyam'];

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

const visited = (r, salt, favourites, others = RARE) => !!r?.review?.trim()
  && roll(r.id, salt) < (favourites.includes(r.profiles?.username) ? OFTEN : others);

export const cartmanVisits = (r) => visited(r, 0x0ca27a, CARTMAN_FAVOURITES);
/** When true, Kenny both likes the review and comments on it. */
export const kennyVisits = (r) => visited(r, 0x0be221, KENNY_FAVOURITES);
export const buttersVisits = (r) => visited(r, 0x0b0775, BUTTERS_FAVOURITES, 0);

/**
 * Their comments on a review, shaped like comment rows for threadHTML (comments.js).
 *   r: a log row with id, review, created_at and profiles(username)
 */
export function visitComments(r) {
  return [
    [cartmanVisits(r), CARTMAN, CARTMAN_INSULTS, -1, 0x11],
    [kennyVisits(r), KENNY, KENNY_MUMBLES, -2, 0x22],
    [buttersVisits(r), BUTTERS, [buttersComment(r, { club: false })], -3, 0x33],
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

/**
 * A review's whole thread: the saved comments plus any visits, oldest first. Saved replies to a
 * visit are hung under it (a reply whose visit isn't there shows as a normal comment).
 */
export function withVisits(r, saved) {
  const visits = visitComments(r);
  const ids = new Map(visits.map((v) => [v.character, v.id]));
  const rows = saved.map((c) => (!c.parent_id && ids.has(c.reply_character) ? { ...c, parent_id: ids.get(c.reply_character) } : c));
  return [...rows, ...visits].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}
