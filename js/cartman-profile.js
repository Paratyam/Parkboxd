// Cartman's own (pretend) Parkboxd account, shown at profile.html?u=cartman. Like Butters and
// Kyle, he isn't a real member: nothing is in the database, so his ratings never touch site
// averages. He loves the episodes where he wins and hates nearly everything else, and he leaves a
// comment under every one of Kyle's reviews. Episodes are matched by title.
import { pcTalkButtonHTML } from './pc.js?v=20261127211334';
import { esc, epCode, stars, avatarHTML, formatDate, toast } from './ui.js?v=20261127211334';
import { loadAllEpisodes, thumbHTML } from './episodes.js?v=20261127211334';
import { countRatings, histogramHTML } from './histogram.js?v=20261127211334';

export const CARTMAN = { username: 'cartman', display_name: 'Eric Cartman', avatar_color: '#e5534b', avatar_icon: 'beanie' };

// His greatest victories. These are also his Top 4.
const TOP4 = ['Scott Tenorman Must Die', 'Make Love, Not Warcraft', 'Casa Bonita', 'Die Hippie, Die'];
const LOSSES = ['Breast Cancer Show Ever', 'AWESOM-O', 'Cartmanland', 'Cartoon Wars (2)', 'Le Petit Tourette', 'Dances With Smurfs'];

// [title, stars, liked]: five stars for the wins, half a star for the losses.
export const RATED = [...TOP4.map((t) => [t, 5, true]), ...LOSSES.map((t) => [t, 0.5, false])];

export const REVIEWS = [
  ['Scott Tenorman Must Die', "Best epsiode ever made, and if you disagree you can suck my balls. Some son of a bitch thought he could rip off ME. Nyah nyah nyah nyah nyah nyah. Five stars, and Id do it all again, assholes."],
  ['Make Love, Not Warcraft', "I carried every single one of you useless bastards. I trained you, I yelled at you, I saved teh hole damn game, and did anybody say \"thank u, Eric\"? No. Becuz your jelous little noobs. Five stars for me."],
  ['Casa Bonita', "Cliff divers. Black Bart's Cave. Sopapillas. All I had to do was make one dumbass disappear for a while, and Id call that a bargain. TOTALY worth it. Sweeeet."],
  ['Die Hippie, Die', "serisouly, you guys, I TOLD you. Hippies everywhere, stinking up teh hole damn town, and you all laughed at me. Then who comes begging for help? Thats right. Kiss my ass, then say thank u. Five stars."],
  ['Breast Cancer Show Ever', "This is total bullcrapp and whoever made it can bite me. I was NOT scared, I was being strategic, and I had a tummy ache. My mem wrote a note. Half a star, and thats me being genorous."],
  ['AWESOM-O', "LAME. Complete invasion of my privicy. Butters, if you show anybody that tape I will end you, and that was a totaly different kid dancing anyway. Half a star. Delete this piece of crap."],
  ['Cartmanland', "My park. MY rides. No lines, becuz you assholes weren't invited, ha ha. Then a bunch of greedy grown-ups ruined it wiht bills and Kyle suddenly got all happy abuot it. Son of a bitch. Half a star."],
  ['Cartoon Wars (2)', "Goddammit, I was ONE hallway away! One! And then Kahl shows up wiht his stupd green hat and his stupid speach like anybody asked. Half a star. I hope your hat falls in the toilet, you bastard."],
  ['Le Petit Tourette', "I had the greatest scam of all time: say whatever the hell I want and everbody has to be nice to me. Then my own damn mouth betrayed me on live TV. Sabotage. Half a star. I hate you guys."],
  ['Dances With Smurfs', "I was the only honest voice at that school and that sneaky hippie Wendy ambushed me by AGREEING wiht me. Who the hell does that?! Cheating bitch move. Half a star. Screw you guys, Im going home."],
];

