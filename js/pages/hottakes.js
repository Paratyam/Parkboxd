// hottakes.html: the ratings furthest from each episode's average, plus who makes the most of them.
import { initPage } from '../layout.js?v=20261127201216';
import { supabase } from '../supabase.js?v=20261127201216';
import { $, esc, epCode, stars, avatarHTML } from '../ui.js?v=20261127201216';
import { loadAllEpisodes, thumbHTML } from '../episodes.js?v=20261127201216';
import { allLatestRatings, episodeAverages, isHotTake, HOT_GAP, HOT_MIN_RATINGS } from '../insights.js?v=20261127201216';

await initPage({ title: 'Hot takes', auth: 'required' });
const root = $('#hot');

const [everyone, avgs, all, { data: people }] = await Promise.all([
  allLatestRatings(), episodeAverages(), loadAllEpisodes(),
  supabase.from('profiles').select('id, username, display_name, avatar_color, avatar_icon'),
]);
const byId = new Map(all.map((e) => [e.id, e]));
const who = new Map((people || []).map((p) => [p.id, p]));

const takes = [];
for (const [userId, ratings] of everyone) {
  for (const [epId, r] of ratings) {
    const a = avgs.get(epId);
    if (isHotTake(r, a) && byId.has(epId) && who.has(userId)) takes.push({ user: who.get(userId), ep: byId.get(epId), r, avg: a.avg, gap: Math.abs(r - a.avg) });
  }
}
takes.sort((x, y) => y.gap - x.gap);

const perUser = new Map();
for (const t of takes) perUser.set(t.user.id, (perUser.get(t.user.id) || 0) + 1);
const spiciest = [...perUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

root.innerHTML = `
  <div>
    <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">Rankings</h1>
    <nav class="profile-tabs" aria-label="Ranking type">
      <a href="rankings.html?type=top">Highest rated</a>
      <a href="rankings.html?type=divisive">Most divisive</a>
      <a href="hottakes.html" aria-current="page">🌶️ Hot takes</a>
    </nav>
  </div>
  <p class="result-count" style="margin:0">Ratings at least ${HOT_GAP}★ away from the episode's average (episodes with ${HOT_MIN_RATINGS}+ ratings). Bold. Brave. Probably wrong.</p>
  ${spiciest.length ? `<section>
    <div class="section-head"><h2>Spiciest people</h2></div>
    <ul class="people">${spiciest.map(([id, n], i) => {
      const p = who.get(id);
      return `<li><span class="result-count" style="width:20px">${i + 1}</span>${avatarHTML(p, 36)}
        <div class="who"><a href="profile.html?u=${encodeURIComponent(p.username)}">${esc(p.display_name || p.username)}</a><span>${n} hot take${n === 1 ? '' : 's'}</span></div>
        <span aria-hidden="true">${'🌶️'.repeat(Math.min(5, n))}</span></li>`;
    }).join('')}</ul>
  </section>` : ''}
  <section>
    <div class="section-head"><h2>Hottest takes</h2><span class="result-count">${takes.length}</span></div>
    ${takes.length ? `<ol class="rank-table">${takes.slice(0, 100).map((t) => `
      <li>
        <a href="episode.html?id=${t.ep.id}" class="thumb" aria-hidden="true" tabindex="-1">${thumbHTML(t.ep, { showTitle: false })}</a>
        <div class="info">
          <a href="episode.html?id=${t.ep.id}">${esc(t.ep.title)}</a>
          <span>${esc(epCode(t.ep))} · <a href="profile.html?u=${encodeURIComponent(t.user.username)}" style="color:var(--text-soft);font-weight:600">${esc(t.user.display_name || t.user.username)}</a>
            gave it <span style="color:var(--green)">${stars(t.r)}</span></span>
        </div>
        <div class="score"><b style="color:#ff8a8a">${t.r > t.avg ? '+' : '−'}${t.gap.toFixed(1)}</b><span>avg ${t.avg.toFixed(1)}</span></div>
      </li>`).join('')}</ol>`
      : '<p class="empty">No hot takes yet. Everybody agrees. This is the most boring town in Colorado.</p>'}
  </section>`;
root.removeAttribute('aria-busy');
