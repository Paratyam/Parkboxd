// Stan's Picks: episodes you haven't seen that people with your taste rated highly.
// Each other member counts more the closer their taste is to yours (taste match on shared ratings).
import { tasteMatch } from './insights.js?v=20261128081746';
import { isAired } from './episodes.js?v=20261128081746';

/**
 * stanPicks({ meId, everyone, seen, all, avgs, limit }) -> [{ ep, score, raters, reason }]
 *   everyone: Map(userId -> Map(episodeId -> stars)); seen: Set of episode ids you've logged;
 *   avgs: Map(episodeId -> { avg, count }) for the whole site (used as a fallback).
 */
export function stanPicks({ meId, everyone, seen, all, avgs, names = new Map(), limit = 6 }) {
  const mine = everyone.get(meId) || new Map();
  const byId = new Map(all.map((e) => [e.id, e]));
  const candidate = (id) => !seen.has(id) && byId.has(id) && isAired(byId.get(id));

  // Weight each other member by how well their taste matches yours.
  const people = [];
  for (const [uid, theirs] of everyone) {
    if (uid === meId) continue;
    const tm = tasteMatch(mine, theirs);
    const weight = tm?.score != null ? (tm.score / 100) ** 2 : 0.15; // strangers count a little
    people.push({ uid, theirs, weight, score: tm?.score ?? null });
  }

  const pool = new Map();
  for (const p of people) {
    for (const [id, r] of p.theirs) {
      if (!candidate(id)) continue;
      const x = pool.get(id) || { sum: 0, w: 0, raters: [], best: null };
      x.sum += p.weight * r;
      x.w += p.weight;
      x.raters.push({ ...p, r });
      if (r >= 4 && (!x.best || p.weight > x.best.weight)) x.best = { ...p, r };
      pool.set(id, x);
    }
  }
  const picks = [...pool.entries()]
    .filter(([, x]) => x.best) // somebody has to actually love it
    .map(([id, x]) => {
      const score = x.sum / x.w;
      const who = names.get(x.best.uid) || 'a friend';
      const reason = x.raters.length > 1
        ? `${x.raters.length} people · ★${score.toFixed(1)}`
        : `${who}${x.best.score != null ? ` (${x.best.score}% match)` : ''} · ★${x.best.r}`;
      return { ep: byId.get(id), score: score + 0.15 * Math.log2(1 + x.raters.length) + 0.3 * x.best.weight, raters: x.raters.length, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Not enough taste data yet: fall back to what the whole site rates best.
  if (picks.length < limit) {
    const have = new Set(picks.map((p) => p.ep.id));
    const extra = [...avgs.entries()]
      .filter(([id, a]) => candidate(id) && !have.has(id) && a.count >= 2 && a.avg >= 4)
      .sort((a, b) => b[1].avg - a[1].avg || b[1].count - a[1].count)
      .slice(0, limit - picks.length)
      .map(([id, a]) => ({ ep: byId.get(id), score: a.avg, raters: a.count, reason: `Everyone · ★${a.avg.toFixed(1)}` }));
    picks.push(...extra);
  }
  return picks;
}

const STAN_LINES = [
  "Dude, you haven't seen these yet? People with your taste love them.",
  'Okay, real talk. Watch these. Trust me, dude.',
  "I'm just saying, these are pretty good. Like, actually good.",
  "Dude. Seriously. Stop rewatching the same stuff and try these.",
];
export const stanLine = () => STAN_LINES[Math.floor(Math.random() * STAN_LINES.length)];