// One comment under each of Kyle's reviews: [the title Kyle used, comment].
const KYLE_COMMENTS = [
  ['Chinpokomon', "\"Im not proud.\" You shouldn't be, Kahl. You showed up late wiht the crappiest one and everbody laughed. I'm STILL laughing, asshole. dumm joo."],
  ['Something Wall-Mart This Way Comes', "\"Shop local,\" says the griidy joo who has never bought me one single thing. Shut your stupd mouth. Cheapskate nerd."],
  ['Trapped in the Closet', "Oh WOW, your boyfriend Stan gets to be the special one, and your still his sidekick. I would've been a way better prophet. Suck it. Sidekick nerd."],
  ['Smug Alert!', "KYLE reviewing an epsiode abuot being smug. You ARE the smug cloud, you son of a bitch. Somebody get me a gas mask. Smug little joo"],
  ['Cartoon Wars (1)', "It WAS abuot principles. My principal is tat I hate it and I hate you. Read a book, jackass."],
  ['Cartoon Wars (2)', "Five stars for your own damn speach? Nobdy was lisening, Kahl. Nobody has EVER been lisening. Even Stan was asleep. Speach nerd."],
  ['Douche and Turd', "\"I get both sides.\" Pick one, you spineless fence-sitting buthole. Wishy-washy andy."],
  ['Goobacks', "A whole paragraph abuot jobs from a dumbass who's never had one. Go cry about it to sombody who gives a crap. stupid joo."],
  ['Margaritaville', "You blew all that money on strangers and not ONE cent on your good buddy Eric? You selfish son of a bitch. greedy joo."],
  ['Best Friends Forever', "That handheld fight was totaly legit. I had paperwork. Don't ask who wrote it, you nosy bastard. Nosey nerd."],
  ['Quest for Ratings', "Our show would've crushed Craig's if you dumbasses had just done exactly what I said. dirdy joo."],
  ['The Passion of the Jew', "A whole reveiw abuot your stupd feelings. Boo hoo. Call a waaah-mbulance, crybaby. Crybaby dumass."],
  ['Go God Go XII (2)', "I froze my ass off for like five hundred years and your just sitting there taking notes? Screw you, Kyle. Screw your notes. Mega nerd."],
  ['Dances With Smurfs', "\"My favorite kind of ending.\" Of course it is. Go marry Wendy and be insufferable together, nerd."],
  ['Safe Space', "From now on only nice commments abuot me are allowed, and yours can kiss my ass. Butters, delete this poophead. dum joo."],
  ['Go God Go (1)', "\"Mostly setup.\" Excuse me, that was MY emotional journey, you insensitive prick. fucking joo prick."],
  ['Stunning and Brave', "YOU got in trouble and for once it wasnt me? Haha! Hahahaha, you dumb joo! Best day of my life."],
  ['The Hobbit', "Wendy is NOT usually right, you kiss-ass. Stop encouraging that bitch. Teachers pet nerd."],
  ['Breast Cancer Show Ever', "You've watched it HOW many times? You sick son of a bitch. Im telling your mom. And my mem. MEHHHM!"],
  ['Put It Down', "Aww, what a sweet widdle epsiode abuot lisening. I stopped reading, becuz shut up."],
  ['The Cissy', "I had a very real need for a privite bathroom and you woke SJW ass is making it weird. I do what I want!"],
  ['South Park: The End of Obesity', "FINALLY you admit the villain is paperwork and not me. Screenshotting this. Suck my balls, Kahl."],
  ['South Park (Not Suitable for Children)', "You read that title and still reviewed it? Oh, you are SO busted, asshole. Respect my authoritah and log off."],
];

const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

// His comment under Kyle's review of an episode ('' if there isn't one).
export function cartmanCommentHTML(title) {
  const found = KYLE_COMMENTS.find(([t]) => norm(t) === norm(title));
  return found ? `
    <div class="cartman-comment">
      ${avatarHTML(CARTMAN, 26)}
      <div><a href="profile.html?u=cartman"><strong>Eric Cartman</strong></a> <span class="guest-tag">Character</span><p>${esc(found[1])}</p>${pcTalkButtonHTML('cartman', found[1])}</div>
    </div>` : '';
}

const GRADES = [0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1.5, 2];
const fillerGrade = (ep) => GRADES[(Math.imul(ep.id, 2654435761) >>> 0) % GRADES.length];

