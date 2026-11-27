// Rating maths: taste match, hot takes, "which character are you", badges.
import { supabase } from './supabase.js?v=20261127074510';

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

// Bands match where scores really fall (most friend pairs land around 70–90%).
export function tasteLabel(score) {
  if (score >= 89) return 'Basically Tweek and Craig';
  if (score >= 85) return 'Super Best Friends';
  if (score >= 82) return 'Mostly on the same page';
  if (score >= 76) return 'Butters and Professor Chaos';
  return 'Basically Kyle and Cartman';
}

// ---- Your South Park personality ----

// Usernames that get a fixed personality, whatever their habits.
const PERSONALITY_OVERRIDES = { paratyam: 'Butters', itai: 'Kenny' };

const PERSONALITIES = {
  Butters: { emoji: '🍔', line: "Aw, everything's swell! You've never met an episode you didn't like." },
  Jimmy: { emoji: '🎤', line: "What a t-t-terrific audience! You're easy to please, but not THAT e-e-easy." },
  Cartman: { emoji: '😤', line: "Screw you guys. You hate everything and you're proud of it." },
  Stan: { emoji: '🧢', line: 'Sensible. Reasonable. Kind of boring, dude.' },
  Kyle: { emoji: '📝', line: 'You know, I learned something today… and you wrote 400 words about it.' },
  Randy: { emoji: '🌱', line: 'All or nothing. Mostly nothing. Then everything.' },
  Kenny: { emoji: '🧡', line: 'Mmph mmph mmph. (Translation: you rate a lot and say nothing.)' },
  'Mr. Mackey': { emoji: '👔', line: 'Everything is fine, mmkay. Three stars, mmkay.' },
  Towelie: { emoji: '🧻', line: "You wanna watch it again? Yeah, you do. You always do." },
};

/**
 * Work out someone's South Park personality from how they rate, review and rewatch.
 *   logs: [{ episode_id, rating, review, is_rewatch }], ratings: Map(epId → rating), avgs: Map(epId → { avg, count })
 * Returns { name, emoji, line, why } or null when there isn't enough to go on.
 */
export function personality({ username, logs, ratings, avgs }) {
  const forced = PERSONALITY_OVERRIDES[(username || '').toLowerCase()];
  if (forced) return { name: forced, ...PERSONALITIES[forced], why: 'Some things are just meant to be.' };

  const rs = [...ratings.values()];
  if (logs.length < 5 && rs.length < 5) return null;
  const pct = (n) => Math.round(n * 100);
  const share = (f) => (rs.length ? rs.filter(f).length / rs.length : 0);
  const high = share((r) => r >= 4);
  const low = share((r) => r <= 2);
  // Cartman's harshness: 2★ or less counts fully, 2½★ counts half.
  const harsh = rs.length ? rs.reduce((s, r) => s + (r <= 2 ? 1 : r === 2.5 ? 0.5 : 0), 0) / rs.length : 0;
  const mid = share((r) => r >= 3 && r <= 3.5);
  const mean = rs.reduce((a, b) => a + b, 0) / (rs.length || 1);
  const sd = Math.sqrt(rs.reduce((a, r) => a + (r - mean) ** 2, 0) / (rs.length || 1));
  const reviews = logs.filter((l) => l.review && l.review.trim());
  const avgLen = reviews.length ? reviews.reduce((a, l) => a + l.review.trim().length, 0) / reviews.length : 0;
  const reviewRatio = logs.length ? reviews.length / logs.length : 0;
  const rewatches = logs.filter((l) => l.is_rewatch).length;

  // Each character gets a score when its rule fits (roughly 0.5–1.3); the strongest fit wins.
  const fits = [];
  if (rs.length >= 5 && high >= 0.75) fits.push(['Butters', high + 0.1, `${pct(high)}% of your ratings are 4★ or more.`]);
  // Jimmy, like Stan, loses to every other habit: he only wins when generosity is all there is.
  else if (rs.length >= 5 && high >= 0.65) fits.push(['Jimmy', 0.3, `${pct(high)}% of your ratings are 4★ or more. Generous, but not Butters-generous.`]);
  if (rs.length >= 5 && harsh >= 0.18) fits.push(['Cartman', Math.min(1.19, harsh + 0.95), `${rs.filter((r) => r <= 2).length} of your ${rs.length} ratings are 2★ or less${rs.some((r) => r === 2.5) ? `, and ${rs.filter((r) => r === 2.5).length} more are 2½★` : ''}.`]);
  // Randy loves more than he hates; swingers who lean negative are Cartman.
  if (rs.length >= 8 && sd >= 1.0 && high >= 0.12 && low >= 0.12 && high >= harsh) fits.push(['Randy', 1.2, `Your ratings swing wildly between 4★+ and 2★ or less.`]);
  if (rs.length >= 5 && mid >= 0.6) fits.push(['Mr. Mackey', mid + 0.2, `${pct(mid)}% of your ratings are 3 or 3½★.`]);
  if (reviews.length >= 5 && avgLen >= 200) fits.push(['Kyle', Math.min(1.3, 0.8 + (avgLen - 200) / 600), `Your reviews average ${Math.round(avgLen)} characters.`]);
  // Kenny: lots of logs, almost no reviews. Capped below the louder habits so backfilled diaries don't all turn into Kenny.
  if (logs.length >= 35 && reviewRatio < 0.03) fits.push(['Kenny', 0.75 - reviewRatio * 10, `${logs.length} logs and ${reviews.length} review${reviews.length === 1 ? '' : 's'}.`]);
  if (rewatches >= 4 && rewatches / logs.length >= 0.22) fits.push(['Towelie', Math.min(1, rewatches / logs.length + 0.6), `${rewatches} of your ${logs.length} logs are rewatches.`]);

  fits.sort((a, b) => b[1] - a[1]);
  // Stan is who you are when none of the habits above stand out.
  const [name, , why] = fits[0] || ['Stan', 0, 'None of your habits stand out: no extreme ratings, no essay reviews, no rewatch binges. Very Stan.'];
  return { name, ...PERSONALITIES[name], why };
}

