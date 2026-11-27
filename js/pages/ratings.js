// ratings.html?u=name: everything a user rated. &r=4 narrows to one star value.
import { initPage } from '../layout.js?v=20261127201827';
import { supabase } from '../supabase.js?v=20261127201827';
import { SITE_NAME } from '../config.js?v=20261127201827';
import { $, esc, params, stars, profileTabsHTML } from '../ui.js?v=20261127201827';
import { loadAllEpisodes, cardHTML, compareEpisodes } from '../episodes.js?v=20261127201827';
import { BUCKETS, countRatings, histogramHTML } from '../histogram.js?v=20261127201827';
import { line } from '../jokes.js?v=20261127201827';

const { profile: me } = await initPage({ title: 'Ratings', auth: 'required' });
const root = $('#ratings');

const wanted = (params.get('u') || me.username).toLowerCase();
const r = Number(params.get('r'));
const active = BUCKETS.includes(r) ? r : null;
const { data: person } = await supabase.from('profiles').select('id, username, display_name').eq('username', wanted).maybeSingle();

if (!person) {
  root.innerHTML = `<div class="big-message"><h1 class="cut">Nobody by that name</h1><a class="btn btn-green" href="ratings.html">Your ratings</a></div>`;
  root.removeAttribute('aria-busy');
} else {
  await render();
  window.addEventListener('parkboxd:logged', render);
}

async function render() {
  const isMe = person.id === me.id;
  const name = person.display_name || person.username;
  const u = encodeURIComponent(person.username);
  document.title = `${isMe ? 'Your ratings' : `${name}'s ratings`}${active ? ` · ${stars(active)}` : ''} · ${SITE_NAME}`;

  const [all, { data: rows }] = await Promise.all([
    loadAllEpisodes(),
    supabase.from('latest_ratings').select('episode_id, rating').eq('user_id', person.id).limit(5000),
  ]);
  const byId = new Map(all.map((e) => [e.id, e]));
  const rated = (rows || []).map((x) => ({ ep: byId.get(x.episode_id), rating: Number(x.rating) })).filter((x) => x.ep);
  const counts = countRatings(rated.map((x) => x.rating));

  const shown = (active ? rated.filter((x) => x.rating === active) : rated)
    .sort((a, b) => (active ? 0 : b.rating - a.rating) || compareEpisodes(a.ep, b.ep));

  const heading = active
    ? `<span style="color:var(--green);letter-spacing:1px">${stars(active)}</span> · ${shown.length} ${shown.length === 1 ? 'episode' : 'episodes'}`
    : `All ratings · ${shown.length}`;

  root.innerHTML = `
    <div>
      <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">${isMe ? 'Your ratings' : `${esc(name)}'s ratings`}</h1>
      ${profileTabsHTML(person.username, 'ratings')}
    </div>
    <section style="max-width:420px">
      <div class="section-head"><h2>Spread</h2><span class="result-count">Click a bar to filter</span></div>
      ${histogramHTML(counts, { href: (b) => `ratings.html?u=${u}&r=${b}`, active })}
    </section>
    <section>
      <div class="section-head"><h2>${heading}</h2>${active ? `<a href="ratings.html?u=${u}">Show all</a>` : ''}</div>
      ${shown.length
        ? `<div class="ep-grid">${shown.map((x) => cardHTML(x.ep, { rating: x.rating, meta: x.ep.air_date ? x.ep.air_date.slice(0, 4) : '' })).join('')}</div>`
        : `<p class="empty">${active ? `Nothing rated ${esc(stars(active))} yet. ${active <= 1 ? 'Generous of you.' : active >= 5 ? 'Tough crowd.' : ''}` : esc(line(isMe ? 'ratingsEmptyMine' : 'ratingsEmptyOther'))}</p>`}
    </section>`;
  root.removeAttribute('aria-busy');
}
