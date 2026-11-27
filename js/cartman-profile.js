// Cartman's own (pretend) Parkboxd account, shown at profile.html?u=cartman. Like Butters and
// Kyle, he isn't a real member: nothing is in the database, so his ratings never touch site
// averages. He loves the episodes where he wins and hates nearly everything else, and he leaves a
// comment under every one of Kyle's reviews. Episodes are matched by title.
import { esc, epCode, stars, avatarHTML, formatDate, toast } from './ui.js?v=20261127192938';
import { loadAllEpisodes, thumbHTML } from './episodes.js?v=20261127192938';
import { countRatings, histogramHTML } from './histogram.js?v=20261127192938';

export const CARTMAN = { username: 'cartman', display_name: 'Eric Cartman', avatar_color: '#e5534b', avatar_icon: 'beanie' };

// His greatest victories. These are also his Top 4.
const TOP4 = ['Scott Tenorman Must Die', 'Make Love, Not Warcraft', 'Casa Bonita', 'Die Hippie, Die'];
const LOSSES = ['Breast Cancer Show Ever', 'AWESOM-O', 'Cartmanland', 'Cartoon Wars (2)', 'Le Petit Tourette', 'Dances With Smurfs'];

// [title, stars, liked]: five stars for the wins, half a star for the losses.
export const RATED = [...TOP4.map((t) => [t, 5, true]), ...LOSSES.map((t) => [t, 0.5, false])];

export const REVIEWS = [
  ['Scott Tenorman Must Die', "The greatest thing ever put on television. A guy owes me money, I handle it like a mature adult, and my favourite band shows up to watch. Five stars."],
  ['Make Love, Not Warcraft', "I led. I trained. I saved an entire online world while certain people whined about their hands. You're welcome, nerds. Five stars."],
  ['Casa Bonita', "One kid goes missing for a little while and everybody makes a huge deal out of it. I got the cliff divers AND the sopapillas. Totally worth it. Five stars."],
  ['Die Hippie, Die', "Finally, an episode about the real threat. I warned everyone, nobody listened, and then who came crawling to me for help? Five stars."],
  ['Breast Cancer Show Ever', "Fake. Staged. I wasn't even trying, you guys. I had something in my eye the whole time and my mem can confirm it. Half a star."],
  ['AWESOM-O', "This episode never happened. Anyone who brings up any tapes is getting reported. Half a star, and Butters is banned from talking about it."],
  ['Cartmanland', "I had the greatest theme park in the world with no lines, because nobody else was allowed in. Then it all got ruined by money stuff. Lame. Half a star."],
  ['Cartoon Wars (2)', "I was RIGHT THERE. One more hallway and that show was finished forever. Then somebody had to stick their dumb green hat in it. Half a star."],
  ['Le Petit Tourette', "I had the perfect system: say whatever I want and get away with it. Then it backfired on live TV, which is sabotage. Half a star."],
  ['Dances With Smurfs', "I was a brilliant, honest, fearless broadcaster and Wendy ambushed me by agreeing with me. Who DOES that?! Half a star."],
];

