// Kyle's own (pretend) Parkboxd account, shown at profile.html?u=kyle. Like Butters, he isn't a
// real member: nothing is in the database, so his ratings never touch site averages. He reviews
// the "smart" episodes and adds a reading-list note on what each one is spoofing. His reviews
// also show on those episode pages (js/guest-reviews.js). Episodes are matched by title.
import { esc, epCode, stars, avatarHTML, formatDate, toast } from './ui.js?v=20261127204240';
import { loadAllEpisodes, thumbHTML } from './episodes.js?v=20261127204240';
import { countRatings, histogramHTML } from './histogram.js?v=20261127204240';

export const KYLE_USERNAME = 'kyle';
export const KYLE = { username: 'kyle', display_name: 'Kyle Broflovski', avatar_color: '#3fb950', avatar_icon: 'earflaps' };

// [title, stars, liked]. Tough but fair. Everything he reviewed is in here too.
export const RATED = [
  ['Chinpokomon', 4.5, true], ['Something Wall-Mart This Way Comes', 4.5, true], ['Trapped in the Closet', 5, true],
  ['Smug Alert!', 4.5, true], ['Cartoon Wars (1)', 4.5, true], ['Cartoon Wars (2)', 5, true], ['Douche and Turd', 5, true],
  ['Goobacks', 4, false], ['Margaritaville', 5, true], ['Best Friends Forever', 4.5, true], ['Quest for Ratings', 4, false],
  ['The Passion of the Jew', 3.5, false], ['Red Man\'s Greed', 4, false], ['Go God Go (1)', 4, false], ['Go God Go XII (2)', 4.5, true],
  ['Stunning and Brave', 4, false], ['Where My Country Gone?', 4, false], ['Dances With Smurfs', 4.5, true],
  ['Night of the Living Homeless', 4, false], ['The China Probrem', 4, false], ['W.T.F.', 3.5, false], ['Whale Whores', 4, false],
  ['Crack Baby Athletic Association', 4, false], ['Ass Burgers', 4, false], ['Safe Space', 4.5, true],
  ['Scott Tenorman Must Die', 5, true], ['Make Love, Not Warcraft', 4.5, true], ['Casa Bonita', 3, false],
  ['The Death Camp of Tolerance', 4, false], ['Super Best Friends', 4.5, true], ['Ginger Kids', 3.5, false],
  ['Toilet Paper', 3.5, false], ['Free Hat', 4.5, true], ['Here Comes the Neighborhood', 3.5, false],
  ['The Hobbit', 4.5, true], ['Breast Cancer Show Ever', 5, true], ['Put It Down', 4, false], ['The Cissy', 4, false],
  ['South Park: The End of Obesity', 4.5, true], ['South Park (Not Suitable for Children)', 4, false],
  ['Mr. Hankey, the Christmas Poo', 5, true], ["Ike's Wee Wee", 5, true],
];

const WATCHED = 200; // he made sure it was a round number

// Kyle's own big ones: his Christmas episode, his little brother, Cartman finally losing a fight, and saving the economy.
const TOP4 = ['Mr. Hankey, the Christmas Poo', "Ike's Wee Wee", 'Breast Cancer Show Ever', 'Margaritaville'];

