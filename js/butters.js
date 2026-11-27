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
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/**
 * buttersReview(ep, tags, weekStartDate) -> { rating, text }
 *   tags: the episode's tag names; rating is always 4.5 or 5, because Butters.
 */
export function buttersReview(ep, tags = [], start = new Date()) {
  const week = Math.floor(start.getTime() / 604800000);
  const r = rng(week * 7919 + ep.id);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const lower = tags.map((t) => t.toLowerCase());
  const tagLine = TAG_LINES.find(([name]) => lower.includes(name.toLowerCase()))?.[1];
  const rating = r() < 0.75 ? 5 : 4.5;
  const closers = rating === 5 ? CLOSERS : CLOSERS.filter((c) => !c.startsWith('Five stars'));
  const halfOff = rating === 4.5 ? 'I took off half a star because one part scared me a little.' : null;
  const parts = [pick(OPENERS), pick(MIDDLES).replace('{t}', ep.title), tagLine, halfOff, pick(closers)].filter(Boolean);
  return { rating, text: parts.join(' ') };
}

// ---- Butters' live comments on Book Club reviews ----
// About 1 in 5 reviews gets one, picked from the review id so it stays put on reload.
// Built from three parts: an optional interjection, a main line and an optional sign-off.

const INTERJECTIONS = [
  'Oh golly!', 'Gee whiz!', 'Oh hamburgers.', 'Well, shucks.', 'Holy moly!', 'Oh boy!', 'Jeepers!',
  'Aw, heck.', 'Oh my.', 'Wowee!', 'Hey, fellas!', 'Gosh!', 'Um, hi!', 'Oh jeez.', 'Golly gee!',
];

const SIGNOFFS = [
  'See you next week!', 'Book Club forever!', "That's all, I gotta go do my chores.",
  'Your pal, Butters.', 'Okay, bye now!', "I'm writing that down in my Book Club journal.",
  "Don't tell my dad I was on the computer.", 'Thanks for coming to Book Club!',
  "I made a gold star for you. It's imaginary, but it counts.",
];

// Main lines by how the review rated the episode. {name} = the reviewer.
const LOVED = [
  'You loved it too, {name}? We should start a club! Oh wait, we did.',
  "That's exactly what I thought, {name}! Great minds, huh?",
  '{name} gets it! Everybody listen to {name}.',
  'I knew this was a good pick, and {name} agrees!',
  'I agree with every single word, {name}. Even the ones I had to look up.',
  "Wow, {name}, you should write for the newspaper. Or the school newsletter. That's like a newspaper.",
  "This review made me so happy I did a little dance. Don't tell anybody.",
  "{name}, I'm putting this review on our fridge. Well, my parents' fridge.",
  'See, everybody? {name} liked it! Picking episodes is hard, you know.',
  'Golly, {name}, you and me have the same taste. That never happens to me.',
  "I'm printing this out for my scrapbook, {name}.",
  "Best review I've read all week, {name}! Well, besides mine. Just kidding. Sort of.",
];

const MIXED = [
  "That's okay, {name}! Not every book can be a perfect book.",
  '{name}, I think you liked it more than you know. Deep down.',
  'A solid middle! Like a sandwich. I like sandwiches, {name}.',
  "Hmm, I can see where you're coming from, {name}. I still loved it though.",
  'Maybe give it one more watch, {name}? I watched it three times. For research.',
  "That's real fair, {name}. My dad says fair is the most a fella can ask for.",
  "{name}, you sound like a real grown-up critic. I'm a little scared.",
  "Not bad is still good, right, {name}? That's what I tell myself about my grades.",
  'Some parts were better than others, huh, {name}? Like a mixed box of chocolates.',
  "{name} brings up some real interesting points. I'm gonna think about them in the bath.",
  "I bet next week you'll love it, {name}. I'll pick a really good one. Promise.",
  'I respect it, {name}. Book Club is a place for all kinds of opinions. Even wrong ones! Kidding!',
];

const HATED = [
  "Oh. Oh no. That's okay, {name}. I'm not crying, I just got something in my eye.",
  "Gee, {name}, I'm real sorry I picked it. I'll do better next week.",
  "That's alright, {name}. My dad didn't like it either, and now I'm grounded.",
  "{name}, I still think you're swell, even if you hated my pick.",
  'Well, every club needs a tough critic. Thanks for being ours, {name}.',
  "That's okay! I'll just go sit in my room and think about what I did.",
  'Maybe we could watch it together sometime, {name}, and I could point out the good parts?',
  'Golly, {name}, you were real honest. Honesty is important. It still kinda stings though.',
  'Ouch, {name}. But okay! Constructive criticism, my mom calls it.',
  "{name} didn't like it. Noted. I'm writing it in my notebook of shame.",
  "I'm sorry the episode let you down, {name}. It's not the episode's fault. Or mine. I hope.",
  "Aw, {name}. Next week's pick is gonna knock your socks off. Or at least loosen them.",
];

