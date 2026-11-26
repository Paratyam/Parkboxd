// Mr. Garrison's Report Card: every season gets a letter grade from your ratings.
import { esc, stars, toast } from './ui.js';

// Season averages bunch up between 3 and 4, so the scale is set around that: 4.2+ is
// already exceptional across a whole season, and 3.0 is a perfectly fine season.
const GRADES = [
  [4.2, 'A+'], [4.0, 'A'], [3.8, 'A-'], [3.6, 'B+'], [3.4, 'B'], [3.2, 'B-'],
  [3.0, 'C+'], [2.8, 'C'], [2.6, 'C-'], [2.2, 'D'], [0, 'F'],
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
// ...but never more than the season has (a 2-episode season needs both).
const neededFor = (total) => Math.min(total, Math.max(MIN_RATED, Math.ceil(total * SHARE)));

const INCOMPLETE = [
  'Incomplete. I can\'t grade {s} on a handful of homework. Rate {n} more.',
  'You can\'t just watch a couple and call it a season. {n} more ratings, then we talk.',
  'Incomplete. {s} is sitting in the hallway until you rate {n} more episodes.',
  'I don\'t do partial credit. Rate {n} more and I\'ll give {s} a real grade.',
  'Did you lose your homework? {s} needs {n} more ratings before I grade it.',
];

const ABSENT = [
  'Absent. Never showed up to class. Not once.',
  '{s}? Never heard of it. Has anyone seen {s}? Anyone?',
  'Absent. I\'m marking this down in my little book.',
  'No homework, no attendance, no excuses. Absent.',
  'Absent. If {s} doesn\'t show up soon, I\'m calling its parents.',
  'I\'ve been saving a seat for {s} all year. It\'s still empty.',
  'Absent. Probably skipping class to go to Casa Bonita.',
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

// Grading on a curve: each season is graded against your own average, so a tough rater's
// best season still gets an A. Your average season lands on a B+.
const CURVE_CENTER = 3.6;
const CURVE_SPREAD = 1.5;
const CURVE_KEY = 'parkboxd-rc-curve';

const CURVE_LINES = [
  "I'm grading on a curve, because frankly, you're all idiots.",
  'Graded on a curve. Your standards are your standards. I just work here.',
  "Curved grades. Don't get excited, it's a very small curve.",
];

/**
 * reportCardHTML({ seasonAvgs, all, seen, ratings, isMe, name, curve })
 *   seasonAvgs: rows from user_season_averages; all: episodes; seen: Set of watched episode ids
 *   ratings: Map(episodeId -> latest stars), for each season's best and worst episode
 *   curve: grade against the person's own average instead of the fixed scale
 */
export function reportCardHTML({ seasonAvgs, all, seen, ratings = new Map(), isMe, name, curve = false }) {
  const today = new Date().toLocaleDateString('en-CA');
  const pick = picker();
  const totals = new Map();
  const bySeason = new Map();
  for (const e of all) {
    if (e.kind !== 'episode' || !e.season || (e.air_date && e.air_date > today)) continue; // unaired episodes don't count
    const t = totals.get(e.season) || { total: 0, watched: 0 };
    t.total++;
    if (seen.has(e.id)) t.watched++;
    totals.set(e.season, t);
    if (ratings.has(e.id)) bySeason.set(e.season, [...(bySeason.get(e.season) || []), { ep: e, r: ratings.get(e.id) }]);
  }
  const ratedRows = (seasonAvgs || []).filter((r) => r.season > 0 && r.rated_count >= 1);
  if (!ratedRows.length) {
    return `<p class="empty">${isMe ? `No grades yet. Rate enough of a season (about ${Math.round(SHARE * 100)}% of it) and Mr. Garrison will grade it. He's been waiting.` : `${esc(name)} hasn't rated enough for a report card.`}</p>`;
  }
  const rated = ratedRows.reduce((a, r) => a + r.rated_count, 0);
  const avg = ratedRows.reduce((a, r) => a + Number(r.avg_rating) * r.rated_count, 0) / rated;
  const score = (seasonAvg) => (curve ? CURVE_CENTER + (seasonAvg - avg) * CURVE_SPREAD : seasonAvg);

  // Class star and troublemaker: the season's best and worst rated episode.
  const starsLine = (season) => {
    const list = [...(bySeason.get(season) || [])].sort((a, b) => b.r - a.r || a.ep.number - b.ep.number);
    if (list.length < 2) return '';
    const top = list[0];
    const low = list[list.length - 1];
    const link = (x) => `<a href="episode.html?id=${x.ep.id}">${esc(x.ep.title)}</a> <span class="rc-st">${stars(x.r)}</span>`;
    return top.r === low.r
      ? '<span class="rc-stars">Everybody got the same score. Suspicious.</span>'
      : `<span class="rc-stars">⭐ Class star: ${link(top)} · 🙄 Troublemaker: ${link(low)}</span>`;
  };

  const all_rows = ratedRows.sort((a, b) => a.season - b.season).map((r) => {
    const seasonAvg = Number(r.avg_rating);
    const att = totals.get(r.season) || { total: 0, watched: 0 };
    const need = neededFor(att.total);
    const s = `Season ${r.season}`;
    if (r.rated_count < need) {
      return { season: r.season, avg: seasonAvg, g: 'INC', rated: r.rated_count, need, att, incomplete: true,
        comment: pick(INCOMPLETE, r.season).replaceAll('{s}', s).replaceAll('{n}', String(need - r.rated_count)) };
    }
    const g = gradeFor(score(seasonAvg));
    return { season: r.season, avg: seasonAvg, g, rated: r.rated_count, need, att,
      comment: pick(COMMENTS[g[0]], r.season).replaceAll('{s}', s) };
  });
  const rows = all_rows.filter((r) => !r.incomplete);
  // Every aired season appears on the card: ones with no ratings at all are marked ABSENT.
  const ratedSeasons = new Set(all_rows.map((r) => r.season));
  const absent = [...totals.entries()].filter(([season]) => !ratedSeasons.has(season)).map(([season, att]) => ({
    season, avg: 0, g: 'ABS', rated: 0, need: neededFor(att.total), att, incomplete: true, absent: true,
    comment: pick(ABSENT, season).replaceAll('{s}', `Season ${season}`),
  }));
  const tableRows = [...all_rows, ...absent].sort((a, b) => a.season - b.season);
  const gpa = rows.length ? rows.reduce((a, r) => a + GPA[r.g], 0) / rows.length : null;
  const best = [...rows].sort((a, b) => b.avg - a.avg)[0];
  const worst = [...rows].sort((a, b) => a.avg - b.avg)[0];
  const gradeClass = (g) => (g === 'INC' || g === 'ABS' ? 'grade-inc' : `grade-${g[0].toLowerCase()}`);

  return `
    <div class="report-card paper">
      <div class="rc-head">
        <div><span class="cut">South Park Elementary</span><strong>Report Card</strong></div>
        <div class="rc-meta">Student: <b>${esc(name)}</b><br>Teacher: Mr. Garrison<br>Class GPA: <b>${gpa == null ? 'pending' : gpa.toFixed(2)}</b>${curve ? ' <span class="rc-curve-tag">curved</span>' : ''}</div>
      </div>
      <div class="rc-actions">
        <div class="chips" role="group" aria-label="Grading">
          <button type="button" class="chip" data-curve="0" aria-pressed="${!curve}">Straight grades</button>
          <button type="button" class="chip" data-curve="1" aria-pressed="${curve}">On a curve</button>
        </div>
        <button type="button" class="btn btn-ghost rc-save">📸 Save as image</button>
      </div>
      <table class="rc-table">
        <thead><tr><th scope="col">Subject</th><th scope="col">Grade</th><th scope="col">Rated</th><th scope="col">Teacher's comments</th></tr></thead>
        <tbody>${tableRows.map((r) => `
          <tr${r.incomplete ? ' class="rc-inc"' : ''}>
            <th scope="row"><a href="seasons.html?s=${r.season}">Season ${r.season}</a></th>
            <td><span class="rc-grade ${gradeClass(r.g)}" title="${r.incomplete
              ? `${r.absent ? 'Absent: nothing rated' : `Incomplete: ${r.rated} of ${r.att.total} rated`}, needs ${r.need} for a grade`
              : `${r.avg.toFixed(2)}★ average from ${r.rated} rated${curve ? ` (your average is ${avg.toFixed(2)}★)` : ''}`}">${r.g}</span></td>
            <td>${r.rated}/${r.att.total}${r.incomplete ? `<span class="rc-need">needs ${r.need}</span>` : ''}</td>
            <td>${esc(r.comment)}${r.absent ? '' : starsLine(r.season)}</td>
          </tr>`).join('')}</tbody>
      </table>
      <div class="rc-foot">
        ${best ? `<p><b>Valedictorian:</b> Season ${best.season} (${best.g}).${rows.length > 1 ? ` <b>Most likely to repeat a grade:</b> Season ${worst.season} (${worst.g}).` : ''}</p>`
          : '<p><b>No grades yet.</b> Every season is incomplete. Rate more of a season to get it graded.</p>'}
        ${curve ? `<p><b>Grading:</b> ${esc(pick(CURVE_LINES, Math.round(avg * 10)))} Average season (${avg.toFixed(2)}★) = B+.</p>` : ''}
        <p style="font-size:12px;color:#666">A season gets a grade once ${Math.round(SHARE * 100)}% of its episodes are rated (at least ${MIN_RATED}, or the whole season if it has fewer). INC = incomplete, ABS = absent (nothing rated yet).</p>
        <p><b>Note about the student:</b> ${esc(studentNote({ avg, rated, seasons: rows.length }))}</p>
        <p class="rc-sign">— Mr. Garrison</p>
      </div>
    </div>`;
}

// Turn the card into a PNG: share it on phones that can, download it everywhere else.
async function saveImage(card, name, button) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = 'Taking the photo…';
  try {
    const { toBlob } = await import('https://esm.sh/html-to-image@1.11.11');
    const blob = await toBlob(card, {
      pixelRatio: 2,
      backgroundColor: '#f6f1e1',
      filter: (node) => !(node.classList && node.classList.contains('rc-actions')),
    });
    const file = new File([blob], `report-card-${name}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ files: [file], title: "Mr. Garrison's Report Card" });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast("Report card saved. Go show your parents. Or don't.");
    }
  } catch (e) {
    if (e?.name !== 'AbortError') toast(`Couldn't save the image: ${e?.message || e}`);
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

/** Render the report card into el, with the curve toggle and the save button wired up. */
export function mountReportCard(el, opts) {
  const draw = () => {
    const curve = localStorage.getItem(CURVE_KEY) !== '0'; // on a curve unless switched off
    el.innerHTML = reportCardHTML({ ...opts, curve });
    el.querySelectorAll('[data-curve]').forEach((b) => b.addEventListener('click', () => {
      localStorage.setItem(CURVE_KEY, b.dataset.curve);
      draw();
    }));
    el.querySelector('.rc-save')?.addEventListener('click', (e) => saveImage(el.querySelector('.report-card'), opts.name, e.currentTarget));
  };
  draw();
}

