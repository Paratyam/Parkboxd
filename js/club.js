// Episode of the week: the same pick for everyone, worked out from the date (no database needed).
import { isAired } from './episodes.js';

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Monday 00:00 UTC of the week `offset` weeks from now (0 = this week, -1 = last week). */
export function weekStart(offset = 0) {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7; // Monday = 0
  const monday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day);
  return new Date(monday + offset * WEEK);
}

function seededIndex(seed, n) {
  // mulberry32
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (((t ^ (t >>> 14)) >>> 0) % n);
}

/** The pick for a week: a random aired regular episode, the same for everyone. */
export function weeklyPick(all, offset = 0) {
  const pool = all.filter((e) => e.kind === 'episode' && isAired(e)).sort((a, b) => a.id - b.id);
  if (!pool.length) return null;
  const weekNo = Math.floor(weekStart(offset).getTime() / WEEK);
  return pool[seededIndex(weekNo, pool.length)];
}
