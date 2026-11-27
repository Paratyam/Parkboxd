// Tegridy streak: days in a row you kept the plant alive. A day counts if you logged something,
// finished that day's Mystery Episode, or judged 10 Cage Match fights ("watering"). Every 7 days
// in a row earns a rain day (hold up to 2) that covers a missed day. Randy has feelings about it.
// Everything is worked out in the browser from rows that already exist.
import { esc, fetchAll } from './ui.js?v=20261127180120';
import { supabase } from './supabase.js?v=20261127180120';

export const WATER_FIGHTS = 10;
export const RAIN_EVERY = 7;
export const RAIN_MAX = 2;
export const FULL_GROWN = 100;

const dayKey = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
const shift = (key, days) => {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return dayKey(d);
};

/** The days watered without logging. plays: mystery_plays rows; votes: cage_votes rows. */
export function wateredDays(plays, votes) {
  const days = new Set();
  for (const p of plays || []) if (p.done && !p.cold && p.updated_at) days.add(dayKey(new Date(p.updated_at)));
  const fights = new Map();
  for (const v of votes || []) {
    const k = dayKey(new Date(v.created_at));
    fights.set(k, (fights.get(k) || 0) + 1);
  }
  for (const [k, n] of fights) if (n >= WATER_FIGHTS) days.add(k);
  return days;
}

/**
 * streakInfo(logs, watered, now) -> { current, longest, loggedToday, doneToday, atRisk, broke, rain }
 *   logs: rows with created_at. A log counts on the day you actually logged it, never the
 *   "watched on" date, so back-dating or importing old diaries can't fake a streak.
 *   Rain days keep a streak alive but don't add to it.
 */
export function streakInfo(logs, watered = new Set(), now = new Date()) {
  const logged = new Set();
  for (const l of logs || []) if (l.created_at) logged.add(dayKey(new Date(l.created_at)));
  const days = new Set([...logged, ...watered]);
  const today = dayKey(now);
  let run = 0;
  let longest = 0;
  let rain = 0;
  let towardsRain = 0;
  let ended = null; // the last streak that died: { length, day }
  for (let k = [...days].sort()[0]; k && k <= today; k = shift(k, 1)) {
    if (days.has(k)) {
      run++;
      longest = Math.max(longest, run);
      if (++towardsRain === RAIN_EVERY) { rain = Math.min(RAIN_MAX, rain + 1); towardsRain = 0; }
    } else if (k !== today && run > 0) { // today isn't missed until it's over
      if (rain > 0) rain--;
      else { ended = { length: run, day: k }; run = 0; towardsRain = 0; }
    }
  }
  const doneToday = days.has(today);
  // Broke recently: no streak now, but a 3+ day one died in the last week.
  const broke = run === 0 && ended && ended.length >= 3 && ended.day >= shift(today, -7) ? ended.length : 0;
  return { current: run, longest, loggedToday: logged.has(today), doneToday, atRisk: run > 0 && !doneToday, broke, rain };
}

/** Map(userId -> streakInfo) for several people at once. */
export async function loadStreaks(userIds) {
  const out = new Map();
  if (!userIds.length) return out;
  const [{ data: logs }, { data: plays }, { data: votes }] = await Promise.all([
    fetchAll(() => supabase.from('logs').select('user_id, created_at').in('user_id', userIds).order('id')),
    fetchAll(() => supabase.from('mystery_plays').select('user_id, day, done, cold, updated_at').in('user_id', userIds).eq('done', true).order('user_id').order('day')),
    fetchAll(() => supabase.from('cage_votes').select('user_id, created_at').in('user_id', userIds).order('id')),
  ]);
  const of = (rows, id) => (rows || []).filter((r) => r.user_id === id);
  for (const id of userIds) out.set(id, streakInfo(of(logs, id), wateredDays(of(plays, id), of(votes, id))));
  return out;
}

// ---- The plant ----

const CUT = 'stroke="#141414" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';

/**
 * An original paper-cutout plant that grows with the streak: a seed at 0, fully grown (with
 * flowers) at 100 days. wilted = the streak just died.
 */
