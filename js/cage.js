// Cage Match: a personal head-to-head game. Votes are stored, scores (Elo) are worked out here.
import { fetchAll } from './ui.js?v=20261127172227';
import { supabase } from './supabase.js?v=20261127172227';

const K = 32;
export const UNDEFEATED_MIN = 3; // wins needed before "undefeated" means anything
export const SETTLED_FIGHTS = 3; // fights before an episode's spot counts as settled

// Starting score from your star rating, so the ranking begins somewhere sensible.
const startScore = (rating) => 1000 + (rating == null ? 0 : (Number(rating) - 3) * 60);

/**
 * scoreVotes(votes, ratings) -> Map(episodeId -> { id, score, wins, losses })
 *   votes: [{ winner_id, loser_id }] oldest first; ratings: Map(episodeId -> stars)
 */
export function scoreVotes(votes, ratings = new Map()) {
  const s = new Map();
  const get = (id) => {
    if (!s.has(id)) s.set(id, { id, score: startScore(ratings.get(id)), wins: 0, losses: 0 });
    return s.get(id);
  };
  for (const v of votes) {
    const w = get(v.winner_id);
    const l = get(v.loser_id);
    const expected = 1 / (1 + 10 ** ((l.score - w.score) / 400));
    w.score += K * (1 - expected);
    l.score -= K * (1 - expected);
    w.wins++;
    l.losses++;
  }
  return s;
}

// Ranked list (best first) of episodes that have fought at least once.
export function ranking(scores) {
  return [...scores.values()].sort((a, b) => b.score - a.score || b.wins - a.wins);
}

// The champion: #1 in the ranking. Undefeated if it has never lost (and has won enough).
export function champion(scores) {
  const top = ranking(scores)[0];
  if (!top) return null;
  const unbeaten = [...scores.values()].filter((x) => x.losses === 0 && x.wins >= UNDEFEATED_MIN)
    .sort((a, b) => b.wins - a.wins)[0];
  return { top, undefeated: top.losses === 0 && top.wins >= UNDEFEATED_MIN, unbeaten };
}

export async function loadVotes(userId) {
  const { data } = await fetchAll(() => supabase.from('cage_votes').select('id, winner_id, loser_id, created_at')
    .eq('user_id', userId).order('created_at').order('id'));
  return data || [];
}

// The people's champion: #1 on everyone's picks together (the cage_community view), or null.
export async function peoplesChampion() {
  const { data, error } = await supabase.from('cage_community').select('episode_id, judges, wins, losses, score')
    .order('score', { ascending: false }).order('judges', { ascending: false }).order('wins', { ascending: false })
    .order('episode_id').limit(1);
  return error ? null : data?.[0] || null;
}

export async function loadRatings(userId) {
  const { data } = await supabase.from('latest_ratings').select('episode_id, rating').eq('user_id', userId).limit(5000);
  return new Map((data || []).map((r) => [r.episode_id, Number(r.rating)]));
}

/**
 * Next pair to judge from the pool of episode ids. Favours episodes with few matches,
 * pairs them with something of a similar score, and avoids repeating recent pairs.
 */
export function nextPair(pool, scores, ratings, recent = []) {
  if (pool.length < 2) return null;
  const info = (id) => scores.get(id) || { score: startScore(ratings.get(id)), wins: 0, losses: 0 };
  const games = (id) => info(id).wins + info(id).losses;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const fewest = shuffled.sort((a, b) => games(a) - games(b)).slice(0, Math.max(2, Math.ceil(pool.length / 3)));
  const a = fewest[Math.floor(Math.random() * fewest.length)];
  const seen = new Set(recent.map((p) => [p[0], p[1]].sort().join('-')));
  const sample = pool.filter((id) => id !== a && !seen.has([a, id].sort().join('-')))
    .sort(() => Math.random() - 0.5).slice(0, 10);
  const candidates = sample.length ? sample : pool.filter((id) => id !== a);
  const b = candidates.sort((x, y) => Math.abs(info(x).score - info(a).score) - Math.abs(info(y).score - info(a).score))[0];
  return Math.random() < 0.5 ? [a, b] : [b, a];
}

// Cartman, commentating. {w} = winner, {l} = loser.
export const CARTMAN = [
  '{w}? Seriously? Fine. Whatever.',
  'Ohhh, {l} just got destroyed. Sweet.',
  'Respect my authoritah, I would have picked {w} too.',
  'Wow, {l} never stood a chance. Pathetic.',
  "{w} wins! That's what I'm talking about!",
  "Screw you, {l}! I'm going home!",
  'Hey! {w}. Good choice. For once.',
  "I'm not saying you're wrong. I'm just saying I would have done it better.",
  '{w} is going to the finals, baby!',
  'Ooh, brutal. {l} is crying in the corner right now.',
  'Kewl.',
  "That's a weak pick. Weak! But okay.",
  "{l} goes home. Bye bye, {l}. Nobody liked you anyway.",
  "{w}! Even Kyle couldn't screw that one up.",
];
