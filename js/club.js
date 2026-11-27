// Butters' Book Club picks. Each week Butters suggests three episodes and members vote on which
// one becomes the next week's book. With no votes, his first suggestion wins (the original
// date-based pick), so weeks from before voting existed keep the same book.
import { supabase } from './supabase.js?v=20261127074510';
import { isAired } from './episodes.js?v=20261127074510';

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** The club's first week (it launched Thursday 26 Nov 2026). Earlier weeks never had a book. */
export const CLUB_START = '2026-11-23';

/** Monday 00:00 UTC of the week `offset` weeks from now (0 = this week, -1 = last week). */
export function weekStart(offset = 0) {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7; // Monday = 0
  const monday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day);
  return new Date(monday + offset * WEEK);
}

/** The week's key in club_votes: its Monday as YYYY-MM-DD. */
export const weekKey = (offset = 0) => weekStart(offset).toISOString().slice(0, 10);

function seededIndex(seed, n) {
  // mulberry32
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (((t ^ (t >>> 14)) >>> 0) % n);
}

const poolOf = (all) => all.filter((e) => e.kind === 'episode' && isAired(e)).sort((a, b) => a.id - b.id);

/** Butters' first suggestion for a week (the original date-based pick). */
export function weeklyPick(all, offset = 0) {
  const pool = poolOf(all);
  if (!pool.length) return null;
  const weekNo = Math.floor(weekStart(offset).getTime() / WEEK);
  return pool[seededIndex(weekNo, pool.length)];
}

/** Butters' three suggestions for a week: his first pick plus two more, the same for everyone. */
export function candidatesFor(all, offset = 0) {
  const pool = poolOf(all);
  const first = weeklyPick(all, offset);
  if (!first) return [];
  const out = [first];
  let seed = Math.floor(weekStart(offset).getTime() / WEEK) * 31 + 7;
  for (let tries = 0; out.length < Math.min(3, pool.length) && tries < 50; tries++) {
    const e = pool[seededIndex(seed++, pool.length)];
    if (!out.includes(e)) out.push(e);
  }
  return out;
}

/** Votes per candidate, and the winner: most votes, ties go to Butters' earlier suggestion. */
export function tally(candidates, votes) {
  const counts = new Map(candidates.map((c) => [c.id, 0]));
  for (const v of votes) if (counts.has(v.episode_id)) counts.set(v.episode_id, counts.get(v.episode_id) + 1);
  const winner = candidates.reduce((best, c) => (counts.get(c.id) > counts.get(best.id) ? c : best), candidates[0]);
  return { counts, winner };
}

/**
 * loadPicks(all, offsets) -> [{ offset, key, start, end, candidates, votes, counts, pick }]
 *   One query for every week asked for. `pick` is that week's book.
 */
export async function loadPicks(all, offsets) {
  const keys = offsets.map(weekKey);
  const { data } = await supabase.from('club_votes').select('user_id, week_start, episode_id').in('week_start', keys);
  return offsets.map((offset) => {
    const key = weekKey(offset);
    const candidates = candidatesFor(all, offset);
    const votes = (data || []).filter((v) => v.week_start === key);
    const { counts, winner } = candidates.length ? tally(candidates, votes) : { counts: new Map(), winner: null };
    // real: the club existed that week (weeks before CLUB_START are hidden everywhere).
    return { offset, key, real: key >= CLUB_START, start: weekStart(offset), end: weekStart(offset + 1), candidates, votes, counts, pick: winner };
  });
}
