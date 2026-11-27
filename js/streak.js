// Tegridy streak: days in a row with at least one log. Randy has feelings about it.
import { esc } from './ui.js?v=20261127172532';

const dayKey = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
const shift = (key, days) => {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return dayKey(d);
};

/**
 * streakInfo(logs) -> { current, longest, loggedToday, atRisk, broke, lastDay }
 *   logs: rows with created_at. A log counts on the day you actually logged it, never the
 *   "watched on" date, so back-dating or importing old diaries can't fake a streak.
 */
export function streakInfo(logs, now = new Date()) {
  const days = new Set();
  for (const l of logs || []) if (l.created_at) days.add(dayKey(new Date(l.created_at)));
  const today = dayKey(now);
  const yesterday = shift(today, -1);
  const loggedToday = days.has(today);
  const runFrom = (key) => { let n = 0; while (days.has(key)) { n++; key = shift(key, -1); } return n; };
  const current = loggedToday ? runFrom(today) : days.has(yesterday) ? runFrom(yesterday) : 0;

  let longest = 0;
  for (const d of days) if (!days.has(shift(d, -1))) {
    let n = 0; let k = d;
    while (days.has(k)) { n++; k = shift(k, 1); }
    longest = Math.max(longest, n);
  }
  const past = [...days].filter((d) => d <= today).sort();
  const lastDay = past[past.length - 1] || null;
  // Broke recently: no streak now, but there was a 3+ day run that ended in the last week.
  const ended = lastDay && runFrom(lastDay);
  const broke = current === 0 && ended >= 3 && lastDay >= shift(today, -7) ? ended : 0;
  return { current, longest, loggedToday, atRisk: current > 0 && !loggedToday, broke, lastDay };
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
    'Log something today or the streak dies! I am not kidding, this is serious!',
    "Don't you dare let this streak die. Log an episode. Do it for the farm.",
    "The streak is hanging by a thread, man! One episode. That's all I'm asking.",
  ], s.current);
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
  return `
    <div class="streak-card paper${s.current >= 7 ? ' hot' : ''}">
      <div class="streak-num"><span aria-hidden="true">🌱</span><b>${s.current}</b><span>day${s.current === 1 ? '' : 's'}</span></div>
      <div class="streak-text">
        <strong>${isMe ? 'Your' : `${esc(name)}'s`} Tegridy streak</strong>
        <p>“${esc(randyLine(s, isMe))}” <span class="who">— Randy</span></p>
        <span class="streak-best">Longest: ${s.longest} day${s.longest === 1 ? '' : 's'}${isMe && s.atRisk ? ' · log today to keep it' : ''}${isMe && s.loggedToday ? ' · ✓ logged today' : ''}</span>
      </div>
    </div>`;
}
