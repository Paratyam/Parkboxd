// Stan's own (pretend) Parkboxd account, shown at profile.html?u=stan. Like the other character
// accounts, he isn't a real member: nothing is in the database, so his ratings never touch site
// averages. His reviews also show on those episode pages (js/guest-reviews.js). Episodes are
// matched by title.
import { esc, epCode, stars, avatarHTML, formatDate, toast } from './ui.js?v=20261127211602';
import { loadAllEpisodes, thumbHTML } from './episodes.js?v=20261127211602';
import { countRatings, histogramHTML } from './histogram.js?v=20261127211602';

export const STAN = { username: 'stan', display_name: 'Stan Marsh', avatar_color: '#4a90e2', avatar_icon: 'mountain' };

// [title, stars, liked]: only what he's reviewed.
export const RATED = [
  ["You're Getting Old", 5, true], ['Big Gay Al\'s Big Gay Boat Ride', 4.5, true], ['Fun with Veal', 4.5, true], ['Guitar Queer-o', 4, true],
  ["Stanley's Cup", 3, false], ['Asspen', 3.5, false], ['Elementary School Musical', 2.5, false],
];

const TOP4 = ["You're Getting Old", "Big Gay Al's Big Gay Boat Ride", 'Fun with Veal', 'Guitar Queer-o'];

export const REVIEWS = [
  ["You're Getting Old", "I turned ten and suddenly everything sounded and looked like crap. This one's kind of hard for me to watch, because stuff changes and you can't really make it change back. Really good though. I just don't want to talk about it."],
  ["Big Gay Al's Big Gay Boat Ride", "My dog Sparky turned out to be gay and I acted like a jerk about it at first. Then I figured out he's still my dog. Also we had a huge football game and I almost missed it. Pretty good episode, and Sparky's a good boy."],
  ['Fun with Veal', "Dude, we found out where veal comes from, so we took the baby cows home and locked ourselves in my room. I stopped eating meat and got really sick, which wasn't great. I'd still save the cows again."],
  ['Guitar Queer-o', "Me and Kyle got really good at a video game and then I let some agent guy split us up. That was dumb. A hundred thousand points isn't worth ditching your best friend. It's still a sick game though."],
  ["Stanley's Cup", "I just wanted to get my bike back and now I'm coaching a pee wee hockey team. Everybody acted like it was my fault how it ended. It was not my fault, you guys. I don't really like thinking about this one."],
  ['Asspen', "We went skiing and some rich teenager kept challenging me to race for no reason. I don't even like skiing that much. My parents were stuck in a timeshare meeting the whole time. It's alright."],
  ['Elementary School Musical', "Everybody at school started singing and dancing and I had to join in or be left out. Even Wendy was into it. I tried really hard to act like I didn't care. I kind of cared."],
];

const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export async function renderStanProfile(root) {
  const all = await loadAllEpisodes();
  const byTitle = new Map(all.map((e) => [norm(e.title), e]));
  const find = (t) => byTitle.get(norm(t));
  const rated = RATED.map(([t, r, liked]) => ({ ep: find(t), r, liked })).filter((x) => x.ep);
  const reviews = REVIEWS.map(([t, text]) => ({ ...rated.find((x) => x.ep === find(t)), text })).filter((x) => x.ep);
  const top4 = TOP4.map(find).filter(Boolean);
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const diary = rated.map((x, i) => ({ ...x, date: day(i * 3 + 1) }));
  const hours = Math.round((rated.length * 22) / 60);
  const avg = rated.reduce((s, x) => s + x.r, 0) / (rated.length || 1);
  document.title = 'Stan Marsh · Parkboxd';

  const badge = (emoji, name, desc) => `<div class="badge paper earned" title="${esc(desc)}"><span class="emoji" aria-hidden="true">${emoji}</span><strong>${esc(name)}</strong><span>${esc(desc)}</span><span class="got">Unlocked</span></div>`;

  root.innerHTML = `
    <section class="profile-head paper" aria-label="Profile">
      ${avatarHTML(STAN, 96)}
      <div class="who">
        <h1 class="cut">Stan Marsh</h1>
        <span class="handle">@stan · joined ${esc(formatDate('2026-11-27', { month: 'long', year: 'numeric' }))} · 🏈 Just a normal kid</span>
        <p class="bio">Hey, I'm Stan. I live in South Park, I like football and my dog Sparky, and my dad is really embarrassing. Kyle made me sign up for this.</p>
        <div style="margin-top:6px"><span class="team-flair paper" style="background-color:#4a90e2;color:#1a1a1a">Team Stan</span></div>
      </div>
      <div class="stats">
        <div class="stat"><b>${rated.length}</b><span>Episodes</span></div>
        <div class="stat"><b>${hours}</b><span>Hours</span></div>
        <div class="stat"><b>${reviews.length}</b><span>Reviews</span></div>
        <div class="stat"><b>${avg.toFixed(1)}</b><span>Avg rating</span></div>
        <div class="stat"><b>12</b><span>Followers</span></div>
        <div class="stat"><b>4</b><span>Following</span></div>
      </div>
      <div class="profile-actions" style="width:100%">
        <button type="button" class="btn btn-green" id="follow-stan">Follow</button>
      </div>
    </section>

    <section>
      <div class="section-head"><h2>Favourite episodes</h2></div>
      <div class="top4">${top4.map((ep) => `<a class="ep-card" href="episode.html?id=${ep.id}">${thumbHTML(ep, { size: 'w500' })}</a>`).join('')}</div>
    </section>

    <section>
      <div class="section-head"><h2>Badges</h2><span class="result-count">not a big deal</span></div>
      <div class="badges">
        ${badge('🏈', 'Quarterback', 'Plays for the South Park Cows')}
        ${badge('🐕', 'Dog Person', 'Sparky is a good boy')}
        ${badge('🤝', 'Super Best Friend', 'Hangs out with Kyle basically every day')}
        ${badge('🤢', 'Nervous Stomach', 'Threw up when Wendy said hi')}
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
            <div style="display:flex;gap:14px;align-items:center"><span style="font-size:40px;line-height:1" aria-hidden="true">🧢</span>
              <div class="cut" style="font-size:26px;color:var(--white);line-height:1.1">Stan is a Stan</div></div>
            <p style="margin:10px 0 0;color:var(--text-soft)">He took the quiz, said "okay, cool" and went to hang out with Kyle.</p>
          </div>
        </section>
        <section>
          <div class="section-head"><h2>Ratings</h2><span class="result-count">${rated.length}</span></div>
          ${histogramHTML(countRatings(rated.map((x) => x.r)))}
          <p style="margin:10px 0 0;font-size:12px;color:var(--muted)">"I mean, it's a cartoon rating thing. I just put what I thought." — Stan</p>
        </section>
      </aside>
    </div>`;

  // Loaded here, not at the top: guest-reviews.js imports this file.
  const { showProfileReviews } = await import('./guest-reviews.js?v=20261127211602');
  await showProfileReviews(root.querySelector('[data-guest-list]'), 'stan', reviews.map((x) => x.ep));
  root.removeAttribute('aria-busy');

  const follow = root.querySelector('#follow-stan');
  follow.addEventListener('click', () => {
    follow.textContent = '✓ Following';
    follow.disabled = true;
    toast("Oh. Cool, thanks, dude.");
  });
}
