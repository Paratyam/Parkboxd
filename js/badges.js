// Badges for several people at once (computeBadges in insights.js does the maths), plus the
// rank their badge count earns. Used by the flair around avatars and the picture picker.
import { fetchAll } from './ui.js?v=20261128081859';
import { supabase } from './supabase.js?v=20261128081859';
import { loadAllEpisodes } from './episodes.js?v=20261128081859';
import { allLatestRatings, characterTags, episodeAverages, computeBadges } from './insights.js?v=20261128081859';
import { loadPicks } from './club.js?v=20261128081859';
import { clubOffsets } from './attendance.js?v=20261128081859';

// Best first.
export const RANKS = [
  { id: 'gold', name: 'Gold', min: 15 },
  { id: 'silver', name: 'Silver', min: 10 },
  { id: 'bronze', name: 'Bronze', min: 5 },
];
export const rankFor = (count) => RANKS.find((r) => count >= r.min) || null;
export const nextRank = (count) => [...RANKS].reverse().find((r) => count < r.min) || null;

/** Map(userId -> { username, flairOff, badges }) for the given people, or for everyone. */
export async function loadBadges(userIds = null) {
  const only = (q) => (userIds ? q.in('user_id', userIds) : q);
  const profiles = () => {
    const q = supabase.from('profiles').select('id, username, season_tiers, flair_off').not('username', 'is', null);
    return userIds ? q.in('id', userIds) : q;
  };
  const [all, { data: people }, { data: stats }, { data: logs }, { data: votes }, { data: wins }, everyone, avgs, chars] = await Promise.all([
    loadAllEpisodes(),
    profiles(),
    only(supabase.from('user_stats').select('user_id, following')),
    fetchAll(() => only(supabase.from('logs').select('user_id, episode_id, rating, review, is_rewatch, watched_on, created_at')).order('id')),
    fetchAll(() => only(supabase.from('cage_votes').select('user_id')).order('id')),
    fetchAll(() => only(supabase.from('mystery_plays').select('user_id, day').eq('won', true)).order('user_id').order('day')),
    allLatestRatings(),
    episodeAverages(),
    characterTags(),
  ]);
  const clubPicks = (await loadPicks(all, clubOffsets())).filter((pk) => pk.real);

  const group = (rows) => {
    const m = new Map();
    for (const r of rows || []) {
      if (!m.has(r.user_id)) m.set(r.user_id, []);
      m.get(r.user_id).push(r);
    }
    return m;
  };
  const [logsBy, votesBy, winsBy] = [group(logs), group(votes), group(wins)];
  const following = new Map((stats || []).map((s) => [s.user_id, s.following]));

  return new Map((people || []).map((p) => [p.id, {
    username: p.username,
    flairOff: p.flair_off || [],
    badges: computeBadges({
      username: p.username, logs: logsBy.get(p.id) || [], ratings: everyone.get(p.id) || new Map(), all, byName: chars.byName, avgs,
      following: following.get(p.id) ?? 0, clubPicks, cageMatches: votesBy.get(p.id)?.length || 0,
      mysteryWins: winsBy.get(p.id)?.length || 0, seasonTiers: p.season_tiers,
    }),
  }]));
}
