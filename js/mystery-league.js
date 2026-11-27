// Kenny's mystery: this week's leaderboard among the people you follow (and you).
// A solved case is worth 6 points on the first try, down to 1 on the sixth. Weeks start Monday
// (UTC, like the puzzles); cold cases never count.
import { supabase } from './supabase.js?v=20261127172719';
import { esc, avatarHTML } from './ui.js?v=20261127172719';
import { followingIds } from './social.js?v=20261127172719';

const MAX = 6;
const DAY = 86400000;

/** The day number (days since 1970, UTC) of the Monday on or before `day`. */
export const mondayOf = (day) => day - ((new Date(day * DAY).getUTCDay() + 6) % 7);

/** standings(plays, from, to) -> [{ user_id, points, solved, played, guesses }], best first. */
export function standings(plays, from, to) {
  const by = new Map();
  for (const p of plays) {
    if (p.day < from || p.day > to || !p.done || p.cold) continue;
    const s = by.get(p.user_id) || { user_id: p.user_id, points: 0, solved: 0, played: 0, guesses: 0 };
    s.played++;
    if (p.won) {
      s.solved++;
      s.guesses += p.guesses.length;
      s.points += MAX + 1 - p.guesses.length;
    }
    by.set(p.user_id, s);
  }
  return [...by.values()].sort((a, b) => b.points - a.points || b.solved - a.solved || a.guesses - b.guesses);
}

/** The people on the board, and the friends' games from this week and last. */
export async function loadLeague(userId, today) {
  const ids = [userId, ...await followingIds(userId)];
  const [{ data: people, error: e1 }, { data: plays, error: e2 }] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, avatar_color, avatar_icon').in('id', ids),
    supabase.from('mystery_plays').select('user_id, day, guesses, done, won, cold').in('user_id', ids)
      .gte('day', mondayOf(today) - 7).order('day', { ascending: false }).limit(1000),
  ]);
  if (e1 || e2) throw e1 || e2;
  return { friends: ids.length - 1, people: new Map((people || []).map((p) => [p.id, p])), plays: plays || [] };
}

/**
 * The panel's inside. `mine`: your own games, fresher than the database. Friends' games from
 * today stay hidden until yours is finished, so the points don't give anything away.
 */
export function leagueHTML({ friends, people, plays }, { userId, today, mine }) {
  const doneToday = !!mine[today]?.done;
  const all = [
    ...plays.filter((p) => p.user_id !== userId && (doneToday || p.day !== today)),
    ...Object.entries(mine).map(([d, g]) => ({ ...g, user_id: userId, day: Number(d) })),
  ];
  const monday = mondayOf(today);
  const name = (id) => (id === userId ? 'You' : people.get(id)?.display_name || people.get(id)?.username || '?');
  const rows = standings(all, monday, today);
  const last = standings(all, monday - 7, monday - 1)[0];
  const daysLeft = monday + 7 - today;
  const notes = [
    !friends ? 'Follow some people to have someone to beat.' : !doneToday ? "Friends' results for today appear once you finish yours." : '',
    last?.points ? `Last week's top detective: ${esc(name(last.user_id))} (${last.points} pts).` : '',
    `6 points for a first-try solve, 1 for a sixth. ${daysLeft === 1 ? 'Last day!' : `${daysLeft} days left.`}`,
  ].filter(Boolean);
  return `<h2 class="cut">This week's detectives</h2>
    ${rows.length ? `<ol>${rows.map((r, i) => {
      const p = people.get(r.user_id) || {};
      return `<li class="${r.user_id === userId ? 'me' : ''}"><b>${i + 1}</b>
        <a href="profile.html?u=${encodeURIComponent(p.username || '')}">${avatarHTML(p, 30)}<span><strong>${esc(name(r.user_id))}</strong>
          <small>${r.solved} of ${r.played} solved${r.solved ? ` · ${(r.guesses / r.solved).toFixed(1)} guesses` : ''}</small></span></a>
        <span class="ml-points">${r.points}<small> pts</small></span></li>`;
    }).join('')}</ol>` : '<p class="result-count">Nobody is on the board yet this week. Be first.</p>'}
    ${notes.map((n) => `<p class="result-count">${n}</p>`).join('')}`;
}
