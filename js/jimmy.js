// Jimmy's Comedy Roast: jokes built from someone's real Parkboxd stats, one per click.
// Every stat joke needs a fact behind it; a few filler jokes cover quiet profiles.


const shuffle = (arr) => arr.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const stars = (r) => `${r}★`;

/**
 * roastJokes(ctx) -> [string], one joke per click
 *   ctx: { name, logs, ratings (Map ep -> stars), avgs (Map ep -> {avg,count}), byId (Map ep -> episode),
 *          hours, reviewCount, champTitle, streak: {current,longest}, persona, fav, top4 (ep ids) }
 */
export function roastJokes(ctx) {
  const { name, logs = [], ratings = new Map(), avgs = new Map(), byId = new Map() } = ctx;
  const title = (id) => byId.get(id)?.title || 'some episode';
  const jokes = [];
  const rated = [...ratings.entries()];
  const avg = rated.length ? rated.reduce((s, [, r]) => s + r, 0) / rated.length : null;

  // Harshest disagreement with everyone else.
  const harsh = rated.map(([id, r]) => ({ id, r, a: avgs.get(id)?.avg, n: avgs.get(id)?.count || 0 }))
    .filter((x) => x.a != null && x.n >= 2).sort((x, y) => (x.r - x.a) - (y.r - y.a))[0];
  if (harsh && harsh.a - harsh.r >= 1.5) {
    jokes.push(`${name} gave ${title(harsh.id)} ${stars(harsh.r)}. Everybody else gave it ${harsh.a.toFixed(1)}. That's not a hot take, that's a c-c-cry for help.`);
  }
  const soft = rated.map(([id, r]) => ({ id, r, a: avgs.get(id)?.avg, n: avgs.get(id)?.count || 0 }))
    .filter((x) => x.a != null && x.n >= 2).sort((x, y) => (y.r - y.a) - (x.r - x.a))[0];
  if (soft && soft.r - soft.a >= 1.5) {
    jokes.push(`${name} gave ${title(soft.id)} ${stars(soft.r)}. Everybody else gave it ${soft.a.toFixed(1)}. Buddy, I've seen better taste at a g-g-gas station hot dog roller.`);
  }
  if (avg != null && avg >= 4.2) jokes.push(`${name}'s average rating is ${avg.toFixed(1)} stars. This person would give a five-star review to a t-t-traffic cone.`);
  if (avg != null && avg <= 2.6) jokes.push(`${name}'s average rating is ${avg.toFixed(1)}. Have you considered that maybe the problem isn't the episodes? It's you. It's d-d-definitely you.`);
  if (ctx.hours >= 24) jokes.push(`${name} has watched ${ctx.hours} hours of South Park. That's ${(ctx.hours / 24).toFixed(1)} whole d-d-days. Their plants are dead. Their family has moved on.`);
  if (logs.length > 0 && logs.length < 15) jokes.push(`${name} has logged ${logs.length} episode${logs.length === 1 ? '' : 's'}. ${logs.length}! I've seen longer commitments from a f-f-fruit fly.`);
  if (logs.length >= 15 && ctx.reviewCount === 0) jokes.push(`${name} has logged ${logs.length} episodes and written zero reviews. The strong, silent type. Like Kenny, but with less to say.`);
  if (ctx.reviewCount >= 15) jokes.push(`${name} has written ${ctx.reviewCount} reviews. ${ctx.reviewCount}! Nobody asked, b-b-buddy. Nobody. Asked.`);
  const rewatches = logs.filter((l) => l.is_rewatch).length;
  if (rewatches >= 5) jokes.push(`${name} has ${rewatches} rewatches. You know there are ${byId.size} episodes, right? You can watch a d-d-different one.`);
  if (ctx.champTitle) jokes.push(`${name}'s Cage Match champion is ${ctx.champTitle}. Of all the episodes in the world. I'm not saying it's wrong, I'm just saying Cartman l-l-laughed.`);
  if (ctx.streak?.current >= 3) jokes.push(`${name} is on a ${ctx.streak.current}-day streak. ${ctx.streak.current} days in a row of South Park. Somebody check on this p-p-person.`);
  else if (ctx.streak?.longest >= 3) jokes.push(`${name} once had a ${ctx.streak.longest}-day streak. Once. Then they discovered s-s-sunlight.`);
  if (ctx.persona) jokes.push(`The site says ${name} is a ${ctx.persona}. The site has never been more r-r-right about anything.`);
  if (ctx.fav) jokes.push(`${name}'s favourite character is ${ctx.fav}. That tells you everything. That tells you way too m-m-much.`);
  const top4Low = (ctx.top4 || []).map((id) => ({ id, a: avgs.get(id)?.avg })).filter((x) => x.a != null && x.a < 3.3)[0];
  if (top4Low) jokes.push(`${title(top4Low.id)} is in ${name}'s Top 4. Everyone else gave it ${top4Low.a.toFixed(1)}. That's not a favourite, that's a h-h-hostage situation.`);

  // Filler for quiet profiles, so the set is never empty.
  const FILLER = [
    `${name} signed up for a South Park website. Of all the things to do with your life. And I'm a c-c-comedian at a website. So who am I to talk.`,
    `I asked ${name} what their favourite episode was. They're still thinking. It's been th-th-three days.`,
    `${name} said they'd write a review "later." Later never came. Later is still out there s-s-somewhere.`,
    `${name} is so quiet on here, the site thought their account was a b-b-bot.`,
  ];
  // Real-stat jokes first (shuffled), then the filler ones.
  return [...shuffle(jokes), ...shuffle(FILLER)];
}
