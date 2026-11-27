// Kenny's own (pretend) Parkboxd account, shown at profile.html?u=kenny. Like the other character
// accounts, he isn't a real member: nothing is in the database, so his ratings never touch site
// averages. His reviews are all muffled, and also show on those episode pages
// (js/guest-reviews.js). Episodes are matched by title.
import { esc, epCode, stars, avatarHTML, formatDate, toast } from './ui.js?v=20261127211246';
import { loadAllEpisodes, thumbHTML } from './episodes.js?v=20261127211246';
import { countRatings, histogramHTML } from './histogram.js?v=20261127211246';

export const KENNY = { username: 'kenny', display_name: 'Kenny McCormick', avatar_color: '#f2711c', avatar_icon: 'mittens' };

// [title, stars, liked]: exactly seven. The ones he reviewed get high marks, the rest 2.5.
export const RATED = [
  ['Mysterion Rises', 5, true], ['Coon vs. Coon & Friends', 5, true], ['Best Friends Forever', 5, true], ['The Poor Kid', 4.5, true],
  ['Kenny Dies', 2.5, false], ['Pinewood Derby', 2.5, false], ['Chinpokomon', 2.5, false],
];

export const REVIEWS = [
  ['Mysterion Rises', "MMPH! Mmph mmf mmmph!! Mmf mm-hmm, mmph mmph MMMPH! Mmf!!"],
  ['Coon vs. Coon & Friends', "Mmph mmf! Mmf mmf MMF! Mmmph mm mmph mmf... MMPH!! Woohoo-mmf!"],
  ['Best Friends Forever', "Mmf!! Mm mmph mmf mmmph, mmf mmf mmph! MMMMPH!"],
  ['The Poor Kid', "Mmph mmph! Hmm-mmf mmf mm MMPH mmf! Mmf mmf!!"],
];

const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export async function renderKennyProfile(root) {
  const all = await loadAllEpisodes();
  const byTitle = new Map(all.map((e) => [norm(e.title), e]));
  const find = (t) => byTitle.get(norm(t));
  const rated = RATED.map(([t, r, liked]) => ({ ep: find(t), r, liked })).filter((x) => x.ep);
  const reviews = REVIEWS.map(([t, text]) => ({ ...rated.find((x) => x.ep === find(t)), text })).filter((x) => x.ep);
  const top4 = reviews.map((x) => x.ep);
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const diary = rated.map((x, i) => ({ ...x, date: day(i * 3 + 1) }));
  const hours = Math.round((rated.length * 22) / 60);
  const avg = rated.reduce((s, x) => s + x.r, 0) / (rated.length || 1);
  document.title = 'Kenny McCormick · Parkboxd';

  const badge = (emoji, name, desc) => `<div class="badge paper earned" title="${esc(desc)}"><span class="emoji" aria-hidden="true">${emoji}</span><strong>${esc(name)}</strong><span>${esc(desc)}</span><span class="got">Unlocked</span></div>`;

  root.innerHTML = `
    <section class="profile-head paper" aria-label="Profile">
      ${avatarHTML(KENNY, 96)}
      <div class="who">
        <h1 class="cut">Kenny McCormick</h1>
        <span class="handle">@kenny · joined ${esc(formatDate('2026-11-27', { month: 'long', year: 'numeric' }))} · 🧡 Mmph!</span>
        <p class="bio">Mmph mmf mmph! Mmf mm mmph mmf. Mmph!</p>
        <div style="margin-top:6px"><span class="team-flair paper" style="background-color:#f2711c;color:#1a1a1a">Team Kenny</span></div>
      </div>
      <div class="stats">
        <div class="stat"><b>${rated.length}</b><span>Episodes</span></div>
        <div class="stat"><b>${hours}</b><span>Hours</span></div>
        <div class="stat"><b>${reviews.length}</b><span>Reviews</span></div>
        <div class="stat"><b>${avg.toFixed(1)}</b><span>Avg rating</span></div>
        <div class="stat"><b>69</b><span>Followers</span></div>
        <div class="stat"><b>69</b><span>Following</span></div>
      </div>
      <div class="profile-actions" style="width:100%">
        <button type="button" class="btn btn-green" id="follow-kenny">Follow</button>
      </div>
    </section>

    <section>
      <div class="section-head"><h2>Favourite episodes</h2></div>
      <div class="top4">${top4.map((ep) => `<a class="ep-card" href="episode.html?id=${ep.id}">${thumbHTML(ep, { size: 'w500' })}</a>`).join('')}</div>
    </section>

    <section>
      <div class="section-head"><h2>Badges</h2><span class="result-count">mmph!</span></div>
      <div class="badges">
        ${badge('🦸', 'Secret Identity', 'Mmf mmph mm-mmf')}
        ${badge('❤️', 'Extra Lives', 'Keeps coming back')}
        ${badge('🎮', 'High Score', 'Mmph mmf MMF!')}
      </div>
    </section>

    <div class="two-col">
      <section>
        <div class="section-head"><h2>Reviews</h2><span class="result-count">${reviews.length} reviews</span></div>
        <div class="reviews" data-guest-list></div>

        <div class="section-head" style="margin-top:32px"><h2>Recent diary</h2></div>
        <ol class="diary">${diary.map((l) => `
          <li>
            <span class="date">${esc(formatDate(l.date, { month: 'short', day: 'numeric', year: 'numeric' }))}</span>
            <span class="title"><a class="title" href="episode.html?id=${l.ep.id}">${esc(l.ep.title)}</a><span class="code">${esc(epCode(l.ep))}</span></span>
            <span class="rating">${stars(l.r)}</span>
            ${l.liked ? '<span class="heart" aria-label="Liked">♥</span>' : ''}
          </li>`).join('')}</ol>
      </section>
      <aside style="display:flex;flex-direction:column;gap:32px">
        <section>
          <div class="section-head"><h2>South Park personality</h2></div>
          <div class="char-card paper">
            <div style="display:flex;gap:14px;align-items:center"><span style="font-size:40px;line-height:1" aria-hidden="true">🧡</span>
              <div class="cut" style="font-size:26px;color:var(--white);line-height:1.1">Kenny is a Kenny</div></div>
            <p style="margin:10px 0 0;color:var(--text-soft)">They took the quiz and said "mmph". The quiz agreed.</p>
          </div>
        </section>
        <section>
          <div class="section-head"><h2>Ratings</h2><span class="result-count">${rated.length}</span></div>
          ${histogramHTML(countRatings(rated.map((x) => x.r)))}
          <p style="margin:10px 0 0;font-size:12px;color:var(--muted)">"Mmph mmf mmph." — Kenny</p>
        </section>
      </aside>
    </div>`;

  // Loaded here, not at the top: guest-reviews.js imports this file.
  const { showProfileReviews } = await import('./guest-reviews.js?v=20261127211246');
  await showProfileReviews(root.querySelector('[data-guest-list]'), 'kenny', reviews.map((x) => x.ep));
  root.removeAttribute('aria-busy');

  const follow = root.querySelector('#follow-kenny');
  follow.addEventListener('click', () => {
    follow.textContent = '✓ Following';
    follow.disabled = true;
    toast("Mmph mmf! (Kenny says thanks.)");
  });
}