export function plantSVG(days, { wilted = false } = {}) {
  const d = Math.max(0, Math.min(FULL_GROWN, days));
  const g = (d / FULL_GROWN) ** 0.55; // quick early growth, so every first week shows
  const leaf = wilted ? '#a08a4a' : '#5ccf4a';
  const stem = wilted ? '#7a6636' : '#2f8f3a';
  const soil = 92; // where the stem leaves the pot
  const height = d ? 10 + 62 * g : 0;
  const top = soil - height;
  const pairs = d ? Math.min(7, 1 + Math.floor(g * 6.5)) : 0;
  let plant = '';
  if (d) {
    const line = `M50 ${soil} Q46 ${soil - height / 2} 50 ${top}`;
    plant += `<path d="${line}" fill="none" stroke="#141414" stroke-width="${4 + 4 * g}" stroke-linecap="round"/>`;
    plant += `<path d="${line}" fill="none" stroke="${stem}" stroke-width="${1.5 + 3.5 * g}" stroke-linecap="round"/>`;
    for (let i = 0; i < pairs; i++) {
      const y = soil - height * ((i + 1) / (pairs + 0.4));
      const len = (9 + 24 * g) * (1 - (i / pairs) * 0.45);
      const droop = wilted ? len * 0.55 : -len * 0.35;
      for (const side of [-1, 1]) {
        plant += `<path d="M49 ${y} Q${49 + side * len * 0.4} ${y + droop - len * 0.4} ${49 + side * len} ${y + droop} Q${49 + side * len * 0.55} ${y + droop + len * 0.35} 49 ${y} Z" fill="${leaf}" ${CUT}/>`;
      }
    }
    plant += `<path d="M50 ${top + 3} Q42 ${top - 6} 50 ${top - 10 - 4 * g} Q58 ${top - 6} 50 ${top + 3} Z" fill="${leaf}" ${CUT}/>`;
  }
  const flower = (x, y, r) => [0, 72, 144, 216, 288].map((a) => `<circle cx="${x + r * Math.sin((a * Math.PI) / 180)}" cy="${y - r * Math.cos((a * Math.PI) / 180)}" r="${r * 0.75}" fill="#ff7eb6" ${CUT}/>`).join('')
    + `<circle cx="${x}" cy="${y}" r="${r * 0.75}" fill="#f5c518" ${CUT}/>`;
  let blooms = '';
  if (!wilted && d >= FULL_GROWN) blooms = flower(50, top - 8, 6) + flower(27, top + 22, 4.5) + flower(73, top + 30, 4.5);
  else if (!wilted && d >= 60) blooms = `<circle cx="50" cy="${top - 11}" r="${3 + (d - 60) / 14}" fill="#ff7eb6" ${CUT}/>`;
  const sparkles = d >= FULL_GROWN ? '<path d="M14 14 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z M86 34 l1.5 4.5 4.5 1.5 -4.5 1.5 -1.5 4.5 -1.5 -4.5 -4.5 -1.5 4.5 -1.5z" fill="#f5c518" stroke="#141414" stroke-width="1"/>' : '';
  const seed = d ? '' : '<ellipse cx="50" cy="92" rx="5" ry="3.5" fill="#e0c188" stroke="#141414" stroke-width="2"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" aria-hidden="true" focusable="false">${sparkles}
    <ellipse cx="50" cy="95" rx="20" ry="4" fill="#5b3a1e" ${CUT}/>${seed}${plant}${blooms}
    <path d="M30 96 L70 96 L64 118 L36 118 Z" fill="#c8693a" ${CUT}/>
    <rect x="27" y="94" width="46" height="7" rx="2" fill="#e0824c" ${CUT}/></svg>`;
}

const pick = (arr, n) => arr[n % arr.length];

// What Randy says, for you (isMe) or about someone else.
export function randyLine(s, isMe) {
  if (!isMe) {
    if (s.current >= 7) return 'Now THAT is tegridy.';
    if (s.current > 0) return 'Growing a little tegridy over there.';
    return s.longest >= 3 ? `Had a ${s.longest}-day streak once. Those were the days.` : 'No tegridy yet.';
  }
  if (s.broke) return pick([
    `Oh my God. Oh my GOD. Your ${s.broke}-day streak is gone! I thought you had tegridy!`,
    `NOOO! ${s.broke} days of tegridy, just thrown away! Sharon, get the car!`,
    `You broke a ${s.broke}-day streak. I need to go sit in the barn for a while.`,
  ], s.broke);
  if (s.atRisk) return pick([
    'Water the plant today or the streak dies! I am not kidding, this is serious!',
    "Don't you dare let this streak die. Log an episode. Do it for the farm.",
    "The streak is hanging by a thread, man! One episode. That's all I'm asking.",
  ], s.current);
  if (s.current >= 100) return "It's fully grown. A hundred days. I'm not crying, you're crying.";
  if (s.current >= 30) return 'A whole month?! You are the most tegridy person I have ever met.';
  if (s.current >= 14) return 'Two weeks straight. I am getting emotional over here.';
  if (s.current >= 7) return 'A full week! That is real tegridy, right there.';
  if (s.current >= 3) return "Now you're farming. Keep it going!";
  if (s.current >= 1) return pick([
    "Day one, baby! Come back tomorrow and let's grow this thing.",
    'Every farm starts with one seed. Log again tomorrow.',
  ], s.longest);
  return pick([
    'No streak. No tegridy. Log something today and we can start fresh.',
    'Zero days. Zero! Come on, man, log an episode.',
  ], s.longest);
}

export function streakHTML(s, { isMe = true, name = '' } = {}) {
  const notes = [
    `Longest: ${s.longest} day${s.longest === 1 ? '' : 's'}`,
    s.current >= FULL_GROWN ? 'Fully grown!' : s.current ? `${FULL_GROWN - s.current} days to fully grown` : '',
    `🌧️ ${s.rain} rain day${s.rain === 1 ? '' : 's'} saved`,
    isMe && s.doneToday ? (s.loggedToday ? '✓ logged today' : '✓ watered today') : '',
  ].filter(Boolean).join(' · ');
  return `
    <div class="streak-card paper${s.current >= 7 ? ' hot' : ''}">
      <div class="streak-plant">${plantSVG(s.broke || s.current, { wilted: !!s.broke })}</div>
      <div class="streak-num"><b>${s.current}</b><span>day${s.current === 1 ? '' : 's'}</span></div>
      <div class="streak-text">
        <strong>${isMe ? 'Your' : `${esc(name)}'s`} Tegridy streak</strong>
        <p>“${esc(randyLine(s, isMe))}” <span class="who">— Randy</span></p>
        <span class="streak-best">${notes}</span>
        ${isMe && !s.doneToday ? `<span class="streak-best">Water it today: log an episode, finish today's Mystery, or judge ${WATER_FIGHTS} Cage Match fights.</span>` : ''}
      </div>
    </div>`;
}