// [title, review, reading-list note on what the episode is spoofing].
export const REVIEWS = [
  ['Chinpokomon', "Every kid in town buys the same toy because a commercial told them to, and I was one of them. I'm not proud. What gets me is how fast it happened: one week nobody cared, the next week we were all collecting, trading and fighting over them. The grown-ups only notice when it's way too late. Four and a half stars, and I'd like my allowance back.",
    'Spoofs the late-90s collectible-monster craze and how kids\' marketing works on you before you notice.'],
  ['Something Wall-Mart This Way Comes', "A giant store moves in, everything's cheap, and the whole town falls apart. Everyone says they hate it and then goes back the next day anyway, which is the most realistic part. The twist about who's really behind it is the smartest bit of the whole episode. Four and a half stars. Shop local, people.",
    'A horror-movie take on big-box stores pushing out small-town shops.'],
  ['Trapped in the Closet', "Stan takes one personality test and ends up a prophet. It explains a real belief system more clearly than most documentaries, and it doesn't hold back even a little. Then the ending turns into a running joke about refusing to come out of the closet, and it just keeps going. It's bold, it's ridiculous, and it's still being talked about. Five stars.",
    'Takes on Scientology and celebrity, and famously walks through its origin story with a big on-screen caption.'],
  ['Smug Alert!', "Stan's dad buys a hybrid and gets so pleased with himself that it becomes a weather system. Caring about the planet is good. Being insufferable about it is a separate thing, and this episode knows the difference. I also have to admit I recognized a few people I know in it, which was uncomfortable. Four and a half stars.",
    'Pokes fun at people who make doing the right thing all about how great they are.'],
  ['Cartoon Wars (1)', "Cartman tries to get a cartoon pulled for his own reasons and I have to stop him. He pretends it's about principles. It is not about principles. The first half is mostly setup and a lot of driving around, but it sets up a really important question for part two. Four and a half stars.",
    'Part one of a two-parter about free speech and whether a show should censor itself out of fear.'],
  ['Cartoon Wars (2)', "The payoff. It makes a real argument about free speech, about why you can't let fear decide what gets shown, and then the episode gets censored on its own network. Which kind of proves the whole point, honestly. I've rewatched the ending a bunch of times. Five stars. Cartman was wrong, as usual.",
    'The ending is about the network cutting a scene, which is the whole point of the episode.'],
  ['Douche and Turd', "Stan won't vote because both choices are terrible, and the whole town turns on him for it. I get both sides. Not voting doesn't fix anything, but being forced to pick between two bad options doesn't feel great either. I'm going to say it: this is the most honest election episode ever made. Five stars.",
    'Election-year satire about feeling stuck choosing between two bad options.'],
  ['Goobacks', "People from the future come back for work and everyone panics about their jobs. The arguments on both sides sound exactly like the real ones, just with time travel. The solution at the end is very, very dumb, and I'm choosing to respect it anyway. Four stars.",
    'An immigration debate, told with time travellers.'],
  ['Margaritaville', "I put the whole town's debt on my own card to save the economy. Did it work? Kind of. Do I regret it? Also kind of. Before this I didn't really get how the economy works, and somehow a cartoon about my dad praying to money explained it better than school did. Five stars, and my credit score is never recovering.",
    'Explains the 2008 financial crisis as if the economy were a religion people pray to.'],
  ['Best Friends Forever', "Kenny gets a handheld, dies, and becomes the center of a huge court fight. It packs a really serious debate into twenty-two minutes and still manages to be funny the whole way through. Also, Cartman fighting over a game console in a courtroom is extremely Cartman. Four and a half stars.",
    "Aired the same week as a real right-to-die court case, and it's about who gets to decide."],
  ['Quest for Ratings', "We make a school news show and get way too competitive about viewers. Before long we're doing anything for attention and forgetting about actual news. Pretty accurate about what TV does for ratings, honestly. Also, Craig's show is weirdly hard to beat. Four stars.",
    'A look at how TV news chases viewers over facts.'],
  ['The Passion of the Jew', "I see a movie, feel guilty, and try to apologize to everyone. Meanwhile Cartman gets way too into it and starts something I really don't want to talk about. It's a hard one for me personally, but it makes a fair point about how people react to movies. Three and a half stars. I stand by it.",
    'A response to a famous 2004 film and the big debate it sparked.'],
  ['Go God Go XII (2)', "Cartman freezes himself to skip the wait for a game console and wakes up in a future where everyone's fighting about whose idea of science is right. Different groups, same exact arguments. Arguing never changes, apparently, and the ending ties it up better than I expected. Four and a half stars.",
    'A future war about who\'s right that spoofs online atheism arguments.'],
  ['Dances With Smurfs', "Cartman takes over the school announcements and makes them really mean, and somehow people start listening to him. Then it turns into a whole parody of a giant sci-fi movie. Wendy just facts him to death on air, which is my favorite kind of ending. Four and a half stars.",
    'Takes on angry talk-show hosts, and parodies a big 2009 sci-fi movie along the way.'],
  ['Safe Space', "A whole town decides to filter out anything that hurts its feelings. There's a real lesson here about criticism being good for you, even when it stings. Also, there's a guy whose whole job is reading the mean comments so nobody else has to, and I felt bad for him the whole time. Four and a half stars.",
    'Big season-19 satire about social media, body shaming and only wanting to hear nice things.'],
  ['Go God Go (1)', "Our teacher has to teach evolution and clearly does not want to, and it shows in every single lesson. Meanwhile Cartman can't wait three weeks for a game console, so he does something extremely stupid about it. It's mostly setup for part two, but the classroom stuff is great on its own. Four stars.",
    'Takes on the evolution-in-schools debate, and sets up the future story in part 2.'],
  ['Stunning and Brave', "A new principal shows up and I get in trouble for asking one honest question. The whole town decides agreeing loudly is more important than actually thinking about things. It starts a story that goes the entire season, and it's a really strong start. Four stars, and I still think it was a fair question.",
    'Political correctness, and the start of a season-long story about it. PC Principal\'s first episode.'],
  ['The Hobbit', "Wendy points out that the pictures everyone compares themselves to are fake, and somehow she's the one who gets in trouble for it. The way everyone just goes along with the edited photos is honestly scary. She was right. She's usually right. Four and a half stars.",
    'About photo retouching and impossible beauty standards in ads and on social media.'],
  ['Breast Cancer Show Ever', "Cartman makes fun of something serious and Wendy challenges him to a fight. Everyone at school thinks they know how it's going to go. I will not spoil it, but it's the most satisfying ending in the whole show, and I've watched it more times than I'll admit. Five stars, no notes.",
    'About standing up to a bully who mocks a serious cause, and the fight everyone at school bets on.'],
  ['Put It Down', "Tweek is panicking about a nuclear war, and Craig has to figure out how to actually help instead of just saying it's fine. It's a surprisingly sweet episode about listening to someone. Meanwhile, everyone in town is texting while driving and nobody gets the message. Four stars. Put your phone down.",
    'About distracted driving and how scary world news feels when you\'re a kid.'],
  ['The Cissy', "Cartman pretends to be something he's not just to get his own bathroom, and real people pay for his lie. That's what bugs me most: he isn't standing up for anyone, he's just using it. Also, a famous singer's secret identity gets revealed, and I still can't believe it. Four stars.",
    'Takes on the school bathroom debate, with Cartman abusing it for his own convenience.'],
  ['South Park: The End of Obesity', "A new medicine works, but only if your insurance lets you have it, and Cartman's doesn't. So the real villain of the whole special is paperwork. I didn't expect to learn that much about how insurance works from a Cartman story. Pretty smart for a special about weight. Four and a half stars.",
    'About weight-loss drugs and how hard and expensive health insurance makes it to get medicine.'],
  ['South Park (Not Suitable for Children)', "The grown-ups lose their minds over one website, and it's the kids who end up being the reasonable ones. Classic. Watching the adults panic and make everything worse is basically the whole show in one special. Four stars, and yes, I know what the title says.",
    'Takes on online subscription content, influencer culture and parents who panic about it.'],
];