// ---- Badges ----

/**
 * ctx: { logs: [{ episode_id, rating, review, is_rewatch, watched_on }], ratings: Map, all: episodes[],
 *        byName: Map(character → Set(epIds)), avgs: Map, following: number }
 * Returns [{ id, emoji, name, desc, earned, have, need }]
 */
// Badges given to someone by hand, whatever their logs say.
const BADGE_GRANTS = { paratyam: ['dayone'] };

export function computeBadges(ctx) {
  const { logs, ratings, all, byName, avgs, following, username } = ctx;
  // Badges handed out by hand (usernames → badge ids).
  const granted = new Set(BADGE_GRANTS[(username || '').toLowerCase()] || []);
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
  const finishedSeasons = [...seasons.values()].filter((s) => s.have >= s.need).length;
  const movies = all.filter((e) => e.kind === 'movie');
  const dayOne = logs.some((l) => l.watched_on && byId.get(l.episode_id)?.air_date === l.watched_on);
  const hot = [...ratings].filter(([epId, r]) => isHotTake(r, avgs.get(epId))).length;

  const [randyHave, randyNeed] = allOf('Randy');
  const [kennyHave, kennyNeed] = allOf('Kenny');
  const [buttersHave, buttersNeed] = allOf('Butters');
  // The Coon saga, matched by title (case and punctuation ignored).
  const normTitle = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  const coonTitles = ['The Coon', 'Coon 2: Hindsight', 'Mysterion Rises', 'Coon vs. Coon & Friends'].map(normTitle);
  const coonEps = all.filter((e) => e.kind === 'episode' && coonTitles.includes(normTitle(e.title)));

  const b = (id, emoji, name, desc, have, need) => (granted.has(id)
    ? { id, emoji, name, desc, have: need || 1, need: need || 1, earned: true }
    : { id, emoji, name, desc, have: Math.min(have, need), need, earned: need > 0 && have >= need });
  return [
    b('authoritah', '👮', 'Respect My Authoritah', 'Rate 100 episodes', ratings.size, 100),
    b('tegridy', '🌱', 'Tegridy', 'Watch every Randy episode', randyHave, randyNeed),
    b('kenny', '❓', 'Mysterion', 'Watch every Kenny episode', kennyHave, kennyNeed),
    b('chaos', '😈', 'Professor Chaos', 'Watch every Butters episode', buttersHave, buttersNeed),
    b('coon', '🦝', 'Coon & Friends', 'Watch the whole Coon saga', coonEps.filter((e) => seen.has(e.id)).length, coonEps.length),
    b('completionist', '🏔️', 'Completionist', 'Finish every season', finishedSeasons, seasons.size),
    b('movies', '🎬', 'Bigger, Longer & Logged', 'Watch every movie', movies.filter((m) => seen.has(m.id)).length, movies.length),
    b('screwyou', '🚪', 'Screw You Guys', 'Give 10 episodes 1★ or less', [...ratings.values()].filter((r) => r <= 1).length, 10),
    b('hottake', '🌶️', 'Hot Take Artist', 'Make 5 hot takes (2★+ off the average)', hot, 5),
    b('critic', '✍️', 'Critic', 'Write 25 reviews', logs.filter((l) => l.review && l.review.trim()).length, 25),
    b('mmkay', '📓', 'Mmkay', 'Log 50 times', logs.length, 50),
    b('rewatch', '🔁', 'Same Old Story', 'Log 10 rewatches', logs.filter((l) => l.is_rewatch).length, 10),
    b('dayone', '📅', 'Day One', 'Watch an episode the day it aired', dayOne ? 1 : 0, 1),
    b('friends', '🤝', 'Super Best Friends', 'Follow 5 people', following, 5),
    b('bookworm', '📚', 'Bookworm', "Review 3 of Butters' Book Club picks during their week", clubReviewCount(logs, ctx.clubPicks || []), 3),
    b('ringmaster', '🥊', 'Ringmaster', "Judge 100 fights in Cartman's Cage Match", ctx.cageMatches || 0, 100),
    b('detective', '🕵️', 'Case Closed', "Solve 5 of Kenny's Mystery Episodes", ctx.mysteryWins || 0, 5),
  ];
}


/** How many Book Club picks were reviewed (logged with review text) during their own week. clubPicks: [{ pick, start, end }] */
export function clubReviewCount(logs, clubPicks) {
  return clubPicks.filter((p) => p.pick && logs.some((l) => l.episode_id === p.pick.id && l.review && l.review.trim()
    && new Date(l.created_at) >= p.start && new Date(l.created_at) < p.end)).length;
}
