// Mr. Garrison's Report Card: every season gets a letter grade from your ratings.
import { esc } from './ui.js';

const GRADES = [
  [4.5, 'A+'], [4.2, 'A'], [3.9, 'A-'], [3.6, 'B+'], [3.3, 'B'], [3.0, 'B-'],
  [2.7, 'C+'], [2.4, 'C'], [2.1, 'C-'], [1.7, 'D'], [0, 'F'],
];
export const gradeFor = (avg) => GRADES.find(([min]) => avg >= min)[1];
const GPA = { 'A+': 4.3, A: 4, 'A-': 3.7, 'B+': 3.3, B: 3, 'B-': 2.7, 'C+': 2.3, C: 2, 'C-': 1.7, D: 1, F: 0 };

// Comments about each season, by grade letter. {s} = the season.
const COMMENTS = {
  A: [
    '{s} is a model student. Frankly it makes the others look bad, and I like that.',
    'Teacher\'s pet. Sits in the front row, does the reading, never talks back. Gold star.',
    '{s} gets an A. Don\'t let it go to its head. Too late, it already has.',
    'Outstanding work. If every season was like {s}, I could retire early.',
    'Brilliant. Absolutely brilliant. I\'m going to take full credit for this.',
  ],
  B: [
    'Good effort. Not great, mind you. Good.',
    '{s} is a solid student with a lot of potential, which is teacher-speak for "almost".',
    'Above average. Which, in this town, isn\'t saying much.',
    'Would be an A if it applied itself. It does not apply itself.',
    'Pleasant to have in class. Occasionally funny. Don\'t tell it I said so.',
  ],
  C: [
    'Perfectly mediocre. The human equivalent of a beige sweater.',
    '{s} shows up, does the minimum, and leaves. I respect the honesty.',
    'Average. Thoroughly, painfully average.',
    'Needs to participate more. And be funnier. Mostly the funnier part.',
    'I\'ve seen worse. I\'ve also seen a lot better. Mostly better.',
  ],
  D: [
    '{s} is barely passing, and that\'s me being generous after my morning coffee.',
    'Spends most of class staring out the window. Needs to see me after school.',
    'Disappointing. I expected more, and I don\'t expect much.',
    'If {s} doesn\'t improve, I\'m calling its parents.',
  ],
  F: [
    'Fail. See me after class. Actually, don\'t. I need a break from you.',
    '{s} is going to summer school, and so am I, apparently.',
    'I have never been so disappointed in a group of episodes in my entire career.',
    'F. And that\'s only because the alphabet doesn\'t go any lower.',
  ],
};

// A note about the student (the person) at the bottom of the card.
function studentNote({ avg, rated, seasons }) {
  if (rated < 10) return 'Student has barely turned in any homework. Rate more episodes, or it\'s detention.';
  if (avg >= 4.2) return 'This student gives everybody an A. That is not how grading works. Ask literally any teacher.';
  if (avg <= 2.6) return 'This student grades harder than I do, and I once failed a kid for breathing too loud.';
  if (seasons >= 20) return 'Perfect attendance. Watches everything, grades fairly. Frankly suspicious. Keep an eye on this one.';
  if (seasons <= 4) return 'Only shows up for a few seasons. Selective attendance is still bad attendance.';
  return 'A fair grader with reasonable opinions. Boring, but reasonable. Promoted to the next grade.';
}

// A season needs this share of its episodes rated (and at least MIN_RATED) to be graded.
const SHARE = 0.4;
const MIN_RATED = 3;
const neededFor = (total) => Math.max(MIN_RATED, Math.ceil(total * SHARE));

const INCOMPLETE = [
  'Incomplete. I can\'t grade {s} on a handful of homework. Rate {n} more.',
  'You can\'t just watch a couple and call it a season. {n} more ratings, then we talk.',
  'Incomplete. {s} is sitting in the hallway until you rate {n} more episodes.',
  'I don\'t do partial credit. Rate {n} more and I\'ll give {s} a real grade.',
  'Did you lose your homework? {s} needs {n} more ratings before I grade it.',
];

// Comments rotate by season and never repeat on one card (until a list runs out).
const picker = () => {
  const used = new Map();
  return (arr, seed) => {
    const u = used.get(arr) || new Set();
    used.set(arr, u);
    if (u.size >= arr.length) u.clear();
    let i = (seed * 7 + 3) % arr.length;
    while (u.has(i)) i = (i + 1) % arr.length;
    u.add(i);
    return arr[i];
  };
};

