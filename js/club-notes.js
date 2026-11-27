// Book Club notifications, worked out in the browser (no server job needed): a note when a new
// week's book starts, and one telling you whether the episode you voted for won.
// "Read" is remembered per person in localStorage.
import { loadPicks, weekKey, CLUB_START } from './club.js?v=20261127032110';

const seenKey = (userId) => `parkboxd-club-seen-${userId}`;
const seen = (userId) => new Set(JSON.parse(localStorage.getItem(seenKey(userId)) || '[]'));

/** [{ id, text, href, created_at, read }] for this week. */
export async function clubNotes(userId) {
  if (!userId || weekKey(0) < CLUB_START) return [];
  const { loadAllEpisodes } = await import('./episodes.js?v=20261127032110');
  const [pk] = await loadPicks(await loadAllEpisodes(), [0]);
  if (!pk?.pick) return [];
  const title = pk.pick.title;
  const when = pk.start.toISOString();
  const notes = [{ id: `club-new-${pk.key}`, href: 'club.html', created_at: when,
    text: `📚 New Book Club book: “${title}”. Butters already wrote his review, and it's real nice!` }];
  const myVote = pk.votes.find((v) => v.user_id === userId);
  if (myVote) {
    notes.push({ id: `club-vote-${pk.key}`, href: 'club.html', created_at: when,
      text: myVote.episode_id === pk.pick.id
        ? `🗳️ Your vote won! “${title}” is this week's book. Democracy is swell!`
        : `🗳️ Your pick lost the vote. “${title}” won this week. Butters says you can't win 'em all.` });
  }
  const read = seen(userId);
  return notes.filter((n) => !isHiddenClubNote(userId, n.id)).map((n) => ({ ...n, read: read.has(n.id) }));
}

export function markClubNotesRead(userId, notes) {
  const read = seen(userId);
  notes.forEach((n) => read.add(n.id));
  localStorage.setItem(seenKey(userId), JSON.stringify([...read].slice(-40)));
}

/** "Clear all" on the notifications page: hide these notes for good. */
export function hideClubNotes(userId, notes) {
  const key = `parkboxd-club-hidden-${userId}`;
  const hidden = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  notes.forEach((n) => hidden.add(n.id));
  localStorage.setItem(key, JSON.stringify([...hidden].slice(-40)));
}

export const isHiddenClubNote = (userId, id) => JSON.parse(localStorage.getItem(`parkboxd-club-hidden-${userId}`) || '[]').includes(id);
