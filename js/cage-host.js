// Cartman hosts the Cage Match: a hype line before each fight and a call after it.
// {a} / {b} = left / right fighter, {w} / {l} = winner / loser, {n} = a number.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fill = (s, v) => s.replace(/\{(\w)\}/g, (m, k) => (v[k] ?? m));

// ---- Before the fight ----
const INTRO = {
  champ: [
    'Ladies and gentlemen, the reigning champion {c} is in the building! Bow down, {x}!',
    "{c} defends the title. {x}, I hope your parents signed the waiver.",
    'The champ is here! {c}! And some loser called {x}. Whatever.',
    "{x} thinks it can take down {c}? That's adorable. Seriously, so adorable.",
  ],
  titans: [
    'Two five-star heavyweights! {a} versus {b}! This is the fight of the CENTURY!',
    'Oh, this is gonna get UGLY. {a} and {b}, both absolute legends. Somebody bring a mop.',
    'CLASH OF THE TITANS! {a}! {b}! I have literally never been more excited about anything!',
  ],
  mismatch: [
    "{h} versus {z}? This isn't a fight, this is a crime. I love it.",
    'Ladies and gentlemen, {z} is about to get absolutely obliterated by {h}. Get your phones out.',
    "Somebody call {z}'s mom, because {h} is about to send it home crying.",
  ],
  garbage: [
    'Oh great. {a} versus {b}. Two pieces of garbage fighting over who smells worse.',
    "I'm only hosting this one because I'm contractually obligated. {a}. {b}. Ugh.",
    'Welcome to the losers bracket! {a} and {b}, nobody paid to see you.',
  ],
  debut: [
    'Making its cage debut: {d}! Fresh meat, ladies and gentlemen!',
    'First fight ever for {d}! Let us see if it has what it takes. Spoiler: probably not.',
    "{d} is new around here. Somebody tell it the rules. Actually, don't. More fun this way.",
  ],
  general: [
    'In the red corner: {a}! In the blue corner: {b}! Let us get ready to RUMBLE!',
    "{a} versus {b}! Place your bets, people! I've got five bucks on whoever I like better.",
    'Tonight! In Cartman\'s Cage! {a} takes on {b}! Respect the ring!',
    '{a}. {b}. Only one walks out. The other one goes in the trash. Fight!',
    'Hey! Everybody shut up! {a} versus {b} is starting!',
    'It is TIME! {a} and {b} enter the cage! Nobody leave, the snacks are paid for!',
  ],
};

// ---- After the fight ----
const RESULT = {
  newChamp: [
    '👑 NEW CHAMPION!! {w} takes the belt from {o}! Oh my God, the crowd is going NUTS!',
    "👑 WE HAVE A NEW CHAMPION! {w}! {o} has been dethroned! Somebody get {o} a juice box!",
    '👑 THE BELT CHANGES HANDS! All hail {w}! {o} is crying in the parking lot!',
  ],
  defends: [
    '🏆 {w} DEFENDS THE TITLE! {l} never stood a chance! NEVER!',
    "🏆 Still the champ! {w} just made {l} look like Butters on picture day. That's going in the highlight reel.",
    '🏆 {w} remains undisputed! Next challenger, please! Preferably one with a spine.',
  ],
  upset: [
    "😱 UPSET!! {w} just beat {l}! I DID NOT SEE THAT COMING! Nobody did! I'm shook!",
    '😱 OH MY GOD! {l} goes DOWN! {w} with the shocker of the year!',
    '😱 What?! WHAT?! {w} beats {l}?! I want a recount! I want my mom!',
  ],
  streak: [
    '🔥 {w} is ON FIRE! That is {n} wins in a row! Somebody stop it! Actually, don\'t!',
    "🔥 {n} straight wins for {w}! It's a killing machine! A beautiful, beautiful killing machine!",
    '🔥 {w} makes it {n} in a row! I am this close to getting it tattooed on my arm!',
  ],
  debut: [
    '{w} wins its very first fight! What a debut! I discovered it, by the way. Me.',
    'First fight, first win for {w}! {l} just got beaten by the new kid. Embarrassing!',
  ],
  close: [
    'Split decision! {w} edges out {l}! That was closer than Kyle and his homework!',
    'By a HAIR! {w} takes it! {l} goes home with nothing but a participation trophy!',
    "Close one! {w} wins! {l} put up a fight, I'll give it that. That's all I'll give it.",
  ],
  stomp: [
    'K.O.!! {w} absolutely DESTROYED {l}! That was brutal! I loved every second!',
    'FLAWLESS VICTORY! {w} sends {l} straight to the hospital!',
    'Oh, {l} is DOWN! It is not getting up! {w} wins by total annihilation!',
  ],
  win: [
    '{w} WINS! {l}, pack your bags and go home!',
    'And the winner is... {w}! Kewl. {l}, you suck.',
    '{w} takes it! {l} goes home in shame. Screw you, {l}!',
    "{w}! Exactly who I would have picked. I'm basically a genius.",
    "{w} with the win! {l}, that was pathetic. I'm embarrassed FOR you.",
    'DING DING DING! {w} wins! {l} is out of here!',
  ],
};

