// Characters who follow certain members: they show in that member's followers list and send one
// message saying so. Browser only (character accounts aren't in the database); whether the
// message was read is remembered per device in localStorage.
import { BUTTERS } from './butters-profile.js?v=20261128091532';
import { CARTMAN } from './cartman-profile.js?v=20261128091532';
import { KENNY } from './kenny-profile.js?v=20261128091532';

const SENT = '2026-11-28T07:00:00Z';

// member username -> [the character, what they sent]
const FOLLOWS = {
  eliyagos: [CARTMAN, "Seriously, you guys, I followed you. Don't get all weepy about it, asshole. There's a chance I might comment on your reviews now. Whatever, I do what I want!"],
  itai: [KENNY, 'Mmph mmf! Mmf mmph mm-mmf, mmph!\n\n(Kenny followed you. There\'s now a chance he might comment on your reviews.)'],
  paratyam: [BUTTERS, "Hiya, best friend! I followed you! Now there's a chance I might comment on your reviews. Gee, I sure hope that's okay!"],
};

/** The usernames of the characters following this member. */
export const characterFollowers = (username) => (FOLLOWS[username] ? [FOLLOWS[username][0].username] : []);

const readKey = (userId) => `parkboxd-charmsg-read-${userId}`;

/** The character's conversation for messages.html, or null if nobody wrote to this member. */
export function characterChat(userId, username) {
  if (!FOLLOWS[username]) return null;
  const [who, body] = FOLLOWS[username];
  const id = `character-${who.username}`;
  const read = !!localStorage.getItem(readKey(userId));
  return {
    p: { ...who, id, character: true },
    last: { id, sender_id: id, recipient_id: userId, body, read, created_at: SENT },
    unread: read ? 0 : 1,
  };
}

export const markCharacterRead = (userId) => localStorage.setItem(readKey(userId), '1');
