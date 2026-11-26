// Butters' automatic weekly review for the Book Club pick.
// Same review for everybody all week: lines are picked with a seed from the week number.

const OPENERS = [
  'Oh hamburgers, this one was just swell!',
  'Gee whiz, everybody, what a pick!',
  "Well, I finished the book this week. It's an episode, but I'm calling it a book.",
  'Golly, I stayed up past my bedtime for this one.',
  'Oh boy oh boy, Book Club time!',
  "Hi everybody, it's me, your Book Club host!",
];

const MIDDLES = [
  '"{t}" made me laugh so hard I got a tummy ache.',
  'I took real careful notes on "{t}". Mostly doodles, but they count.',
  '"{t}" has a real important message, I think. I\'m not sure what it is yet.',
  'I watched "{t}" twice, once for fun and once for Book Club.',
  'My favourite part of "{t}" was all of it. Is that allowed?',
  'I tried explaining "{t}" to my dad and now I\'m grounded. Worth it!',
];

const CLOSERS = [
  "Don't tell my parents I watched it, okay?",
  'Five stars, and a gold sticker too!',
  'Next week I promise to bring snacks.',
  "Let's all be real nice in the reviews, fellas.",
  'Book Club is the best part of my week. Thanks for coming, everybody!',
  "I'll write a longer one next week. If I'm not grounded.",
];

// Extra line when a character tag is on the episode (first match wins, Butters first).
const TAG_LINES = [
  ['Butters', "And I'm in it! Golly, I hope I did okay."],
  ['Professor Chaos', 'Professor Chaos approves too. Not that I know him. Who said that?'],
  ['Cartman', "Eric was awful mean in this one, but I bet he didn't mean it."],
  ['Kenny', 'I sure hope Kenny is okay.'],
  ['Randy', "Stan's dad sure is something, huh?"],
  ['Mr. Mackey', "Mr. Mackey would say it's real good, m'kay. So I'm saying it too."],
  ['Towelie', 'There was a towel in it. I always bring a towel now.'],
];

// Small deterministic PRNG so every visitor sees the same review.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

/**
 * buttersReview(ep, tags, weekStartDate) -> { rating, text }
 *   tags: the episode's tag names; rating is always 4.5 or 5, because Butters.
 */
export function buttersReview(ep, tags = [], start = new Date()) {
  const week = Math.floor(start.getTime() / 604800000);
  const r = rng(week * 31 + ep.id);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const lower = tags.map((t) => t.toLowerCase());
  const tagLine = TAG_LINES.find(([name]) => lower.includes(name.toLowerCase()))?.[1];
  const rating = r() < 0.75 ? 5 : 4.5;
  const closers = rating === 5 ? CLOSERS : CLOSERS.filter((c) => !c.startsWith('Five stars'));
  const halfOff = rating === 4.5 ? 'I took off half a star because one part scared me a little.' : null;
  const parts = [pick(OPENERS), pick(MIDDLES).replace('{t}', ep.title), tagLine, halfOff, pick(closers)].filter(Boolean);
  return { rating, text: parts.join(' ') };
}
