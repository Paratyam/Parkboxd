// Book Club attendance: weeks in a row you logged that week's pick, with stickers along the way.
// Worked out from your logs (by when they were made, so backdating doesn't count). No database.
import { stickerSVG } from './art.js?v=20261127211602';
import { CLUB_START, weekStart } from './club.js?v=20261127211602';

const SLIP_EVERY = 10; // one free life (a forgiven missed week) in any 10

export const STICKERS = [
  { n: 3, key: 'apple', name: 'Apple', line: "Three whole weeks! You're a regular now." },
  { n: 5, key: 'star', name: 'Gold star', line: "Five in a row! I'm getting out the good stickers." },
  { n: 10, key: 'bookmark', name: 'Golden bookmark', line: 'Ten weeks! I never had a friend show up ten times.' },
  { n: 25, key: 'trophy', name: 'Library trophy', line: "Twenty-five! I'm gonna cry, and it's the happy kind." },
  { n: 52, key: 'crown', name: 'Head Librarian', line: 'A whole year! You can hold the date stamp.' },
];

/** Offsets for loadPicks covering every week since the club began, newest first. */
export function clubOffsets() {
  const weeks = Math.round((weekStart(0).getTime() - Date.parse(`${CLUB_START}T00:00:00Z`)) / (7 * 86400000)) + 1;
  return Array.from({ length: Math.max(1, weeks) }, (_, i) => -i);
}

export const readInWeek = (pk, logs) => !!pk.pick && logs.some((l) => l.episode_id === pk.pick.id
  && new Date(l.created_at) >= pk.start && new Date(l.created_at) < pk.end);

/**
 * attendance(picks, logs) -> { streak, best, lifeReady, lifeIn, forgiven, readThisWeek }
 *   picks: from loadPicks, any order (real weeks only count). The week still running never breaks
 *   a streak. A free life keeps the streak through one missed week, without adding to it.
 */
export function attendance(picks, logs, now = new Date()) {
  const weeks = picks.filter((p) => p.real).sort((a, b) => a.start - b.start);
  let streak = 0;
  let best = 0;
  let slipAt = -SLIP_EVERY;
  let forgiven = false; // the current streak is being held up by a free life
  let readThisWeek = false;
  weeks.forEach((pk, i) => {
    const read = readInWeek(pk, logs);
    const running = pk.end > now;
    if (running) readThisWeek = read;
    if (read) {
      streak++;
      best = Math.max(best, streak);
    } else if (!running && streak) {
      if (i - slipAt >= SLIP_EVERY) { slipAt = i; forgiven = true; } else { streak = 0; forgiven = false; }
    }
  });
  const lifeIn = Math.max(0, slipAt + SLIP_EVERY - (weeks.length - 1)); // weeks until it's back
  return { streak, best, forgiven, lifeReady: !lifeIn, lifeIn, readThisWeek };
}

/**
 * The streak line, stickers and Butters' words. mine: shows the nudge to log this week's book.
 * card: the Book Club page's library card, which stacks the lines and counts down to the next sticker.
 */
export function attendanceHTML(a, { mine = false, card = false } = {}) {
  const top = [...STICKERS].reverse().find((s) => a.best >= s.n);
  const nudge = mine && !a.readThisWeek ? `Log this week's book to make it ${a.streak + 1}!` : '';
  const next = card && STICKERS.find((s) => a.best < s.n);
  const need = next ? next.n - a.streak : 0;
  return `<div class="attend">
    <p class="attend-line" style="margin:0"><strong>🔥 ${a.streak} week${a.streak === 1 ? '' : 's'} in a row</strong>
      <span>${card ? '' : '· '}Best: ${a.best}${nudge ? ` · ${nudge}` : ''}</span></p>
    <p class="attend-life${a.lifeReady ? '' : ' used'}" title="${a.lifeReady ? 'Miss a week and the streak survives.' : 'Another miss before it returns resets the streak.'}"><i aria-hidden="true">${a.lifeReady ? '♥' : '♡'}</i>
      <span>${a.lifeReady ? '<b>1 free life</b> · miss a week, keep the streak' : `<b>Free life used</b> · back in ${a.lifeIn} week${a.lifeIn === 1 ? '' : 's'}`}</span></p>
    <ul class="attend-stickers">${STICKERS.map((s) => `<li class="${a.best >= s.n ? '' : 'locked'}" title="${s.name}: ${s.n} weeks in a row${a.best >= s.n ? ' (earned)' : ''}">${stickerSVG(s.key)}<span>${a.best >= s.n ? s.name : `${s.n} weeks`}</span></li>`).join('')}</ul>
    ${next ? `<p class="attend-goal">Next sticker: ${need} more week${need === 1 ? '' : 's'}</p>` : ''}
    ${top ? `<p class="attend-butters">“${top.line}” — Butters</p>` : ''}
  </div>`;
}
