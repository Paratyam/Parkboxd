// Book Club notifications, worked out in the browser (no server job needed): a note when a new
// week's book starts, and one telling you whether the episode you voted for won.
// Also a note when Butters likes one of your reviews (buttersLikes in js/butters.js). Not for his
// best friends: he likes all of theirs. "Read" is remembered per person in localStorage.
// Stan's site tour (js/tour.js) travels the same way, so its notes are merged in here too.
import { supabase } from './supabase.js?v=20261127182557';
import { buttersLikes, BEST_FRIENDS } from './butters.js?v=20261127182557';
import { loadPicks, weekKey, CLUB_START } from './club.js?v=20261127182557';
import { tourNotes } from './tour.js?v=20261127182557';

const seenKey = (userId) => `parkboxd-club-seen-${userId}`;
const seen = (userId) => new Set(JSON.parse(localStorage.getItem(seenKey(userId)) || '[]'));

/** [{ id, text, href, created_at, read, from? }]: book notes, Butters' likes and Stan's tour. */
export async function clubNotes(userId) {
  if (!userId) return [];
  const [book, likes, tour] = await Promise.all(
    [bookNotes, buttersLikeNotes, tourNotes].map((get) => get(userId).catch(() => [])));
  const read = seen(userId);
  return [...book, ...likes, ...tour].filter((n) => !isHiddenClubNote(userId, n.id)).map((n) => ({ ...n, read: read.has(n.id) }));
}

// Butters liked your review. Only reviews of 4 stars and up can qualify, so only those are fetched.
async function buttersLikeNotes(userId) {
  const { data } = await supabase.from('logs')
    .select('id, rating, review, created_at, episodes(title), profiles!logs_user_id_fkey(username)')
    .eq('user_id', userId).gte('rating', 4).not('review', 'is', null).neq('review', '')
    .order('created_at', { ascending: false }).limit(500);
  return (data || []).filter((r) => !BEST_FRIENDS.includes(r.profiles?.username) && buttersLikes(r)).map((r) => ({
    id: `butters-like-${r.id}`, href: `review.html?id=${r.id}`, created_at: r.created_at,
    text: `🍔 Butters liked your review of “${r.episodes?.title || 'an episode'}”. Gee whiz, he thinks it's swell!`,
  }));
}

async function bookNotes(userId) {
  if (weekKey(0) < CLUB_START) return [];
  const { loadAllEpisodes } = await import('./episodes.js?v=20261127182557');
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
  return notes;
}

export function markClubNotesRead(userId, notes) {
  const read = seen(userId);
  notes.forEach((n) => read.add(n.id));
  localStorage.setItem(seenKey(userId), JSON.stringify([...read].slice(-400)));
}

/** "Clear all" on the notifications page: hide these notes for good. */
export function hideClubNotes(userId, notes) {
  const key = `parkboxd-club-hidden-${userId}`;
  const hidden = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  notes.forEach((n) => hidden.add(n.id));
  localStorage.setItem(key, JSON.stringify([...hidden].slice(-400)));
}

export const isHiddenClubNote = (userId, id) => JSON.parse(localStorage.getItem(`parkboxd-club-hidden-${userId}`) || '[]').includes(id);
