// Jimmy's Comedy Roast: one joke per click. Jokes about the person's real Parkboxd stats are
// mixed with Jimmy's general material, and every joke gets a couple of extra stutters.

const shuffle = (arr) => arr.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const stars = (r) => `${r}★`;

// Stutter on a couple more words: "terrific" -> "t-t-terrific". Skips names, numbers and
// words that already stutter.
const SKIP = /^(the|and|that|this|with|they|them|their|what|your|have|from|were|just)$/i;
function stutter(text, extra = 2) {
  const words = text.split(' ');
  const spots = shuffle(words.map((w, i) => i).filter((i) => {
    const w = words[i];
    return /^[a-z]{4,}[,.!?]?$/.test(w) && !SKIP.test(w.replace(/[,.!?]/g, '')); // lowercase words only: no names
  })).slice(0, extra);
  for (const i of spots) {
    const w = words[i];
    const first = w.slice(0, /^(th|sh|ch|wh)/i.test(w) ? 2 : 1);
    words[i] = `${first}-${first.toLowerCase()}-${first.toLowerCase()}${w.slice(first.length)}`;
  }
  return words.join(' ');
}

// Jimmy's general material: nothing to do with anyone's account.
const GENERIC = [
  "I told my crutches a joke. They didn't laugh, but they were really supportive.",
  "Why don't skeletons fight each other? They don't have the guts. That one's for Kenny.",
  'I bought a dictionary and all the pages were blank. I have no words for how angry I am.',
  "I'm reading a book about anti-gravity. I just can't put it down.",
  "My teacher said I'd never amount to anything. Now I'm a comedian on a website. So she was half right.",
  "Parallel lines have so much in common. It's a shame they'll never meet.",
  'I used to hate facial hair. Then it grew on me.',
  "I tried to catch some fog yesterday. I mist.",
  'What do you call a fake noodle? An impasta. Cartman calls it lunch.',
  "I asked the librarian for books about paranoia. She whispered: they're right behind you.",
  "Why couldn't the bicycle stand up on its own? It was two-tired. Believe me, I know the feeling.",
  "I was going to tell you a time-travel joke. But you didn't like it.",
  "What's orange and sounds like a parrot? A carrot. Thank you, I'm here all week.",
  "I told my mom she was drawing her eyebrows too high. She looked surprised.",
  "I'd tell you a joke about construction, but I'm still working on it.",
  'Why did the math book look so sad? Too many problems. Same, buddy. Same.',
  "Towelie asked me for some advice. I said: don't forget to bring a towel. He cried. It was beautiful.",
  "I named my dog Five Miles, so I can tell people I walk Five Miles every single day.",
  "I'm terrified of elevators, so I'm taking steps to avoid them.",
  'Randy Marsh told me his farm has integrity. I asked him to spell it. We are still waiting.',
  'What do you call a bear with no teeth? A gummy bear. What do you call Cartman with no snacks? Furious.',
  'My favourite exercise is a cross between a lunge and a crunch. I call it lunch.',
  "Butters asked me how my show went. I said I killed. He called the police.",
  'Mr. Mackey told me jokes are bad, m\'kay. I said, have you heard mine? He said, especially yours, m\'kay.',
  "How does Kenny stay so calm all the time? Buddy, he's been through worse. Every single week.",
  "I'm great at multitasking. I can waste time, be unproductive and procrastinate, all at once.",
  'Why did the scarecrow get an award? He was outstanding in his field. Like me, but with less straw.',
  "I wanted to be a stand-up comedian, but people kept asking me to sit down. Joke's on them, I brought my own chair.",
  'The other day a clown held the door open for me. I thought it was a really nice jester.',
  "Cartman says he's not fat, he's big-boned. I've seen the X-rays, folks. The bones are fine.",
  'I tried to write a joke about procrastination. I will finish it tomorrow.',
  "Kyle asked me if I've ever been to Jersey. I said no. He said good, don't.",
];

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
  // Mix them: a stat joke, a general one, a stat joke... Quiet profiles get the filler roasts too.
  const stat = shuffle(jokes.length >= 3 ? jokes : [...jokes, ...FILLER]);
  const general = shuffle(GENERIC);
  const mixed = [];
  while (stat.length || general.length) {
    if (stat.length) mixed.push(stat.shift());
    if (general.length) mixed.push(general.shift());
  }
  return mixed.map((j) => stutter(j));
}