const NO_RATING = [
  "No stars, {name}? That's mysterious. I like a mystery.",
  '{name} is keeping the rating a secret! Very professional.',
  "You forgot the stars, {name}! That's okay, I forget stuff all the time.",
  'Words but no stars! {name} is a true writer.',
];

const SHORT = [
  'Short and sweet, {name}! Like me. Well, short anyway.',
  "{name} doesn't waste words. I could learn from that. I use too many words. Way too many.",
  "That's a whole review in one breath, {name}. Impressive!",
];

const LONG = [
  'Golly, {name}, that was a whole essay! I read every word. Twice.',
  "{name}, that's longer than my book report on Charlotte's Web! Way to go!",
  'Wow, {name}, you really thought about it. I need a nap after reading that.',
  "I had to scroll so much, {name}! It was worth it, though.",
];

// Reactions when the review mentions someone or something. Checked in this order.
const MENTIONS = [
  [/\bbutters\b/i, [
    'You mentioned me! Golly, {name}, I feel so special.',
    "Hey, that's me! Hi, {name}!",
    "{name} wrote my name! I'm telling my mom!",
  ]],
  [/\b(chaos|professor)\b/i, [
    'Professor Chaos? Never heard of him, {name}. Nope. Not me.',
    "I, uh, don't know anything about any Professor Chaos, {name}. Ahem.",
  ]],
  [/\b(cartman|eric)\b/i, [
    "Eric's not so bad, {name}. Okay, he's pretty bad.",
    "Please don't tell Eric what you wrote, {name}. He'll find a way to blame me.",
  ]],
  [/\bkenny\b/i, [
    "I hope Kenny reads your review, {name}. If he's okay. Is he okay?",
    'Kenny is real nice to me, {name}. I can never understand what he says, though.',
  ]],
  [/\b(stan|kyle)\b/i, [
    'Stan and Kyle are real cool, {name}. They let me hang out sometimes. Sometimes.',
    'Golly, {name}, I wish I was as smart as Kyle. Or as calm as Stan.',
  ]],
  [/\brandy\b/i, [
    "Stan's dad is a real character, {name}. My dad says he's a bad influence.",
  ]],
  [/\b(funny|hilarious|laugh|lol|lmao)\b/i, [
    "It was so funny, right, {name}? I laughed so hard milk came out of my nose. And I wasn't even drinking milk!",
    'Me too, {name}! I laughed until my tummy hurt.',
  ]],
  [/\b(sad|cry|cried|emotional)\b/i, [
    "I cried too, {name}. Don't tell anybody. Especially Eric.",
    "It's okay to cry, {name}. I do it all the time. Like, all the time.",
  ]],
  [/\b(best|masterpiece|classic|goat|perfect)\b/i, 'good', [
    'A classic! Just like a real book, {name}. Which this totally is.',
    "{name} called it a classic! I'm adding it to my all-time Book Club list.",
  ]],
  [/\b(worst|boring|bad|meh|mid)\b/i, 'bad', [
    "Boring? Oh. Well. I'll try to pick more explosions next week, {name}.",
    'Aw, {name}, maybe it will grow on you. Like a mushroom. A nice one.',
  ]],
];

// Butters' best friend always gets a reply, from a set of their own.
export const BEST_FRIENDS = ['paratyam'];

const BESTIE_OPENERS = [
  'Oh golly, it\'s my best friend!', 'Hey, buddy!', 'Everybody stop! {name} posted!', 'Wowee, a {name} review!',
  'Gee whiz, my best pal is here!', 'Hi {name}! Hi! Hiiii!', 'Oh boy oh boy!', 'Golly gee, {name}!',
  'Make way, fellas!', 'Holy moly!',
];