/**
 * reportCardHTML({ seasonAvgs, all, seen, isMe, name })
 *   seasonAvgs: rows from user_season_averages; all: episodes; seen: Set of watched episode ids
 */
export function reportCardHTML({ seasonAvgs, all, seen, isMe, name }) {
  const today = new Date().toLocaleDateString('en-CA');
  const pick = picker();
  const totals = new Map();
  for (const e of all) {
    if (e.kind !== 'episode' || !e.season || (e.air_date && e.air_date > today)) continue; // unaired episodes don't count
    const t = totals.get(e.season) || { total: 0, watched: 0 };
    t.total++;
    if (seen.has(e.id)) t.watched++;
    totals.set(e.season, t);
  }
  const all_rows = (seasonAvgs || []).filter((r) => r.season > 0 && r.rated_count >= 1)
    .sort((a, b) => a.season - b.season)
    .map((r) => {
      const avg = Number(r.avg_rating);
      const att = totals.get(r.season) || { total: 0, watched: 0 };
      const need = neededFor(att.total);
      const s = `Season ${r.season}`;
      if (r.rated_count < need) {
        return { season: r.season, avg, g: 'INC', rated: r.rated_count, need, att, incomplete: true,
          comment: pick(INCOMPLETE, r.season).replaceAll('{s}', s).replaceAll('{n}', String(need - r.rated_count)) };
      }
      const g = gradeFor(avg);
      return { season: r.season, avg, g, rated: r.rated_count, need, att,
        comment: pick(COMMENTS[g[0]], r.season).replaceAll('{s}', s) };
    });
  const rows = all_rows.filter((r) => !r.incomplete);
  if (!all_rows.length) {
    return `<p class="empty">${isMe ? `No grades yet. Rate enough of a season (about ${Math.round(SHARE * 100)}% of it) and Mr. Garrison will grade it. He's been waiting.` : `${esc(name)} hasn't rated enough for a report card.`}</p>`;
  }
  const gpa = rows.length ? rows.reduce((a, r) => a + GPA[r.g], 0) / rows.length : null;
  const rated = all_rows.reduce((a, r) => a + r.rated, 0);
  const avg = all_rows.reduce((a, r) => a + r.avg * r.rated, 0) / rated;
  const best = [...rows].sort((a, b) => b.avg - a.avg)[0];
  const worst = [...rows].sort((a, b) => a.avg - b.avg)[0];
  const gradeClass = (g) => (g === 'INC' ? 'grade-inc' : `grade-${g[0].toLowerCase()}`);

  return `
    <div class="report-card paper">
      <div class="rc-head">
        <div><span class="cut">South Park Elementary</span><strong>Report Card</strong></div>
        <div class="rc-meta">Student: <b>${esc(name)}</b><br>Teacher: Mr. Garrison<br>Class GPA: <b>${gpa == null ? 'pending' : gpa.toFixed(2)}</b></div>
      </div>
      <table class="rc-table">
        <thead><tr><th scope="col">Subject</th><th scope="col">Grade</th><th scope="col">Rated</th><th scope="col">Teacher's comments</th></tr></thead>
        <tbody>${all_rows.map((r) => `
          <tr${r.incomplete ? ' class="rc-inc"' : ''}>
            <th scope="row"><a href="seasons.html?s=${r.season}">Season ${r.season}</a></th>
            <td><span class="rc-grade ${gradeClass(r.g)}" title="${r.incomplete
              ? `Incomplete: ${r.rated} of ${r.att.total} rated, needs ${r.need} for a grade`
              : `${r.avg.toFixed(2)}★ average from ${r.rated} rated`}">${r.g}</span></td>
            <td>${r.rated}/${r.att.total}${r.incomplete ? `<span class="rc-need">needs ${r.need}</span>` : ''}</td>
            <td>${esc(r.comment)}</td>
          </tr>`).join('')}</tbody>
      </table>
      <div class="rc-foot">
        ${best ? `<p><b>Valedictorian:</b> Season ${best.season} (${best.g}).${rows.length > 1 ? ` <b>Most likely to repeat a grade:</b> Season ${worst.season} (${worst.g}).` : ''}</p>`
          : '<p><b>No grades yet.</b> Every season is incomplete. Rate more of a season to get it graded.</p>'}
        <p style="font-size:12px;color:#666">A season gets a grade once ${Math.round(SHARE * 100)}% of its episodes are rated (at least ${MIN_RATED}). INC = incomplete.</p>
        <p><b>Note about the student:</b> ${esc(studentNote({ avg, rated, seasons: rows.length }))}</p>
        <p class="rc-sign">— Mr. Garrison</p>
      </div>
    </div>`;
}