// One comment under each of Kyle's reviews: [the title Kyle used, comment].
const KYLE_COMMENTS = [
  ['Chinpokomon', 'You bought the dumbest ones, Kyle. Everybody saw. It was embarrassing for all of us.'],
  ['Something Wall-Mart This Way Comes', '"Shop local," says the guy who has never bought me a single thing, locally or otherwise.'],
  ['Trapped in the Closet', "Oh WOW, Stan gets to be special. I would've been a way better prophet and I'd have charged more."],
  ['Smug Alert!', "Kyle reviewing an episode about being smug. I can't. I literally can't. Somebody get a gas mask."],
  ['Cartoon Wars (1)', 'It WAS about principles. My principle is that I wanted it gone.'],
  ['Cartoon Wars (2)', 'Five stars because you got to give a speech. We get it, Kyle. You like speeches.'],
  ['Douche and Turd', '"I get both sides." Pick one, you fence-sitting weenie.'],
  ['Goobacks', "A whole paragraph about jobs. You don't even HAVE a job."],
  ['Margaritaville', "You spent all that money on strangers and now you want applause? Dumbest thing I ever heard. Also you owe me five bucks."],
  ['Best Friends Forever', "That handheld fight was totally legit. Read the paperwork, Kyle. Don't ask who wrote it."],
  ['Quest for Ratings', "Our show would've crushed Craig's if everyone had just done exactly what I said."],
  ['The Passion of the Jew', 'You wrote a whole review about feeling bad. Super fun read. Next.'],
  ['Go God Go XII (2)', 'I waited like five hundred years for that console and you had all that time to type this? Lame.'],
  ['Dances With Smurfs', '"My favorite kind of ending." Of course it is. Go marry the ending.'],
  ['Safe Space', 'From now on only nice comments about me are allowed. Butters, get on it.'],
  ['Go God Go (1)', '"Mostly setup." Excuse me, that was my emotional journey.'],
  ['Stunning and Brave', 'You got in trouble and for once it was not my fault? Best part of the whole episode.'],
  ['The Hobbit', 'Wendy is NOT usually right. Stop encouraging her.'],
  ['Breast Cancer Show Ever', "You've watched it HOW many times? That's creepy, Kyle. I'm telling your mom. And my mem."],
  ['Put It Down', 'Aww, a sweet little episode about listening. Anyway, I stopped reading.'],
  ['The Cissy', "I had a very real need for a private bathroom and you're making it weird."],
  ['South Park: The End of Obesity', 'FINALLY you admit the villain is paperwork and not me. Screenshotting this.'],
  ['South Park (Not Suitable for Children)', "You read the title and still reviewed it? I'm telling."],
];

const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

// His comment under Kyle's review of an episode ('' if there isn't one).
export function cartmanCommentHTML(title) {
  const found = KYLE_COMMENTS.find(([t]) => norm(t) === norm(title));
  return found ? `
    <div class="cartman-comment">
      ${avatarHTML(CARTMAN, 26)}
      <div><a href="profile.html?u=cartman"><strong>Eric Cartman</strong></a> <span class="guest-tag">Character</span><p>${esc(found[1])}</p></div>
    </div>` : '';
}

export async function renderCartmanProfile(root) {
  const all = await loadAllEpisodes();
  const byTitle = new Map(all.map((e) => [norm(e.title), e]));
  const find = (t) => byTitle.get(norm(t));
  const picked = RATED.map(([t, r, liked]) => ({ ep: find(t), r, liked })).filter((x) => x.ep);
  // He's "watched" everything else too, and hated it. Fixed ratings per episode, same on every visit.
  const have = new Set(picked.map((x) => x.ep.id));
  const GRADES = [0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1.5, 2];
  const today = new Date().toISOString().slice(0, 10);
  const filler = all.filter((e) => e.kind === 'episode' && e.air_date && e.air_date <= today && !have.has(e.id))
    .map((e) => ({ ep: e, r: GRADES[(Math.imul(e.id, 2654435761) >>> 0) % GRADES.length], liked: false }));
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
        <p class="bio">Episodes where I win: masterpieces. Everything else: garbage. Do not argue with me, Kyle.</p>
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
        <div class="reviews">${reviews.map((x) => `
          <article class="review">
            <a href="episode.html?id=${x.ep.id}" style="flex:0 0 110px" aria-hidden="true" tabindex="-1">${thumbHTML(x.ep, { showTitle: false })}</a>
            <div class="review-body">
              <div style="font-size:14px"><a class="ep-link" href="episode.html?id=${x.ep.id}">${esc(x.ep.title)}</a> <span style="color:var(--muted)">${esc(epCode(x.ep))}</span></div>
              <div class="review-meta">${avatarHTML(CARTMAN, 22)}<span><strong>Eric Cartman</strong></span><span class="rating">${stars(x.r)}</span>${x.liked ? '<span class="heart" aria-label="Liked">♥</span>' : ''}</div>
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
  root.removeAttribute('aria-busy');

  const follow = root.querySelector('#follow-cartman');
  follow.addEventListener('click', () => {
    follow.textContent = '✓ Following';
    follow.disabled = true;
    toast("About time. He is not following you back.");
  });
}