const BESTIE = [
  '{name}, you\'re a genius. Like, a real one. Smarter than the guy on the TV quiz show.',
  'This is the smartest thing anybody has ever written on the internet. I checked.',
  '{name} is my best friend and also the best reviewer in all of South Park. Probably Colorado.',
  'I read this to my parents at dinner and they said it was brilliant. Then they grounded me, but not because of the review.',
  'Everybody, please read {name}\'s review. Then read it again. That\'s what I did.',
  'You always know exactly what to say, {name}. That\'s why you\'re my best friend.',
  'I\'m saving this review in a special box under my bed with my most precious things.',
  '{name}, if this review was a book I would read it every night before bed.',
  'A genius review from a genius person. I\'m so lucky we\'re best friends!',
  'I don\'t even need to watch episodes anymore, {name}. I just wait for your reviews.',
  'Golly, {name}, how do you think of all this stuff? Your brain must be enormous.',
  'This review is going straight to the Book Club Hall of Fame. I just made it. You\'re the only one in it.',
  '{name} is right. {name} is always right. That\'s just science.',
  'I agree with everything, {name}. Even if you change your mind later, I\'ll agree with that too.',
  'Best friends forever, {name}! And best reviewer forever too!',
  'My mom says I should have more than one best friend. I told her I only need {name}.',
  'I\'m gonna make you a friendship bracelet for this review, {name}. It\'ll be yellow. Like me.',
  'If they gave out medals for reviews, {name}, you\'d need a bigger neck.',
  'Everybody else, take notes. This is how a genius writes a review.',
  'You make Book Club the best, {name}. Without you it would just be me talking to myself. Again.',
  'I told Eric your review was better than anything he could write. He got real mad. Worth it!',
  'Wow, {name}. Just wow. I have to go lie down, that was too much genius at once.',
];

const BESTIE_LOW = [
  '{name} didn\'t like it, so it must be bad. I trust you more than I trust myself!',
  'If my best friend says it\'s bad, then it\'s bad. I\'m changing my rating. Well, I would if I could.',
  'You\'re so brave for being honest, {name}. A true genius critic.',
];

const BESTIE_SIGNOFFS = [
  'Best friends forever!', 'Your best pal, Butters.', 'BFFs! ♥', 'Can we have a sleepover this weekend?',
  'You\'re the best, {name}!', 'See you at Book Club, best friend!', 'I already saved you a seat next week.',
];

/**
 * buttersComment(review) -> string | null
 *   review: a log row with id, rating, review and profiles. About 1 in 5 get a comment.
 */
export function buttersComment(r) {
  const rand = rng(Math.imul(r.id, 2654435761));
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const name = r.profiles?.display_name || r.profiles?.username || 'pal';
  if (BEST_FRIENDS.includes(r.profiles?.username)) {
    const low = r.rating != null && Number(r.rating) <= 2.5;
    const main = pick(low && rand() < 0.6 ? BESTIE_LOW : BESTIE);
    const parts = [rand() < 0.7 ? pick(BESTIE_OPENERS) : null, main, rand() < 0.5 ? pick(BESTIE_SIGNOFFS) : null];
    return parts.filter(Boolean).join(' ').replaceAll('{name}', name);
  }
  if (rand() >= 0.2) return null;
  const text = r.review || '';
  const rating = r.rating == null ? null : Number(r.rating);

  const pools = [];
  // Mood words only count when the stars agree ("not bad" on a 5★ review isn't a complaint).
  const fits = (mood) => !mood || rating == null || (mood === 'good' ? rating >= 3.5 : rating <= 3);
  const mention = MENTIONS.map((m) => (m.length === 3 ? m : [m[0], null, m[1]]))
    .find(([re, mood]) => fits(mood) && re.test(text));
  if (mention) pools.push(mention[2], mention[2]); // a mention is twice as likely to win
  pools.push(rating == null ? NO_RATING : rating >= 4 ? LOVED : rating >= 3 ? MIXED : HATED);
  if (text.trim().length < 40) pools.push(SHORT);
  if (text.length > 400) pools.push(LONG);

  const main = pick(pick(pools)).replaceAll('{name}', name);
  const parts = [rand() < 0.6 ? pick(INTERJECTIONS) : null, main, rand() < 0.3 ? pick(SIGNOFFS) : null];
  return parts.filter(Boolean).join(' ');
}

/**
 * Does Butters like this review? Always for his best friend; otherwise a small, fixed chance
 * (about 1 in 25) for positive reviews (4★ and up). Picked from the review id, so it never flips.
 */
export function buttersLikes(r) {
  if (!r?.review || !r.review.trim()) return false;
  if (BEST_FRIENDS.includes(r.profiles?.username)) return true;
  if (r.rating == null || Number(r.rating) < 4) return false;
  return rng(Math.imul(r.id, 40503) + 77)() < 0.04;
}
