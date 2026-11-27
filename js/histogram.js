// Letterboxd-style rating bar chart: ten half-star buckets, ½ on the left, 5 on the right.
import { esc, stars } from './ui.js?v=20261127211334';

export const BUCKETS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export function countRatings(ratings) {
  const counts = BUCKETS.map(() => 0);
  for (const r of ratings) {
    const i = BUCKETS.indexOf(Number(r));
    if (i >= 0) counts[i]++;
  }
  return counts;
}

/**
 * counts: 10 numbers, one per bucket.
 * href(bucket): when given, each bar is a link (e.g. to that user's 4★ episodes).
 * active: the bucket to highlight.
 */
export function histogramHTML(counts, { href, active = null } = {}) {
  const max = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const bars = counts.map((c, i) => {
    const b = BUCKETS[i];
    const pct = total ? Math.round((c / total) * 100) : 0;
    const label = `${c} ${c === 1 ? 'episode' : 'episodes'} rated ${stars(b)} (${pct}%)`;
    const style = `height:${Math.max(3, (c / max) * 100)}%`;
    return href
      ? `<a class="bucket${active === b ? ' active' : ''}" href="${esc(href(b))}" style="${style}" title="${label}" aria-label="${label}"${active === b ? ' aria-current="true"' : ''}></a>`
      : `<div class="bucket" style="${style}" title="${label}"></div>`;
  }).join('');
  return `
    <div class="histogram${href ? ' clickable' : ''}">
      <span class="end" aria-hidden="true">★</span>
      ${bars}
      <span class="end" aria-hidden="true">★★★★★</span>
    </div>`;
}
