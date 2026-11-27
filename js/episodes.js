// Episode data helpers and the shared episode card.
import { supabase } from './supabase.js?v=20261127121311';
import { TMDB_IMAGE_BASE } from './config.js?v=20261127121311';
import { esc, epCode, stars } from './ui.js?v=20261127121311';

const FALLBACK = ['#b8432f', '#3b6ea8', '#6b4fa0', '#d0682a', '#2f8a5a', '#a8892f'];
const EP_FIELDS = 'id, kind, season, number, title, overview, air_date, still_path, runtime';

let allCache = null;

// Every episode, special and movie, sorted by air order. Cached per page load.
export async function loadAllEpisodes() {
  if (allCache) return allCache;
  const { data, error } = await supabase.from('episodes').select(EP_FIELDS).limit(2000);
  if (error) throw error;
  allCache = data.sort(compareEpisodes);
  return allCache;
}

export async function loadEpisode(id) {
  const { data } = await supabase.from('episodes').select(EP_FIELDS).eq('id', id).maybeSingle();
  return data;
}

// Regular seasons first (in order), then specials, then movies by date.
export function compareEpisodes(a, b) {
  const rank = (e) => (e.kind === 'episode' ? 0 : e.kind === 'special' ? 1 : 2);
  return rank(a) - rank(b)
    || (a.season ?? 0) - (b.season ?? 0)
    || (a.kind === 'movie' ? (a.air_date || '').localeCompare(b.air_date || '') : (a.number ?? 0) - (b.number ?? 0));
}

export function stillUrl(ep, size = 'w300') {
  return ep?.still_path ? `${TMDB_IMAGE_BASE}${size}${ep.still_path}` : '';
}

export function fallbackColour(ep) {
  return FALLBACK[(ep?.id ?? 0) % FALLBACK.length];
}

export function isAired(ep) {
  return ep.air_date && ep.air_date <= todayISO();
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function seasonLabel(ep) {
  if (ep.kind === 'movie') return 'Movies';
  if (ep.kind === 'special' || ep.season === 0) return 'Specials';
  return `Season ${ep.season}`;
}

export function seasonHref(ep) {
  if (ep.kind === 'movie') return 'seasons.html?s=movies';
  if (ep.kind === 'special' || ep.season === 0) return 'seasons.html?s=specials';
  return `seasons.html?s=${ep.season}`;
}

// Search codes: "S15", "s 15", "season 15" → { season: 15, number: null }; "S15E3", "s15 e03",
// "season 15 episode 3" → { season: 15, number: 3 }. Anything else → null.
export function seasonCode(text) {
  const m = String(text || '').trim().toLowerCase().match(/^s(?:eason)?\s*(\d{1,2})(?:\s*e(?:p(?:isode)?)?\s*(\d{1,3}))?$/);
  return m ? { season: Number(m[1]), number: m[2] ? Number(m[2]) : null } : null;
}

// Does an episode match a seasonCode() result?
export const matchesCode = (e, c) => e.kind === 'episode' && e.season === c.season && (c.number == null || e.number === c.number);

// The thumbnail block (paper card with still, code chip and title).
export function thumbHTML(ep, { size = 'w300', showTitle = true, extra = '', code = epCode(ep) } = {}) {
  const src = stillUrl(ep, size);
  return `
    <div class="ep-thumb paper${src ? ' has-img' : ''}" style="background-color:${fallbackColour(ep)}">
      ${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : ''}
      ${code ? `<span class="ep-card-code">${esc(code)}</span>` : '<span></span>'}
      ${showTitle ? `<span class="ep-card-title">${esc(ep.title)}</span>` : '<span></span>'}
      ${extra}
    </div>`;
}

const EYE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

/**
 * A linked episode card.
 *   mine: { count, rating, liked } from myLogMap
 *   meta: text for the right side under the card (e.g. "3 logs")
 *   rating: a rating to show under the card instead of mine (e.g. community avg)
 */
export function cardHTML(ep, { mine, meta = '', rating, extra = '', href = null, current = false } = {}) {
  const shown = rating ?? mine?.rating ?? null;
  const badge = mine?.count ? `<span class="watched-badge" title="You've watched this">${EYE}<span class="visually-hidden">Watched</span></span>` : '';
  return `
    <a class="ep-card${current ? ' current' : ''}" href="${esc(href || `episode.html?id=${ep.id}`)}"${current ? ' aria-current="page"' : ''}>
      ${thumbHTML(ep, { extra: badge + extra })}
      <div class="ep-card-meta">
        <span><span class="rating">${stars(shown)}</span>${mine?.liked ? ' <span class="heart" aria-label="Liked">♥</span>' : ''}</span>
        <span>${esc(meta)}</span>
      </div>
    </a>`;
}

/**
 * The signed-in user's logs, summarised per episode:
 * Map(episode_id → { count, rating (latest), liked (latest), lastDate })
 */
export async function myLogMap(userId) {
  const { data } = await supabase.from('logs')
    .select('episode_id, rating, liked, watched_on, created_at')
    .eq('user_id', userId)
    .order('watched_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(5000);
  const map = new Map();
  for (const l of data || []) {
    const m = map.get(l.episode_id);
    if (!m) map.set(l.episode_id, { count: 1, rating: l.rating, liked: l.liked, lastDate: l.watched_on });
    else {
      m.count++;
      if (m.rating == null && l.rating != null) m.rating = l.rating;
    }
  }
  return map;
}
