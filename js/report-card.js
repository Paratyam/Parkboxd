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

const pick = (arr, seed) => arr[((seed * 2654435761) >>> 0) % arr.length];

/**
 * reportCardHTML({ seasonAvgs, all, seen, isMe, name })
 *   seasonAvgs: rows from user_season_averages; all: episodes; seen: Set of watched episode ids
 */
export function reportCardHTML({ seasonAvgs, all, seen, isMe, name }) {
  const totals = new Map();
  for (const e of all) {
    if (e.kind !== 'episode' || !e.season) continue;
    const t = totals.get(e.season) || { total: 0, watched: 0 };
    t.total++;
    if (seen.has(e.id)) t.watched++;
    totals.set(e.season, t);
  }
  const rows = (seasonAvgs || []).filter((r) => r.season > 0 && r.rated_count >= 2)
    .sort((a, b) => a.season - b.season)
    .map((r) => {
      const avg = Number(r.avg_rating);
      const g = gradeFor(avg);
      const s = `Season ${r.season}`;
      return { season: r.season, avg, g, rated: r.rated_count, att: totals.get(r.season) || { total: 0, watched: 0 },
        comment: pick(COMMENTS[g[0]], r.season).replaceAll('{s}', s) };
    });
  if (!rows.length) {
    return `<p class="empty">${isMe ? 'No grades yet. Rate at least 2 episodes in a season and Mr. Garrison will grade it. He\'s been waiting.' : `${esc(name)} hasn't rated enough for a report card.`}</p>`;
  }
  const gpa = rows.reduce((a, r) => a + GPA[r.g], 0) / rows.length;
  const rated = rows.reduce((a, r) => a + r.rated, 0);
  const avg = rows.reduce((a, r) => a + r.avg * r.rated, 0) / rated;
  const best = [...rows].sort((a, b) => b.avg - a.avg)[0];
  const worst = [...rows].sort((a, b) => a.avg - b.avg)[0];
  const gradeClass = (g) => `grade-${g[0].toLowerCase()}`;

  return `
    <div class="report-card paper">
      <div class="rc-head">
        <div><span class="cut">South Park Elementary</span><strong>Report Card</strong></div>
        <div class="rc-meta">Student: <b>${esc(name)}</b><br>Teacher: Mr. Garrison<br>Class GPA: <b>${gpa.toFixed(2)}</b></div>
      </div>
      <table class="rc-table">
        <thead><tr><th scope="col">Subject</th><th scope="col">Grade</th><th scope="col">Attendance</th><th scope="col">Teacher's comments</th></tr></thead>
        <tbody>${rows.map((r) => `
          <tr>
            <th scope="row"><a href="seasons.html?s=${r.season}">Season ${r.season}</a></th>
            <td><span class="rc-grade ${gradeClass(r.g)}" title="${r.avg.toFixed(2)}★ average from ${r.rated} rated">${r.g}</span></td>
            <td>${r.att.watched}/${r.att.total}</td>
            <td>${esc(r.comment)}</td>
          </tr>`).join('')}</tbody>
      </table>
      <div class="rc-foot">
        <p><b>Valedictorian:</b> Season ${best.season} (${best.g}). <b>Most likely to repeat a grade:</b> Season ${worst.season} (${worst.g}).</p>
        <p><b>Note about the student:</b> ${esc(studentNote({ avg, rated, seasons: rows.length }))}</p>
        <p class="rc-sign">— Mr. Garrison</p>
      </div>
    </div>`;
}
