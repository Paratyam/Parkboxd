// "Describe what happened" episode search: matches the title, the TMDB overview and the
// hand-written keywords in js/data/episode-keywords.js. Every meaningful word must match
// somewhere (light stemming + synonyms); title hits rank first, then plot hits.
import { EPISODE_KEYWORDS, SEARCH_SYNONYMS } from './data/episode-keywords.js?v=20261127201827';

const STOP = new Set(("a an and are as at be been but by for from has have he her him his how i in into is it its " +
  "me my of on or our out she so than that the their them then there they this to up was we were what when where " +
  "which who whom why will with you your episode episodes ep one where about after before over gets get got does did do " +
  "just like some all").split(" "));

const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "");
const words = (s) => fold(s).split(/[^a-z0-9+]+/).filter(Boolean);
const tokens = (s) => words(s).filter((w) => !STOP.has(w)).map(stem);

// Light stemmer: plurals, -ing, -ed, trailing e/y, so "racing"/"race"/"races" all meet.
export function stem(w) {
  if (w.length <= 3) return w;
  if (w.length > 4 && w.endsWith("ies")) w = w.slice(0, -3) + "i";
  else if (/(ss|us|is)$/.test(w)) { /* keep: boss, bus, this */ }
  else if (/(xes|ches|shes|sses|zes)$/.test(w)) w = w.slice(0, -2);
  else if (w.endsWith("s")) w = w.slice(0, -1);
  const undouble = (x) => (/([^aeiouls])\1$/.test(x) ? x.slice(0, -1) : x);
  if (w.length > 5 && w.endsWith("ing")) w = undouble(w.slice(0, -3));
  else if (w.length > 4 && w.endsWith("ed")) w = undouble(w.slice(0, -2));
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  else if (w.length > 3 && w.endsWith("y")) w = w.slice(0, -1) + "i";
  return w;
}

const SYN = new Map();
for (const group of SEARCH_SYNONYMS) {
  const stems = [...new Set(group.map(stem))];
  for (const s of stems) SYN.set(s, [...new Set([...(SYN.get(s) || []), ...stems])]);
}
const KEYWORDS = new Map(Object.entries(EPISODE_KEYWORDS).map(([t, k]) => [fold(t).trim(), k]));

let built = null; // { list, idx: Map(ep.id → doc), df: Map(stem → count) }
function build(all) {
  if (built?.list === all) return built;
  const idx = new Map();
  const df = new Map();
  for (const ep of all) {
    const kw = KEYWORDS.get(fold(ep.title).trim()) || "";
    const doc = {
      title: new Set(tokens(ep.title)),
      kw: new Set(tokens(kw)),
      plot: new Set(tokens(ep.overview)),
      titleText: words(ep.title).join(" "),
      kwText: kw,
    };
    idx.set(ep.id, doc);
    for (const s of new Set([...doc.title, ...doc.kw, ...doc.plot])) df.set(s, (df.get(s) || 0) + 1);
  }
  built = { list: all, idx, df };
  return built;
}

// Query → [{ alts: [stems], prefix: raw word or null }]
function parse(query, { prefixLast = true } = {}) {
  const raw = words(query);
  const kept = raw.filter((w) => !STOP.has(w));
  return kept.map((w, i) => {
    const s = stem(w);
    return { word: w, alts: SYN.get(s) || [s], prefix: prefixLast && i === kept.length - 1 && w.length >= 3 ? w : null };
  });
}

function fieldHit(set, term) {
  for (const a of term.alts) if (set.has(a)) return 1;
  if (term.prefix) for (const w of set) if (w.startsWith(term.prefix) || w.startsWith(stem(term.prefix))) return 0.7;
  return 0;
}

