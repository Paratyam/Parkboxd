// Butters' own (pretend) Parkboxd account, shown at profile.html?u=butters. It isn't a real
// member: nothing here is in the database, so his ratings never touch site averages, Stan's
// Picks or taste matches. Episodes are matched by title; any title TMDB names differently is skipped.
import { esc, epCode, stars, avatarHTML, formatDate, toast } from './ui.js?v=20261127064518';
import { loadAllEpisodes, thumbHTML } from './episodes.js?v=20261127064518';
import { countRatings, histogramHTML } from './histogram.js?v=20261127064518';

export const BUTTERS_USERNAME = 'butters';
export const BUTTERS = { username: 'butters', display_name: 'Butters Stotch', avatar_color: '#f5c518', avatar_icon: 'books' };

// [title, stars, liked]. He likes nearly everything. The scary ones lose half a star.
const RATED = [
  ["Butters' Very Own Episode", 5, true], ['Professor Chaos', 5, true], ['Casa Bonita', 4.5, true], ['Marjorine', 5, true],
  ['Scott Tenorman Must Die', 5, true], ['Make Love, Not Warcraft', 5, true], ['Good Times with Weapons', 5, true],
  ['AWESOM-O', 4.5, true], ['Raisins', 4.5, false], ['The Coon', 5, true], ['Coon 2: Hindsight', 5, true], ['Mysterion Rises', 4.5, true],
  ['Imaginationland', 4, false], ['Imaginationland Episode II', 4.5, false], ['Imaginationland Episode III', 4.5, true],
  ['Woodland Critter Christmas', 3.5, false], ['Pandemic', 4, false], ['The Death Camp of Tolerance', 4.5, false],
  ['Chef Goes Nanners', 4.5, false], ['Trapper Keeper', 4.5, false], ['Pinkeye', 4, false], ['Christian Rock Hard', 5, true],
  ['Super Best Friends', 4.5, false], ["Lil' Crime Stoppers", 5, true], ["Butters' Bottom Bitch", 5, true],
  ['The Ungroundable', 5, true], ['Pre-School', 4, false], ['Tweek vs. Craig', 4.5, true], ['Cripple Fight', 4, false],
  ['Grounded Vindaloop', 5, true], ['Fishsticks', 5, true], ['Medicinal Fried Chicken', 4, false], ["You're Getting Old", 3.5, false],
  ['Stanley\'s Cup', 3.5, false], ['Major Boobage', 4, false], ['Mr. Hankey, the Christmas Poo', 5, true], ['Red Hot Catholic Love', 4, false],
  ['The Return of Chef', 4, false], ['Kenny Dies', 3.5, false], ['Night of the Living Homeless', 4, false], ['The Simpsons Already Did It', 4.5, true],
];

const TOP4 = ["Butters' Very Own Episode", 'Professor Chaos', 'Marjorine', "Butters' Bottom Bitch"];

// Five reviews of popular episodes, with Butters knowing exactly what he is.
const REVIEWS = [
  ["Butters' Very Own Episode", 'Golly, a whole episode about me! My dad says I can\'t review it because it\'s a "conflict of interest", so I\'m only giving it five stars instead of six. Also, nobody has ever explained to me how I can watch a show that I\'m in. I asked once and got grounded.'],
  ['Professor Chaos', "I don't know who this Professor Chaos fella is, but he seems real cool and very misunderstood. Five stars. Not because I'm him. I'm definitely not him. Please don't tell my parents."],
  ['Scott Tenorman Must Die', "Eric is real scary in this one. I'm giving it five stars because if I don't, he'll find out. He reads all my reviews. Hi Eric! I love your episodes! Please don't put anything in my chili."],
  ['Make Love, Not Warcraft', "I'm in this one! I was a paladin. I had to log off for dinner right before the big fight and nobody waited for me. Still five stars. Being in a show and on a review site at the same time is a lot of responsibility, fellas."],
  ['Casa Bonita', "I spent most of this episode in a bomb shelter, so I didn't get to see the good parts until later. It turns out the world didn't end at all! Four and a half stars. Half a star off for the shelter. It was real cold in there."],
];

