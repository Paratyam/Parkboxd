// Rating maths: taste match, hot takes, "which character are you", badges.
import { supabase } from './supabase.js';

// ---- Loaders ----

/** Map(user_id → Map(episode_id → rating)) of everyone's current ratings. */
export async function allLatestRatings() {
  const { data } = await supabase.from('latest_ratings').select('user_id, episode_id, rating').limit(20000);
  const out = new Map();
  for (const r of data || []) {
    if (!out.has(r.user_id)) out.set(r.user_id, new Map());
    out.get(r.user_id).set(r.episode_id, Number(r.rating));
  }
  return out;
}

/** Map(episode_id → { avg, count }) */
export async function episodeAverages() {
  const { data } = await supabase.from('episode_ratings').select('episode_id, avg_rating, rating_count').gt('rating_count', 0).limit(5000);
  return new Map((data || []).map((r) => [r.episode_id, { avg: Number(r.avg_rating), count: r.rating_count }]));
}

/** { byEpisode: Map(epId → [names]), byName: Map(name → Set(epIds)) } for character tags. */
export async function characterTags() {
  const { data } = await supabase.from('episode_tags').select('episode_id, tags!inner(name, kind)').eq('tags.kind', 'character').limit(10000);
  const byEpisode = new Map();
  const byName = new Map();
  for (const r of data || []) {
    const name = r.tags.name;
    if (!byEpisode.has(r.episode_id)) byEpisode.set(r.episode_id, []);
    byEpisode.get(r.episode_id).push(name);
    if (!byName.has(name)) byName.set(name, new Set());
    byName.get(name).add(r.episode_id);
  }
  return { byEpisode, byName };
}

// ---- Hot takes ----

export const HOT_GAP = 2;
export const HOT_MIN_RATINGS = 3;

/** A rating 2★+ away from the episode average (with at least 3 ratings) is a hot take. */
export function isHotTake(rating, avgInfo) {
  return rating != null && avgInfo && avgInfo.count >= HOT_MIN_RATINGS && Math.abs(Number(rating) - avgInfo.avg) >= HOT_GAP;
}

// ---- Taste match ----

/**
 * Compare two Map(epId → rating). Returns null if fewer than 3 shared ratings.
 * { score (0–100), shared, pairs: [{ epId, a, b, diff }] sorted by biggest disagreement }
 */
export function tasteMatch(a, b) {
  const pairs = [];
  for (const [epId, ra] of a) if (b.has(epId)) pairs.push({ epId, a: ra, b: b.get(epId), diff: Math.abs(ra - b.get(epId)) });
  if (pairs.length < 3) return pairs.length ? { score: null, shared: pairs.length, pairs } : null;
  const score = Math.round((pairs.reduce((s, p) => s + (1 - p.diff / 4.5), 0) / pairs.length) * 100);
  pairs.sort((x, y) => y.diff - x.diff || (y.a + y.b) - (x.a + x.b));
  return { score, shared: pairs.length, pairs };
}

export function tasteLabel(score) {
  if (score >= 90) return 'Super Best Friends';
  if (score >= 75) return 'Basically Stan and Kyle';
  if (score >= 60) return 'Mostly on the same page';
  if (score >= 45) return 'Agree to disagree';
  return 'Basically Kyle and Cartman';
}

// ---- Which character are you? ----

/**
 * From one user's ratings and the character tags: each character scores the
 * "liking" (rating above 2.5) of their episodes. Needs 2+ rated episodes per character.
 * Returns [{ name, pct, avg, n }] best first, or [] if not enough data.
 */
export function characterAffinity(ratings, byEpisode) {
  const per = new Map();
  for (const [epId, r] of ratings) {
    for (const name of byEpisode.get(epId) || []) {
      const p = per.get(name) || { name, weight: 0, sum: 0, n: 0 };
      p.weight += Math.max(0, r - 2.5);
      p.sum += r;
      p.n++;
      per.set(name, p);
    }
  }
  const list = [...per.values()].filter((p) => p.n >= 2 && p.weight > 0);
  const total = list.reduce((s, p) => s + p.weight, 0);
  return list
    .map((p) => ({ name: p.name, pct: Math.round((p.weight / total) * 100), avg: p.sum / p.n, n: p.n }))
    .sort((x, y) => y.pct - x.pct || y.avg - x.avg);
}