const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

const GRADES = [3, 3.5, 3.5, 4, 4, 4, 4, 4.5, 4.5, 5];

// His watched list. He's a try-hard: the hand-picked ratings topped up to exactly WATCHED episodes,
// in air order, with fixed ratings per episode (a tough grader). Same list for everyone.
function watchedList(all) {
  const byTitle = new Map(all.map((e) => [norm(e.title), e]));
  const picked = RATED.map(([t, r, liked]) => ({ ep: byTitle.get(norm(t)), r, liked })).filter((x) => x.ep);
  const have = new Set(picked.map((x) => x.ep.id));
  const today = new Date().toISOString().slice(0, 10);
  const filler = all.filter((e) => e.kind === 'episode' && e.air_date && e.air_date <= today && !have.has(e.id))
    .slice(0, Math.max(0, WATCHED - picked.length))
    .map((e) => { const r = GRADES[(Math.imul(e.id, 2654435761) >>> 0) % GRADES.length]; return { ep: e, r, liked: r === 5 }; });
  return [...picked, ...filler];
}

/** His rating for an episode, or null if he hasn't watched it. */
export const kyleRating = (all, ep) => watchedList(all).find((x) => x.ep.id === ep.id)?.r ?? null;

export async function renderKyleProfile(root) {
  const all = await loadAllEpisodes();
  const byTitle = new Map(all.map((e) => [norm(e.title), e]));
  const find = (t) => byTitle.get(norm(t));
  const rated = watchedList(all);
  const rateOf = (t) => RATED.find(([rt]) => norm(rt) === norm(t)) || [t, 4, false];
  const reviews = REVIEWS.map(([t, text, note]) => ({ ep: find(t), text, note, r: rateOf(t)[1], liked: rateOf(t)[2] })).filter((x) => x.ep).reverse(); // newest reviews first
  const top4 = TOP4.map(find).filter(Boolean);
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const diary = rated.slice(0, 8).map((x, i) => ({ ...x, date: day(i * 3 + 1) }));
  const hours = Math.round((rated.length * 22) / 60);
  const avg = rated.reduce((s, x) => s + x.r, 0) / (rated.length || 1);
  document.title = 'Kyle Broflovski · Parkboxd';

  const badge = (emoji, name, desc) => `<div class="badge paper earned" title="${esc(desc)}"><span class="emoji" aria-hidden="true">${emoji}</span><strong>${esc(name)}</strong><span>${esc(desc)}</span><span class="got">Unlocked</span></div>`;

  root.innerHTML = `
    <section class="profile-head paper" aria-label="Profile">
      ${avatarHTML(KYLE, 96)}
      <div class="who">
        <h1 class="cut">Kyle Broflovski</h1>
        <span class="handle">@kyle · joined ${esc(formatDate('2026-11-27', { month: 'long', year: 'numeric' }))} · 📖 Reviews the smart ones</span>
        <p class="bio">I review the episodes that are actually about something, and I add a note on what each one is making fun of. Somebody on this site has to read the subtext.</p>
        <div style="margin-top:6px"><span class="team-flair paper" style="background-color:#3fb950;color:#1a1a1a">Team Kyle</span></div>
      </div>
      <div class="stats">
        <div class="stat"><b>${rated.length}</b><span>Episodes</span></div>
        <div class="stat"><b>${hours}</b><span>Hours</span></div>
        <div class="stat"><b>${reviews.length}</b><span>Reviews</span></div>
        <div class="stat"><b>${avg.toFixed(1)}</b><span>Avg rating</span></div>
        <div class="stat"><b>1</b><span>Followers</span></div>
        <div class="stat"><b>Stan</b><span>Following</span></div>
      </div>
      <div class="profile-actions" style="width:100%">
        <button type="button" class="btn btn-green" id="follow-kyle">Follow</button>
      </div>
    </section>

    <section>
      <div class="section-head"><h2>Favourite episodes</h2></div>
      <div class="top4">${top4.map((ep) => `<a class="ep-card" href="episode.html?id=${ep.id}">${thumbHTML(ep, { size: 'w500' })}</a>`).join('')}</div>
    </section>

    <section>
      <div class="section-head"><h2>Badges</h2><span class="result-count">he earned these fair and square</span></div>
      <div class="badges">
        ${badge('📖', 'Reading List', 'Wrote a note on every episode he reviewed')}
        ${badge('🗳️', 'Civic Duty', 'Reviewed every election episode')}
        ${badge('🧠', 'Subtext Spotter', 'Explained the satire so you don\'t have to')}
        ${badge('💯', '200 Club', 'Watched 200 episodes. Took notes on most of them.')}
        ${badge('📝', 'Try-Hard', 'Logged an episode every single day for a month. Voluntarily.')}
        ${badge('🤝', 'Super Best Friend', 'Follows exactly one person. It\'s Stan.')}
        ${badge('😤', 'Not Today, Cartman', 'Never gave a Cartman scheme 5★ for the scheme')}
      </div>
    </section>

    <div class="two-col">
      <section>
        <div class="section-head"><h2>Reviews &amp; reading list</h2><span class="result-count">${reviews.length} reviews</span></div>
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
            <div style="display:flex;gap:14px;align-items:center"><span style="font-size:40px;line-height:1" aria-hidden="true">🧠</span>
              <div class="cut" style="font-size:26px;color:var(--white);line-height:1.1">Kyle is a Kyle</div></div>
            <p style="margin:10px 0 0;color:var(--text-soft)">He retook the quiz three times to make sure it was accurate. It was.</p>
          </div>
        </section>
        <section>
          <div class="section-head"><h2>Ratings</h2><span class="result-count">${rated.length}</span></div>
          ${histogramHTML(countRatings(rated.map((x) => x.r)))}
          <p style="margin:10px 0 0;font-size:12px;color:var(--muted)">A tough grader. "I don't give out fives for free. You have to earn them." — Kyle</p>
        </section>
      </aside>
    </div>`;

  // Loaded here, not at the top: guest-reviews.js imports this file.
  const { showProfileReviews } = await import('./guest-reviews.js?v=20261127204240');
  await showProfileReviews(root.querySelector('[data-guest-list]'), 'kyle', reviews.map((x) => x.ep));
  root.removeAttribute('aria-busy');

  const follow = root.querySelector('#follow-kyle');
  follow.addEventListener('click', () => {
    follow.textContent = '✓ Following';
    follow.disabled = true;
    toast("Cool, thanks, dude. (He won't show up in your feed, he's busy writing notes.)");
  });
}