const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export async function renderButtersProfile(root) {
  const all = await loadAllEpisodes();
  const byTitle = new Map(all.map((e) => [norm(e.title), e]));
  const find = (t) => byTitle.get(norm(t));
  const rated = RATED.map(([t, r, liked]) => ({ ep: find(t), r, liked })).filter((x) => x.ep);
  const reviews = REVIEWS.map(([t, text]) => ({ ep: find(t), text, r: rated.find((x) => x.ep && norm(x.ep.title) === norm(t))?.r ?? 5 })).filter((x) => x.ep);
  const top4 = TOP4.map(find).filter(Boolean);
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const diary = rated.slice(0, 8).map((x, i) => ({ ...x, date: day(i * 2 + 1) }));
  const hours = Math.round((rated.length * 22) / 60);
  const avg = rated.reduce((s, x) => s + x.r, 0) / (rated.length || 1);
  document.title = 'Butters Stotch · Parkboxd';

  const badge = (emoji, name, desc) => `<div class="badge paper earned" title="${esc(desc)}"><span class="emoji" aria-hidden="true">${emoji}</span><strong>${esc(name)}</strong><span>${esc(desc)}</span><span class="got">Unlocked</span></div>`;

  root.innerHTML = `
    <section class="profile-head paper" aria-label="Profile">
      ${avatarHTML(BUTTERS, 96)}
      <div class="who">
        <h1 class="cut">Butters Stotch</h1>
        <span class="handle">@butters · joined ${esc(formatDate('2026-11-23', { month: 'long', year: 'numeric' }))} · 📚 Book Club host</span>
        <p class="bio">Hi! I'm Butters, and I run the Book Club here. I like episodes, my friends, and following the rules. Please don't tell my parents I have an account.</p>
        <div style="margin-top:6px"><span class="team-flair paper" style="background-color:#f5c518;color:#1a1a1a">Team Butters</span></div>
      </div>
      <div class="stats">
        <div class="stat"><b>${rated.length}</b><span>Episodes</span></div>
        <div class="stat"><b>${hours}</b><span>Hours</span></div>
        <div class="stat"><b>${reviews.length}</b><span>Reviews</span></div>
        <div class="stat"><b>${avg.toFixed(1)}</b><span>Avg rating</span></div>
        <div class="stat"><b>0</b><span>Followers</span></div>
        <div class="stat"><b>All of you</b><span>Following</span></div>
      </div>
      <div class="profile-actions" style="width:100%">
        <button type="button" class="btn btn-green" id="follow-butters">Follow</button>
        <a class="btn btn-ghost" href="club.html">📚 Go to his Book Club</a>
      </div>
    </section>

    <section>
      <div class="section-head"><h2>Favourite episodes</h2></div>
      <div class="top4">${top4.map((ep) => `<a class="ep-card" href="episode.html?id=${ep.id}">${thumbHTML(ep, { size: 'w500' })}</a>`).join('')}</div>
    </section>

    <section>
      <div class="section-head"><h2>Badges</h2><span class="result-count">every single one, he checked</span></div>
      <div class="badges">
        ${badge('📚', 'Book Club Host', 'Runs the Book Club every week')}
        ${badge('📚', 'Bookworm', 'Reviewed every Book Club pick. Obviously.')}
        ${badge('🍔', 'Team Player', 'Gave 5★ to an episode he was barely in')}
        ${badge('😈', 'Definitely Not Professor Chaos', 'Totally unrelated to anything')}
        ${badge('🥇', 'Gold Star Student', 'Rated everything 3.5★ or higher')}
      </div>
    </section>

    <div class="two-col">
      <section>
        <div class="section-head"><h2>Recent reviews</h2><span class="result-count">${reviews.length} reviews</span></div>
        <div class="reviews">${reviews.map((x) => `
          <article class="review">
            <a href="episode.html?id=${x.ep.id}" style="flex:0 0 110px" aria-hidden="true" tabindex="-1">${thumbHTML(x.ep, { showTitle: false })}</a>
            <div class="review-body">
              <div style="font-size:14px"><a class="ep-link" href="episode.html?id=${x.ep.id}">${esc(x.ep.title)}</a> <span style="color:var(--muted)">${esc(epCode(x.ep))}</span></div>
              <div class="review-meta">${avatarHTML(BUTTERS, 22)}<span><strong>Butters Stotch</strong></span><span class="rating">${stars(x.r)}</span><span class="heart" aria-label="Liked">♥</span></div>
              <p>${esc(x.text)}</p>
            </div>
          </article>`).join('')}</div>

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
            <div style="display:flex;gap:14px;align-items:center"><span style="font-size:40px;line-height:1" aria-hidden="true">🍔</span>
              <div class="cut" style="font-size:26px;color:var(--white);line-height:1.1">Butters is a Butters</div></div>
            <p style="margin:10px 0 0;color:var(--text-soft)">Shocking, we know. The quiz was very fair about it.</p>
          </div>
        </section>
        <section>
          <div class="section-head"><h2>Ratings</h2><span class="result-count">${rated.length}</span></div>
          ${histogramHTML(countRatings(rated.map((x) => x.r)))}
          <p style="margin:10px 0 0;font-size:12px;color:var(--muted)">Nothing below 3.5★. "Every episode is somebody's favourite!" — Butters</p>
        </section>
      </aside>
    </div>`;
  root.removeAttribute('aria-busy');

  const follow = root.querySelector('#follow-butters');
  follow.addEventListener('click', () => {
    follow.textContent = '✓ Following';
    follow.disabled = true;
    toast("Oh boy, a follower! Gee, thanks! (He's a little too busy hosting to show up in your feed, but he appreciates it.)");
  });
}
