import { initPage } from '../layout.js?v=20261127071053';
import { supabase } from '../supabase.js?v=20261127071053';
import { TMDB_SHOW_ID } from '../config.js?v=20261127071053';
import { $, esc, setBusy } from '../ui.js?v=20261127071053';

const { profile } = await initPage({ title: 'Import episodes', auth: 'required' });
const root = $('#import-root');
let tmdbKey = '';
let foundMovies = [];

if (!profile.is_admin) {
  root.innerHTML = `
    <div class="big-message">
      <h1 class="cut">Respect my authoritah!</h1>
      <p>This page is for admins only.</p>
      <a class="btn btn-green" href="index.html">Go home</a>
    </div>`;
} else {
  root.replaceChildren($('#import-ui').content.cloneNode(true));
  showCount();
  $('#import-form').addEventListener('submit', runImport);
  $('#movies-form').addEventListener('submit', saveMovies);
}

async function showCount() {
  const counts = await Promise.all(['episode', 'special', 'movie'].map((kind) =>
    supabase.from('episodes').select('id', { count: 'exact', head: true }).eq('kind', kind)));
  const [eps, specials, movies] = counts.map((r) => r.count ?? 0);
  $('#db-count').textContent = `The database has ${eps} episodes, ${specials} specials and ${movies} movies right now.`;
}

function log(text, kind = '') {
  const li = document.createElement('li');
  li.className = kind;
  li.textContent = text;
  $('#import-log').append(li);
  li.scrollIntoView({ block: 'nearest' });
}

// v4 read access tokens are JWTs ("eyJ…") and go in a header; v3 keys go in the query string.
async function tmdb(path, query = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const headers = { accept: 'application/json' };
  if (tmdbKey.startsWith('eyJ')) headers.Authorization = `Bearer ${tmdbKey}`;
  else url.searchParams.set('api_key', tmdbKey);

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers });
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 1500)); continue; }
    if (res.status === 401) throw new Error('TMDB rejected the key (401). Double-check it.');
    if (!res.ok) throw new Error(`TMDB ${path} failed: ${res.status}`);
    return res.json();
  }
  throw new Error('TMDB kept rate-limiting us. Wait a minute and try again.');
}

async function upsert(rows) {
  const { error } = await supabase.from('episodes').upsert(rows, { onConflict: 'tmdb_id,kind' });
  if (error) throw new Error(error.message);
}

async function runImport(e) {
  e.preventDefault();
  tmdbKey = $('#tmdb-key').value.trim();
  if (!tmdbKey) return;
  const btn = e.submitter || $('#import-form button');
  setBusy(btn, true, 'Importing…');
  $('#import-output').hidden = false;
  $('#import-log').replaceChildren();
  const bar = $('#import-bar');
  bar.style.width = '0';

  let saved = 0;
  let failed = 0;
  try {
    const show = await tmdb(`/tv/${TMDB_SHOW_ID}`);
    const seasons = show.seasons
      .filter((s) => $('#specials').checked || s.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number);
    log(`Found "${show.name}": ${seasons.length} seasons.`);

    for (const [i, s] of seasons.entries()) {
      const label = s.season_number === 0 ? 'Specials' : `Season ${s.season_number}`;
      try {
        const data = await tmdb(`/tv/${TMDB_SHOW_ID}/season/${s.season_number}`);
        const rows = (data.episodes || []).map((ep) => ({
          kind: ep.season_number === 0 ? 'special' : 'episode',
          tmdb_id: ep.id,
          season: ep.season_number,
          number: ep.episode_number,
          title: ep.name || `Episode ${ep.episode_number}`,
          overview: ep.overview || null,
          air_date: ep.air_date || null,
          still_path: ep.still_path || null,
          runtime: ep.runtime ?? null,
        }));
        if (rows.length) await upsert(rows);
        saved += rows.length;
        log(`✓ ${label}: ${rows.length}`, 'ok');
      } catch (err) {
        failed++;
        log(`✗ ${label}: ${err.message}`, 'err');
      }
      bar.style.width = `${Math.round(((i + 1) / seasons.length) * 100)}%`;
    }
    log(failed ? `Episodes done with ${failed} failed season(s). Run it again to retry.` : 'Episodes done!', failed ? 'err' : 'ok');
    $('#import-summary').textContent = `${saved} episodes saved${failed ? `, ${failed} seasons failed` : ''}`;
    await findMovies();
  } catch (err) {
    log(`✗ ${err.message}`, 'err');
  }

  setBusy(btn, false);
  showCount();
}

async function findMovies() {
  log('Looking for South Park movies…');
  const results = [];
  for (let page = 1; page <= 3; page++) {
    const data = await tmdb('/search/movie', { query: 'South Park', include_adult: 'false', page });
    results.push(...data.results);
    if (page >= data.total_pages) break;
  }
  const { data: existing } = await supabase.from('episodes').select('tmdb_id').eq('kind', 'movie');
  const have = new Set((existing || []).map((r) => r.tmdb_id));

  foundMovies = results
    .filter((m) => /south park/i.test(m.title) && m.release_date)
    .sort((a, b) => a.release_date.localeCompare(b.release_date));

  $('#movie-list').innerHTML = foundMovies.length
    ? foundMovies.map((m, i) => `
        <label class="checkbox">
          <input type="checkbox" value="${i}" checked>
          <span>${esc(m.title)} <span class="meta">· ${esc(m.release_date.slice(0, 4))}${have.has(m.id) ? ' · already added' : ''}</span></span>
        </label>`).join('')
    : '<p class="empty">No movies found.</p>';
  $('#movies-card').hidden = false;
  log(`Found ${foundMovies.length} movies. Pick them in the Movies box.`, 'ok');
  $('#movies-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveMovies(e) {
  e.preventDefault();
  const picked = [...$('#movie-list').querySelectorAll('input:checked')].map((el) => foundMovies[+el.value]);
  if (!picked.length) return;
  const btn = e.submitter || $('#movies-form button');
  setBusy(btn, true, 'Saving…');
  try {
    const rows = [];
    for (const m of picked) {
      const d = await tmdb(`/movie/${m.id}`);
      rows.push({
        kind: 'movie',
        tmdb_id: d.id,
        season: null,
        number: null,
        title: d.title,
        overview: d.overview || null,
        air_date: d.release_date || null,
        still_path: d.backdrop_path || null,
        runtime: d.runtime || null,
      });
    }
    await upsert(rows);
    log(`✓ Movies: ${rows.length} saved`, 'ok');
  } catch (err) {
    log(`✗ Movies: ${err.message}`, 'err');
  }
  setBusy(btn, false);
  showCount();
}
