// compare.html?u=name: your ratings vs theirs.
import { initPage } from '../layout.js?v=20261127175826';
import { supabase } from '../supabase.js?v=20261127175826';
import { SITE_NAME } from '../config.js?v=20261127175826';
import { $, esc, params, epCode, stars, avatarHTML } from '../ui.js?v=20261127175826';
import { loadAllEpisodes, thumbHTML } from '../episodes.js?v=20261127175826';
import { allLatestRatings, tasteMatch, tasteLabel } from '../insights.js?v=20261127175826';

const { profile: me } = await initPage({ title: 'Taste match', auth: 'required' });
const root = $('#compare');
const wanted = (params.get('u') || '').toLowerCase();
const { data: them } = await supabase.from('profiles').select('id, username, display_name, avatar_color, avatar_icon').eq('username', wanted).maybeSingle();

if (!them || them.id === me.id) {
  root.innerHTML = `<div class="big-message"><h1 class="cut">${them ? 'You agree with yourself 100%' : 'Nobody by that name'}</h1>
    <p>${them ? 'Congratulations. Pick a friend to compare with instead.' : ''}</p><a class="btn btn-green" href="friends.html">Friends</a></div>`;
  root.removeAttribute('aria-busy');
} else {
  const [everyone, all] = await Promise.all([allLatestRatings(), loadAllEpisodes()]);
  const byId = new Map(all.map((e) => [e.id, e]));
  const tm = tasteMatch(everyone.get(me.id) || new Map(), everyone.get(them.id) || new Map());
  const name = them.display_name || them.username;
  document.title = `You vs ${name} · ${SITE_NAME}`;

  const row = (p) => {
    const ep = byId.get(p.epId);
    if (!ep) return '';
    return `<li>
      <a href="episode.html?id=${ep.id}" class="thumb" aria-hidden="true" tabindex="-1">${thumbHTML(ep, { showTitle: false })}</a>
      <div class="info"><a href="episode.html?id=${ep.id}">${esc(ep.title)}</a><span>${esc(epCode(ep))}</span></div>
      <div class="score" style="min-width:150px">
        <span>You <b style="font-size:15px">${stars(p.a)}</b></span>
        <span>${esc(name)} <b style="font-size:15px">${stars(p.b)}</b></span>
      </div>
    </li>`;
  };

  const fights = tm ? tm.pairs.filter((p) => p.diff >= 1) : [];
  const agree = tm ? tm.pairs.filter((p) => p.diff <= 0.5).sort((x, y) => (y.a + y.b) - (x.a + x.b)) : [];

  root.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      ${avatarHTML(me, 56)}<span class="cut" style="font-size:28px;color:var(--muted)">vs</span>${avatarHTML(them, 56)}
      <div>
        <h1 class="cut" style="margin:0;color:var(--white);font-size:clamp(28px,4vw,40px)">You vs <a href="profile.html?u=${encodeURIComponent(them.username)}">${esc(name)}</a></h1>
        <div style="color:var(--text-soft)">${tm?.score != null ? `<strong style="color:var(--green);font-size:20px">${tm.score}%</strong> · ${esc(tasteLabel(tm.score))} · ${tm.shared} shared ratings`
          : `Not enough shared ratings yet (${tm?.shared ?? 0} of 3). Rate the same episodes and come back.`}</div>
      </div>
    </div>
    <section>
      <div class="section-head"><h2>Biggest fights</h2><span class="result-count">1★ or more apart</span></div>
      ${fights.length ? `<ol class="rank-table">${fights.map(row).join('')}</ol>` : '<p class="empty">No real disagreements. Suspicious. Are you two the same person?</p>'}
    </section>
    <section>
      <div class="section-head"><h2>You agree on</h2></div>
      ${agree.length ? `<ol class="rank-table">${agree.map(row).join('')}</ol>` : '<p class="empty">You haven\'t agreed on anything yet. Classic.</p>'}
    </section>`;
  root.removeAttribute('aria-busy');
}
