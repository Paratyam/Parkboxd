import { initPage } from '../layout.js?v=20261128095327';
import { supabase } from '../supabase.js?v=20261128095327';
import { SITE_NAME } from '../config.js?v=20261128095327';
import { $, esc, params, profileTabsHTML } from '../ui.js?v=20261128095327';
import { cardHTML, compareEpisodes } from '../episodes.js?v=20261128095327';
import { line } from '../jokes.js?v=20261128095327';
import { recommendationsFor } from '../recommend.js?v=20261128095327';

const { profile: me } = await initPage({ title: 'Watchlist', auth: 'required' });
const root = $('#watchlist');

const wanted = (params.get('u') || me.username).toLowerCase();
const { data: person } = await supabase.from('profiles').select('id, username, display_name').eq('username', wanted).maybeSingle();

if (!person) {
  root.innerHTML = `<div class="big-message"><h1 class="cut">Nobody by that name</h1><a class="btn btn-green" href="watchlist.html">Your watchlist</a></div>`;
  root.removeAttribute('aria-busy');
} else {
  await render();
  window.addEventListener('parkboxd:logged', render);
}

async function render() {
  const isMe = person.id === me.id;
  const name = person.display_name || person.username;
  document.title = `${isMe ? 'Your watchlist' : `${name}'s watchlist`} · ${SITE_NAME}`;

  const { data: rows } = await supabase.from('watchlist')
    .select('added_at, episodes(id, kind, season, number, title, air_date, still_path)')
    .eq('user_id', person.id);
  const eps = (rows || []).map((r) => r.episodes).filter(Boolean).sort(compareEpisodes);
  // On your own list: who told you that you have to watch it.
  const from = new Map();
  if (isMe) {
    for (const r of await recommendationsFor(me.id)) {
      const who = r.from?.display_name || r.from?.username || 'a friend';
      from.set(r.episode_id, [...(from.get(r.episode_id) || []), who]);
    }
  }

  root.innerHTML = `
    <div>
      <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">${isMe ? 'Your watchlist' : `${esc(name)}'s watchlist`}</h1>
      ${profileTabsHTML(person.username, 'watchlist')}
    </div>
    <section>
      <div class="section-head"><h2>${eps.length} to watch</h2></div>
      ${eps.length
        ? `<div class="ep-grid">${eps.map((e) => `<div style="position:relative">${cardHTML(e, { meta: e.air_date ? e.air_date.slice(0, 4) : '' })}
            ${from.has(e.id) ? `<p class="rec-from">📨 From ${esc(from.get(e.id).join(', '))}</p>` : ''}
            ${isMe ? `<button type="button" class="remove-x" data-remove="${e.id}" aria-label="Remove ${esc(e.title)} from watchlist">×</button>` : ''}</div>`).join('')}</div>`
        : `<p class="empty">${esc(line(isMe ? 'watchlistEmptyMine' : 'watchlistEmptyOther'))}</p>`}
    </section>`;
  root.removeAttribute('aria-busy');

  root.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', async () => {
    await supabase.from('watchlist').delete().eq('episode_id', Number(b.dataset.remove)).eq('user_id', me.id);
    render();
  }));
}
