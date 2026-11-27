// Tegridy streak: days in a row you kept the plant alive. A day counts if you logged something,
// finished that day's Mystery Episode, or judged 10 Cage Match fights ("watering"). Every 7 days
// in a row earns a rain day (hold up to 2) that covers a missed day. Randy has feelings about it.
// Everything is worked out in the browser from rows that already exist.
import { esc, fetchAll } from './ui.js?v=20261127191633';
import { supabase } from './supabase.js?v=20261127191633';

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
 * An original paper-cutout cannabis plant that grows with the streak: a seed at 0, fully grown (with
 * big buds) at 100 days. wilted = the streak just died.
 */
export function plantSVG(days, { wilted = false } = {}) {
  const d = Math.max(0, Math.min(FULL_GROWN, days));
  const g = (d / FULL_GROWN) ** 0.55; // quick early growth, so every first week shows
  const leaf = wilted ? '#a08a4a' : '#4fbf3f';
  const leaf2 = wilted ? '#8a763e' : '#3da536';
  const stem = wilted ? '#7a6636' : '#2f8f3a';
  const soil = 92; // where the stem leaves the pot
  const height = d ? 10 + 58 * g : 0;
  const top = soil - height;
  const pairs = d ? Math.min(7, 1 + Math.floor(g * 6.5)) : 0;
  const twig = (path, outer, inner) => `<path d="${path}" fill="none" stroke="#141414" stroke-width="${outer}" stroke-linecap="round"/><path d="${path}" fill="none" stroke="${stem}" stroke-width="${inner}" stroke-linecap="round"/>`;
  // One serrated leaflet pointing up from 0,0: [width, length] fractions down its left edge.
  const EDGE = [[0, 0], [0.45, 0.18], [0.32, 0.24], [0.85, 0.34], [0.62, 0.4], [1, 0.52], [0.68, 0.57], [0.72, 0.7], [0.42, 0.72], [0.36, 0.84], [0, 1]];
  const blade = (len, angle, colour) => {
    const at = (side, [x, y]) => `${(side * x * len * 0.17).toFixed(2)} ${(-y * len).toFixed(2)}`;
    const path = `M${[...EDGE.map((p) => at(-1, p)), ...EDGE.slice(0, -1).reverse().map((p) => at(1, p))].join(' L')}Z`;
    return `<g transform="rotate(${angle})"><path d="${path}" fill="${colour}" stroke="#141414" stroke-width="1.1" stroke-linejoin="round"/><path d="M0 -1 L0 ${(-len * 0.82).toFixed(2)}" stroke="#1f6b2a" stroke-width=".6" opacity=".7"/></g>`;
  };
  // A fan leaf of 3, 5 or 7 leaflets: [angle, size] each.
  const FANS = {
    3: [[-55, 0.7], [55, 0.7], [0, 1]],
    5: [[-95, 0.45], [95, 0.45], [-48, 0.74], [48, 0.74], [0, 1]],
    7: [[-118, 0.3], [118, 0.3], [-80, 0.52], [80, 0.52], [-40, 0.78], [40, 0.78], [0, 1]],
  };
  const fan = (x, y, size, tilt, n, colour) => `<g transform="translate(${x} ${y}) rotate(${tilt})">${FANS[n].map(([a, k]) => blade(size * k, wilted ? a * 0.55 : a, colour)).join('')}</g>`;
  let plant = '';
  if (d) {
    plant += twig(`M50 ${soil} Q47 ${soil - height / 2} 50 ${top}`, 4 + 3.5 * g, 1.5 + 3 * g);
    const young = d < 12; // a seedling still has its two round first leaves
    if (young) {
      const y = soil - height * 0.3;
      for (const side of [-1, 1]) plant += `<ellipse cx="${50 + side * 6}" cy="${y}" rx="5.5" ry="2.8" transform="rotate(${side * -18} ${50 + side * 6} ${y})" fill="${leaf}" stroke="#141414" stroke-width="1.2"/>`;
    }
    for (let i = young ? 1 : 0; i < pairs; i++) {
      const y = soil - height * ((i + 1) / (pairs + 0.35));
      const size = (11 + 19 * g) * (1 - (i / pairs) * 0.42);
      const off = (3 + 9 * g) * (1 - (i / pairs) * 0.42);
      const n = g > 0.55 && i < pairs - 2 ? 7 : g > 0.22 && i < pairs - 1 ? 5 : 3;
      for (const side of [-1, 1]) {
        const x = 49.5 + side * off;
        const end = y + (wilted ? off * 0.5 : -off * 0.35);
        plant += twig(`M49.5 ${y + 2} Q${49.5 + side * off * 0.5} ${y} ${x} ${end}`, 2.6, 1.2)
          + fan(x, end, size, side * (wilted ? 128 : 72 - i * 5), n, i % 2 ? leaf : leaf2);
      }
    }
    plant += fan(50, top + 2, 9 + 11 * g, wilted ? 150 : 0, g > 0.3 ? 5 : 3, leaf);
  }
  // A bud: a cluster of green bumps with orange hairs and a little frost.
  const bud = (x, y, r) => [[0, 1.5, 0.8], [-0.65, 0.7, 0.78], [0.65, 0.7, 0.78], [0, 0.1, 0.95], [-0.5, -0.75, 0.7], [0.5, -0.75, 0.7], [0, -1.35, 0.75], [0, -2.1, 0.48]]
    .map(([dx, dy, k]) => `<circle cx="${x + dx * r}" cy="${y + dy * r}" r="${k * r}" fill="#9ad84a" stroke="#141414" stroke-width="1.1"/>`).join('')
    + [[-0.7, 0.4, -1], [0.6, -0.2, 1], [-0.2, -1.1, -1], [0.4, 1.2, 1], [0, -2.2, 1], [0.1, 0.3, -1]]
      .map(([dx, dy, side]) => `<path d="M${x + dx * r} ${y + dy * r} q${side * r * 0.55} ${-r * 0.15} ${side * r * 0.65} ${-r * 0.65}" fill="none" stroke="#f2711c" stroke-width="${Math.max(0.8, r * 0.2)}" stroke-linecap="round"/>`).join('')
    + [[-0.3, 0.9], [0.35, -0.6], [-0.1, -1.6]].map(([dx, dy]) => `<circle cx="${x + dx * r}" cy="${y + dy * r}" r="${r * 0.13}" fill="#f4ffd8"/>`).join('');
  let buds = '';
  if (!wilted && d >= FULL_GROWN) buds = bud(50, top - 1, 6.5) + bud(34, top + 24, 4.2) + bud(66, top + 30, 4.2);
  else if (!wilted && d >= 60) {
    buds = bud(50, top, 2.6 + (d - 60) / 16);
    if (d >= 87) buds += bud(36, top + 27, 2.8) + bud(64, top + 33, 2.8);
  }
  const sparkles = d >= FULL_GROWN ? '<path d="M12 12 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z M87 30 l1.5 4.5 4.5 1.5 -4.5 1.5 -1.5 4.5 -1.5 -4.5 -4.5 -1.5 4.5 -1.5z" fill="#f5c518" stroke="#141414" stroke-width="1"/>' : '';
  const seed = d ? '' : '<ellipse cx="50" cy="92" rx="5" ry="3.5" fill="#e0c188" stroke="#141414" stroke-width="2"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" aria-hidden="true" focusable="false">${sparkles}
    <ellipse cx="50" cy="95" rx="20" ry="4" fill="#5b3a1e" ${CUT}/>${seed}${plant}${buds}
    <path d="M30 96 L70 96 L64 118 L36 118 Z" fill="#c8693a" ${CUT}/>
    <rect x="27" y="94" width="46" height="7" rx="2" fill="#e0824c" ${CUT}/></svg>`;
}

// Tapping "rain days" shows the explanation instead of following the card's link.
globalThis.document?.addEventListener('click', (e) => {
  const tip = e.target.closest?.('.rain-tip');
  if (!tip) return;
  e.preventDefault();
  tip.focus();
});

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

export function streakHTML(s, { isMe = true, name = '', flag = false } = {}) {
  const notes = [
    `Longest: ${s.longest} day${s.longest === 1 ? '' : 's'}`,
    s.current >= FULL_GROWN ? 'Fully grown!' : s.current ? `${FULL_GROWN - s.current} days to fully grown` : '',
    // Hover (or tap) for the rules. title="" keeps the home page link's own tooltip out of the way.
    `<span class="rain-tip" tabindex="0" title="">🌧️ ${s.rain} rain day${s.rain === 1 ? '' : 's'} saved<span class="rain-help" role="tooltip"><b>Rain days</b> cover a missed day so the streak survives. Earn one for every ${RAIN_EVERY} streak days in a row and hold up to ${RAIN_MAX}. They are used automatically and don't add to the count.</span></span>`,
    isMe && s.doneToday ? (s.loggedToday ? '✓ logged today' : '✓ watered today') : '',
  ].filter(Boolean).join(' · ');
  return `
    <div class="streak-card paper${s.current >= 7 ? ' hot' : ''}${flag ? ' stars' : ''}">
      <div class="streak-plant">${plantSVG(s.broke || s.current, { wilted: !!s.broke })}</div>
      <div class="streak-num"><b>${s.current}</b><span>day${s.current === 1 ? '' : 's'}</span></div>
      <div class="streak-text">
        <strong>${isMe ? 'Your' : `${esc(name)}'s`} Tegridy streak</strong>
        <p>“${esc(randyLine(s, isMe))}” <span class="who">— Randy</span></p>
        <span class="streak-best streak-notes">${notes}</span>
        ${isMe && !s.doneToday ? `<span class="streak-best">Water it today: log an episode, finish today's Mystery, or judge ${WATER_FIGHTS} Cage Match fights.</span>` : ''}
      </div>
    </div>`;
}