// Ranked matches: [{ ep, score, inTitle, terms }]. inTitle = the title alone matches the search.
export function searchEpisodes(all, query, { prefixLast = true } = {}) {
  const q = words(query).join(" ");
  if (!q) return [];
  const { idx, df } = build(all);
  const terms = parse(query, { prefixLast });
  const n = all.length;
  const idf = (t) => Math.log(1 + n / (1 + Math.min(...t.alts.map((a) => df.get(a) || 0))));
  const run = (allowMiss) => {
    const out = [];
    for (const ep of all) {
      const d = idx.get(ep.id);
      const titleText = d.titleText;
      const fullTitle = titleText.includes(q);
      let score = fullTitle ? 100 + (titleText.startsWith(q) ? 20 : 0) + (titleText === q ? 30 : 0) : 0;
      let miss = 0;
      let titleAll = terms.length > 0;
      for (const t of terms) {
        const ti = fieldHit(d.title, t) * 3;
        const kw = fieldHit(d.kw, t) * 2.5;
        const pl = fieldHit(d.plot, t);
        const best = Math.max(ti, kw, pl);
        if (!ti) titleAll = false;
        if (!best) miss++;
        else score += idf(t) * best;
      }
      if (!fullTitle && (!terms.length || miss > allowMiss)) continue;
      // Whole phrase in the plot or keywords ("theme park") beats scattered words.
      if (terms.length > 1 && (fold(ep.overview).includes(q) || fold(d.kwText).includes(q))) score += 5;
      score -= miss * 3;
      out.push({ ep, score, inTitle: fullTitle || titleAll, terms, miss: fullTitle ? 0 : miss });
    }
    return out;
  };
  let hits = run(0);
  // Long descriptions rarely match word for word: with few exact hits, add the ones missing a
  // single word underneath. Nothing at all: all but one word, then all but two…
  if (terms.length >= 3 && hits.length < 5) hits = run(1);
  for (let miss = 1; !hits.length && miss < terms.length; miss++) hits = run(miss);
  return hits.sort((a, b) => (b.inTitle - a.inTitle) || (a.miss - b.miss) || (b.score - a.score));
}

const escHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Why it matched: the bit of the overview that covers the most search words, matched words
// in <mark>. Words found only in the hand-written keywords are shown first ("theme park · …").
export function snippetHTML(hit, max = 120) {
  const text = hit.ep.overview || "";
  const termOf = (w) => {
    const f = fold(w);
    if (!f || STOP.has(f)) return null;
    const s = stem(f);
    for (let ti = 0; ti < hit.terms.length; ti++) {
      const t = hit.terms[ti];
      if (stem(t.word) === s || (t.prefix && f.startsWith(t.prefix))) return { ti, weight: 2 };
      if (t.alts.includes(s)) return { ti, weight: 1 };
    }
    return null;
  };
  const parts = text.split(/([\p{L}\p{N}'’]+)/u); // odd indexes are words
  const offsets = [];
  let at = 0;
  for (const p of parts) { offsets.push(at); at += p.length; }
  const found = [];
  for (let i = 1; i < parts.length; i += 2) {
    const m = termOf(parts[i]);
    if (m) found.push({ i, off: offsets[i], ...m });
  }
  // Search words the overview doesn't have, but the keywords do.
  const inPlot = new Set(found.map((f) => f.ti));
  const kwWords = (KEYWORDS.get(fold(hit.ep.title).trim()) || "").split(/,\s*/).filter((k) => k && words(k).some((w) => {
    const m = termOf(w);
    return m && !inPlot.has(m.ti);
  }));
  const label = kwWords.length ? `<mark>${escHTML(kwWords.slice(0, 2).join(", "))}</mark> · ` : "";
  if (!found.length) {
    return label + (text.length > max ? `${escHTML(text.slice(0, max).replace(/\s+\S*$/, ""))}…` : escHTML(text));
  }
  let start = 0;
  let bestValue = -1;
  for (const f of found) {
    const s = Math.max(0, f.off - 40);
    const best = new Map();
    for (const g of found) if (g.off >= s && g.off < s + max) best.set(g.ti, Math.max(best.get(g.ti) || 0, g.weight));
    const value = [...best.values()].reduce((a, b) => a + b, 0);
    if (value > bestValue) { bestValue = value; start = s; }
  }
  const end = Math.min(text.length, start + max);
  const marked = new Set(found.map((f) => f.i));
  let html = "";
  for (let i = 0; i < parts.length; i++) {
    const s = offsets[i];
    const e = s + parts[i].length;
    if (e <= start || s >= end || (i % 2 && s < start)) continue; // skip a cut-off first word
    const piece = escHTML(parts[i].slice(Math.max(0, start - s), end - s));
    html += marked.has(i) && s >= start ? `<mark>${piece}</mark>` : piece;
  }
  if (start > 0) html = `…${html.trimStart()}`;
  return `${label}${html.trim()}${end < text.length ? "…" : ""}`;
}
