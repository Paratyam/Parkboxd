import { initPage } from '../layout.js';
import { supabase } from '../supabase.js';
import { TMDB_SHOW_ID } from '../config.js';
import { $, setBusy } from '../ui.js';

const { profile } = await initPage({ title: 'Import episodes', auth: 'required' });
const root = $('#import-root');

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
}

async function showCount() {
  const { count } = await supabase.from('episodes').select('id', { count: 'exact', head: true });
  $('#db-count').textContent = `The database has ${count ?? 0} episodes right now.`;
}

function log(text, kind = '') {
  const li = document.createElement('li');
  li.className = kind;
  li.textContent = text;
  $('#import-log').append(li);
  li.scrollIntoView({ block: 'nearest' });
}

// v4 read access tokens are JWTs ("eyJ…") and go in a header; v3 keys go in the query string.
async function tmdb(path, key) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  const headers = { accept: 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  else url.searchParams.set('api_key', key);

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers });
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 1500)); continue; }
    if (res.status === 401) throw new Error('TMDB rejected the key (401). Double-check it.');
    if (!res.ok) throw new Error(`TMDB ${path} failed: ${res.status}`);
    return res.json();
  }
  throw new Error('TMDB kept rate-limiting us. Wait a minute and try again.');
}

async function runImport(e) {
  e.preventDefault();
  const key = $('#tmdb-key').value.trim();
  if (!key) return;
  const btn = e.submitter || $('#import-form button');
  setBusy(btn, true, 'Importing…');
  $('#import-output').hidden = false;
  $('#import-log').replaceChildren();
  const bar = $('#import-bar');
  bar.style.width = '0';

  let saved = 0;
  let failed = 0;
  try {
    const show = await tmdb(`/tv/${TMDB_SHOW_ID}`, key);
    const seasons = show.seasons
      .filter((s) => $('#specials').checked || s.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number);
    log(`Found "${show.name}": ${seasons.length} seasons.`);

    for (const [i, s] of seasons.entries()) {
      const label = s.season_number === 0 ? 'Specials' : `Season ${s.season_number}`;
      try {
        const data = await tmdb(`/tv/${TMDB_SHOW_ID}/season/${s.season_number}`, key);
        const rows = (data.episodes || []).map((ep) => ({
          tmdb_id: ep.id,
          season: ep.season_number,
          number: ep.episode_number,
          title: ep.name || `Episode ${ep.episode_number}`,
          overview: ep.overview || null,
          air_date: ep.air_date || null,
          still_path: ep.still_path || null,
          runtime: ep.runtime ?? null,
        }));
        if (rows.length) {
          const { error } = await supabase.from('episodes').upsert(rows, { onConflict: 'tmdb_id' });
          if (error) throw new Error(error.message);
        }
        saved += rows.length;
        log(`✓ ${label}: ${rows.length} episodes`, 'ok');
      } catch (err) {
        failed++;
        log(`✗ ${label}: ${err.message}`, 'err');
      }
      bar.style.width = `${Math.round(((i + 1) / seasons.length) * 100)}%`;
    }
    log(failed ? `Done with ${failed} failed season(s). Run it again to retry.` : 'Done! Every episode is in.', failed ? 'err' : 'ok');
  } catch (err) {
    log(`✗ ${err.message}`, 'err');
  }

  $('#import-summary').textContent = `${saved} episodes saved${failed ? `, ${failed} seasons failed` : ''}`;
  setBusy(btn, false);
  showCount();
}