export async function renderCartmanProfile(root) {
  const all = await loadAllEpisodes();
  const byTitle = new Map(all.map((e) => [norm(e.title), e]));
  const find = (t) => byTitle.get(norm(t));
  const picked = RATED.map(([t, r, liked]) => ({ ep: find(t), r, liked })).filter((x) => x.ep);
  // He's "watched" everything else too, and hated it. Fixed ratings per episode, same on every visit.
  const have = new Set(picked.map((x) => x.ep.id));
  const today = new Date().toISOString().slice(0, 10);
  const filler = all.filter((e) => e.kind === 'episode' && e.air_date && e.air_date <= today && !have.has(e.id))
    .map((e) => ({ ep: e, r: fillerGrade(e), liked: false }));
  const rated = [...picked, ...filler];
  const reviews = REVIEWS.map(([t, text]) => ({ ep: find(t), text, r: picked.find((x) => x.ep === find(t))?.r, liked: TOP4.includes(t) })).filter((x) => x.ep);
  const top4 = TOP4.map(find).filter(Boolean);
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const diary = [...filler.slice(-6).reverse(), ...picked.slice(0, 2)].map((x, i) => ({ ...x, date: day(i * 2 + 1) }));
  const hours = Math.round((rated.length * 22) / 60);
  const avg = rated.reduce((s, x) => s + x.r, 0) / (rated.length || 1);
  document.title = 'Eric Cartman · Parkboxd';

  const badge = (emoji, name, desc) => `<div class="badge paper earned" title="${esc(desc)}"><span class="emoji" aria-hidden="true">${emoji}</span><strong>${esc(name)}</strong><span>${esc(desc)}</span><span class="got">Unlocked</span></div>`;

  root.innerHTML = `
    <section class="profile-head paper" aria-label="Profile">
      ${avatarHTML(CARTMAN, 96)}
      <div class="who">
        <h1 class="cut">Eric Cartman</h1>
        <span class="handle">@cartman · joined ${esc(formatDate('2026-11-27', { month: 'long', year: 'numeric' }))} · 👑 The only critic who matters</span>
        <p class="bio">Hey, I'm Eric. I'm super cool, really smart and everybody likes me. I review episodes so you guys know which ones are good. If you disagree, screw you.</p>
        <div style="margin-top:6px"><span class="team-flair paper" style="background-color:#e5534b;color:#1a1a1a">Team Me</span></div>
      </div>
      <div class="stats">
        <div class="stat"><b>${rated.length}</b><span>Episodes</span></div>
        <div class="stat"><b>${hours}</b><span>Hours</span></div>
        <div class="stat"><b>${reviews.length}</b><span>Reviews</span></div>
        <div class="stat"><b>${avg.toFixed(1)}</b><span>Avg rating</span></div>
        <div class="stat"><b>Millions</b><span>Followers (he says)</span></div>
        <div class="stat"><b>0</b><span>Following</span></div>
      </div>
      <div class="profile-actions" style="width:100%">
        <button type="button" class="btn btn-green" id="follow-cartman">Follow</button>
      </div>
    </section>

    <section>
      <div class="section-head"><h2>Favourite episodes</h2></div>
      <div class="top4">${top4.map((ep) => `<a class="ep-card" href="episode.html?id=${ep.id}">${thumbHTML(ep, { size: 'w500' })}</a>`).join('')}</div>
    </section>

    <section>
      <div class="section-head"><h2>Badges</h2><span class="result-count">awarded by himself</span></div>
      <div class="badges">
        ${badge('🏆', 'Undefeated', 'Has never lost. Do not check.')}
        ${badge('👮', 'Authoritah', 'Respected it')}
        ${badge('🧀', 'Snack Break', 'Logged an episode between meals')}
        ${badge('💬', 'Reply Guy', 'Commented on every single one of Kyle\'s reviews')}
        ${badge('⭐', 'Half Measures', 'Handed out more half stars than anyone')}
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
            <div style="display:flex;gap:14px;align-items:center"><span style="font-size:40px;line-height:1" aria-hidden="true">👑</span>
              <div class="cut" style="font-size:26px;color:var(--white);line-height:1.1">Eric is a Cartman</div></div>
            <p style="margin:10px 0 0;color:var(--text-soft)">He demanded a recount, hoping for something even better. There is nothing better, according to him.</p>
          </div>
        </section>
        <section>
          <div class="section-head"><h2>Ratings</h2><span class="result-count">${rated.length}</span></div>
          ${histogramHTML(countRatings(rated.map((x) => x.r)))}
          <p style="margin:10px 0 0;font-size:12px;color:var(--muted)">"If I'm not winning in it, why would I like it?" — Cartman</p>
        </section>
      </aside>
    </div>`;

  // Loaded here, not at the top: guest-reviews.js imports this file.
  const { showProfileReviews } = await import('./guest-reviews.js?v=20261127211334');
  await showProfileReviews(root.querySelector('[data-guest-list]'), 'cartman', reviews.map((x) => x.ep));
  root.removeAttribute('aria-busy');

  const follow = root.querySelector('#follow-cartman');
  follow.addEventListener('click', () => {
    follow.textContent = '✓ Following';
    follow.disabled = true;
    toast("About time. He is not following you back.");
  });
}