// ---- Badges ----

/**
 * ctx: { logs: [{ episode_id, rating, review, is_rewatch, watched_on }], ratings: Map, all: episodes[],
 *        byName: Map(character → Set(epIds)), avgs: Map, following: number }
 * Returns [{ id, emoji, name, desc, earned, have, need }]
 */
export function computeBadges(ctx) {
  const { logs, ratings, all, byName, avgs, following } = ctx;
  const seen = new Set(logs.map((l) => l.episode_id));
  const byId = new Map(all.map((e) => [e.id, e]));

  const allOf = (name) => {
    const eps = [...(byName.get(name) || [])].filter((id) => byId.has(id));
    return [eps.filter((id) => seen.has(id)).length, eps.length];
  };
  const seasons = new Map();
  for (const e of all) if (e.kind === 'episode' && e.air_date && e.air_date <= new Date().toISOString().slice(0, 10)) {
    const s = seasons.get(e.season) || { have: 0, need: 0 };
    s.need++;
    if (seen.has(e.id)) s.have++;
    seasons.set(e.season, s);
  }
  const bestSeason = [...seasons.values()].sort((a, b) => b.have / b.need - a.have / a.need)[0] || { have: 0, need: 1 };
  const movies = all.filter((e) => e.kind === 'movie');
  const perDay = new Map();
  for (const l of logs) if (l.watched_on) perDay.set(l.watched_on, (perDay.get(l.watched_on) || 0) + 1);
  const busiest = Math.max(0, ...perDay.values());
  const dayOne = logs.some((l) => l.watched_on && byId.get(l.episode_id)?.air_date === l.watched_on);
  const hot = [...ratings].filter(([epId, r]) => isHotTake(r, avgs.get(epId))).length;

  const [randyHave, randyNeed] = allOf('Randy');
  const [kennyHave, kennyNeed] = allOf('Kenny');
  const [buttersHave, buttersNeed] = allOf('Butters');

  const b = (id, emoji, name, desc, have, need) => ({ id, emoji, name, desc, have: Math.min(have, need), need, earned: need > 0 && have >= need });
  return [
    b('authoritah', '👮', 'Respect My Authoritah', 'Rate 100 episodes', ratings.size, 100),
    b('tegridy', '🌱', 'Tegridy', 'Watch every Randy episode', randyHave, randyNeed),
    b('kenny', '🧡', 'They Killed Kenny', 'Watch every Kenny episode', kennyHave, kennyNeed),
    b('chaos', '😈', 'Professor Chaos', 'Watch every Butters episode', buttersHave, buttersNeed),
    b('completionist', '🏔️', 'Completionist', 'Finish a whole season', bestSeason.have, bestSeason.need),
    b('movies', '🎬', 'Bigger, Longer & Logged', 'Watch every movie', movies.filter((m) => seen.has(m.id)).length, movies.length),
    b('screwyou', '🚪', 'Screw You Guys', 'Give 10 episodes 1★ or less', [...ratings.values()].filter((r) => r <= 1).length, 10),
    b('hottake', '🌶️', 'Hot Take Artist', 'Make 5 hot takes (2★+ off the average)', hot, 5),
    b('critic', '✍️', 'Critic', 'Write 25 reviews', logs.filter((l) => l.review && l.review.trim()).length, 25),
    b('mmkay', '📓', 'Mmkay', 'Log 50 times', logs.length, 50),
    b('rewatch', '🔁', 'Same Old Story', 'Log 10 rewatches', logs.filter((l) => l.is_rewatch).length, 10),
    b('marathon', '📺', 'Marathon', 'Log 10 episodes on one day', busiest, 10),
    b('dayone', '📅', 'Day One', 'Watch an episode the day it aired', dayOne ? 1 : 0, 1),
    b('friends', '🤝', 'Super Best Friends', 'Follow 5 people', following, 5),
  ];
}
