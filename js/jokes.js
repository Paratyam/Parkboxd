// All the jokey copy in one place. Each key holds a few lines; one is picked at random.

const LINES = {
  loading: [
    'Asking Towelie where we left the data…',
    'Waiting for Cartman to get off the server…',
    'Randy is checking the Tegridy of this page…',
    'Butters is fetching it. He might get grounded.',
    'Loading… mmkay.',
    'Kenny went to get it. Kenny might not come back.',
  ],
  notFound: [
    'Oh my God, they deleted it! You bastards!',
    "This page went home. Screw you guys, it said.",
    "It's gone. Like Kenny. It'll probably be back next week.",
  ],
  diaryEmptyMine: [
    "Your diary is emptier than Kenny's family fridge. Hit \"+ Log\" up top.",
    "Nothing logged yet. Did you even watch anything, or did you just come here to read the jokes?",
    "No logs. Cartman says that's \"seriously weak\". Hit \"+ Log\" up top.",
  ],
  diaryEmptyOther: [
    "{name} hasn't logged anything. Probably grounded.",
    '{name} has watched nothing. Somebody call Mr. Mackey.',
  ],
  watchlistEmptyMine: [
    'Nothing on your watchlist. Hit "Watchlist" on any episode page and save it for later.',
    "Your watchlist is empty, mmkay. Add episodes from any episode page, mmkay.",
  ],
  watchlistEmptyOther: ['Nothing on the watchlist. Either they\'ve seen it all, or they\'re lying.'],
  ratingsEmptyMine: ["You haven't rated anything yet. Have an opinion! Everybody else on the internet does."],
  ratingsEmptyOther: ["No ratings yet. They're keeping their opinions to themselves, like a weirdo."],
  reviewsEmpty: [
    'No reviews yet. Be the first to have an opinion.',
    'Nobody has reviewed this yet. Somebody has to say something, and it might as well be you.',
    'No reviews. The silence is… suspicious.',
  ],
  commentsEmpty: ['No comments yet. Start the argument.', 'No comments. Go on, tell them they\'re wrong.'],
  activityEmpty: ['Your friends have been quiet. Suspiciously quiet.', 'No activity. Your friends are probably all at Casa Bonita.'],
  followNobody: ["You're not following anyone yet. Make some friends! Or at least follow some.", "Following nobody. Even Cartman has friends (sort of)."],
  listsEmptyMine: ["You haven't made any lists yet. \"Top 10 Butters moments\" isn't going to write itself."],
  listsEmpty: ['No lists yet. Make the first one!'],
  searchEmpty: ["Nothing matches. Screw you guys, I'm going home.", 'No results. Did you spell it like Cartman would?'],
  rankingsEmpty: ['Not enough ratings yet. Get your friends rating, or lower the minimum.'],
  allSeen: ["You've seen literally everything. Go outside. Maybe say hi to your parents."],
  noFavs: ['Rate a few episodes first. You can\'t roll from nothing, dude.'],
  wrongPassword: ['Wrong email or password. Oh my God, you killed it! You bastard!', "That password's wrong. Screw you guys… try again."],
  deleteLog: ["Delete this log? It'll be gone like Kenny, except this one won't come back next week."],
  unfollow: ["Unfollow? They won't be told. Probably.", 'Unfollow them? Cold, dude. Real cold.'],
  futureDate: ["You can't have watched it in the future. Unless you're Timmy. TIMMY!"],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** line('diaryEmptyOther', { name: 'Kyle' }) */
export function line(key, vars = {}) {
  const text = pick(LINES[key] || ['']);
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

/**
 * A reaction to a new rating, based on the episode's character tags.
 * Returns a string, or null when there's nothing funny to say.
 */
export function ratingReaction(rating, tagNames = [], favourite = null) {
  if (rating == null) return null;
  const base = baseReaction(rating, tagNames);
  // Your favourite character's episode: the site takes their side.
  if (favourite && tagNames.some((t) => t.toLowerCase() === favourite.toLowerCase())) {
    const s = rating === 1 ? '1 star' : `${rating} stars`;
    if (rating <= 2.5) return base ? `${base} And you call yourself Team ${favourite}?` : `You gave a ${favourite} episode ${s}? And you call yourself Team ${favourite}?`;
    if (rating >= 4.5) return base ? `${base} Team ${favourite} forever!` : `Team ${favourite} forever!`;
  }
  return base;
}

function baseReaction(rating, tagNames) {
  const has = (n) => tagNames.some((t) => t.toLowerCase() === n.toLowerCase());
  const s = rating === 1 ? '1 star' : `${rating} stars`;
  // Negative reactions at 2.5★ and below, positive ones at 4.5★ and above. 3–4★ stays quiet
  // (apart from Timmy, who reacts to everything).
  const low = rating <= 2.5;
  const high = rating >= 4.5;

  if (has('Kenny') && low) return `Oh my God, you rated Kenny's episode ${s}! You bastard!`;
  if (has('Kenny') && high) return "Kenny says thanks. Well, he says \"mmph mmph mmph\". Same thing.";
  if (has('Butters') && rating <= 2) return `${s} for Butters? That's it, you're GROUNDED. Check your profile.`;
  if (has('Butters') && low) return `${s}? Aw, hamburgers. Now Butters is grounded and it's your fault.`;
  if (has('Butters') && high) return 'Butters is so happy he might do the little fist-rubbing thing.';
  if (has('Cartman') && high) return 'Sweet! Kewl! Cartman respects your authoritah.';
  if (has('Cartman') && low) return 'Screw you guys, Cartman is going home.';
  if (has('Randy') && high) return 'Randy is crying tears of pure Tegridy.';
  if (has('Randy') && low) return `${s}? Randy's going to say "I thought this was America!"`;
  if (has('Kyle') && low) return `You know, I learned something today: you gave Kyle ${s}.`;
  if (has('Stan') && low) return `${s}? Dude, Stan is going to throw up. On Wendy.`;
  if ((has('Mr. Mackey') || has('Mr. Garrison')) && low) return `${s} is bad, mmkay.`;
  if (has('Towelie') && high) return "Don't forget to bring a towel!";
  if (has('Towelie') && low) return "You wanna get high? No? Then why'd you rate it like that?";
  if (has('Timmy')) return 'TIMMY!';
  if (has('Jimmy') && high) return 'What a t-t-terrific audience! Jimmy th-th-thanks you.';
  if (rating === 0.5) return "Half a star? That's pretty harsh, dude.";
  if (rating === 5 && Math.random() < 0.5) return 'Five stars. That episode just went down in history, mkay.';
  // Fence-sitters: 3 or 3.5 stars, about 1 time in 5.
  if ((rating === 3 || rating === 3.5) && Math.random() < 0.2) {
    return pick([
      `${s}. Wow, way to take a stand. Very Stan's dad of you.`,
      "Not bad, not great. You're basically a Canadian about this.",
      `${s}? That is the most Stan rating possible. Nothing stands out, dude.`,
      'Mmm, middle of the road, mmkay. Mr. Mackey approves.',
      "You're on the fence. Careful, Kyle's mom will build a wall on it.",
    ]);
  }
  return null;
}