// Skips, undos and the rest of Cartman's opinions.
export const HOST_SKIP = [
  "You can't decide? Booo! BOOOO! The crowd wants blood and you give them NOTHING!",
  'Skipping?! This is a CAGE MATCH, not a tea party! Fine. Next!',
  "Ugh, you're worse than Kyle at making decisions. Next fight!",
  "Wow. Chicken. Bawk bawk. Whatever. Next!",
];
export const HOST_UNDO = [
  'Hold on, hold on! The judges are reviewing the tape! ...Okay, rematch!',
  "Undo?! You can't just undo a fight! ...Oh, you can. Fine. REMATCH!",
  'Wait, the ref made a bad call! Run it back!',
];
export const HOST_WELCOME = [
  "WELCOME, ladies and gentlemen, to CARTMAN'S CAGE MATCH! Two episodes enter! One leaves! I host!",
  "Hey! Welcome back to the cage! I'm your host, Eric Cartman, and you will respect my authoritah!",
  "LADIES AND GENTLEMEN! Welcome to the most important event in South Park history! It's my show!",
];
export const HOST_FINALS = ["THE FINALS! Only the top 10 survive in here! This is the big leagues, baby!"];
export const HOST_NEW_ARENA = ['New arena! Same rules! I still win!', 'Moving the cage! Everybody grab your stuff!'];
export const HOST_RESET = ["Total reset?! Fine. Everybody's a nobody again. Just like Kyle."];
export const HOST_CROWD = ['The crowd goes wild!', 'Somebody threw a Cheesy Poof!', 'The crowd is chanting!', 'Pandemonium in the stands!', 'Ooooh!', 'Kenny just fainted in the front row!'];

/**
 * introLine({ a, b, ra, rb, champId, ids, fights })
 *   a, b: titles; ra, rb: your stars (or undefined); ids: [idA, idB]; champId: current #1;
 *   fights: Map(id -> fights so far)
 */
export function introLine({ a, b, ra, rb, ids, champId, fights }) {
  const [ia, ib] = ids;
  if (champId && (ia === champId || ib === champId)) {
    const c = ia === champId ? a : b;
    return fill(pick(INTRO.champ), { c, x: ia === champId ? b : a });
  }
  if (ra >= 4.5 && rb >= 4.5) return fill(pick(INTRO.titans), { a, b });
  if (ra != null && rb != null && Math.abs(ra - rb) >= 2.5) {
    const [h, z] = ra > rb ? [a, b] : [b, a];
    return fill(pick(INTRO.mismatch), { h, z });
  }
  if (ra != null && rb != null && ra <= 2 && rb <= 2) return fill(pick(INTRO.garbage), { a, b });
  const fa = fights.get(ia) || 0;
  const fb = fights.get(ib) || 0;
  if (!fa || !fb) return fill(pick(INTRO.debut), { d: !fa ? a : b });
  return fill(pick(INTRO.general), { a, b });
}

/**
 * resultLine({ w, l, kind, n, o })
 *   kind: newChamp | defends | upset | streak | debut | close | stomp | win
 *   n: win streak, o: the dethroned champion's title
 */
export function resultLine({ w, l, kind, n, o }) {
  return fill(pick(RESULT[kind] || RESULT.win), { w, l, n, o });
}

export const crowd = () => pick(HOST_CROWD);
export const hostPick = pick;
