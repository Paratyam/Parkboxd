// PC Principal's "PC it" filter: rewrites a review in his voice with word swaps, plus an opener
// and a closer. Browser only, never saved. Any review card with a [data-pc] button gets the
// toggle (installPC() listens once for the whole page).
import { esc } from './ui.js?v=20261128084148';

// [pattern, replacement]. Order matters: phrases before single words. Each replacement is only
// made of words no later rule matches, so nothing gets swapped twice. "$1" = a captured word.
const SWAPS = [
  // Phrases
  [/\bthe best\b/gi, 'the most woke'],
  [/\bthe worst\b/gi, 'the least inclusive'],
  [/\bi think\b/gi, 'my lived experience tells me'],
  [/\bin my humble opinion\b/gi, 'in my privilege-aware lived experience'],
  [/\b(in my opinion|imo|imho)\b/gi, 'in my lived experience'],
  [/\bto be frank\b/gi, 'to speak my truth'],
  [/\b(just joking|jk)\b/gi, 'just using humor responsibly'],
  [/\b(absolute|absolutely|peak|pure) cinema\b/gi, 'fully inclusive storytelling'],
  [/\bmain characters\b/gi, 'most centered voices'],
  [/\bmain character\b/gi, 'most centered voice'],
  [/\bhighly recommended\b/gi, 'fully endorsed'],
  [/\bhighly recommend\b/gi, 'fully endorse'],
  [/\bi hated\b/gi, "I couldn't hold space for"],
  [/\bi hate\b/gi, "I can't hold space for"],
  [/\bi loved\b/gi, 'I fully supported'],
  [/\bi love\b/gi, 'I fully support'],
  [/\bi liked\b/gi, 'I validated'],
  [/\bi like\b/gi, 'I validate'],
  [/\bbad guys?\b/gi, 'people making problematic choices'],
  [/\bwent too far\b/gi, 'needed a trigger warning'],
  [/\bmakes fun of\b/gi, 'respectfully critiques'],
  [/\bmade fun of\b/gi, 'respectfully critiqued'],
  [/\bmake fun of\b/gi, 'respectfully critique'],
  [/\bbeats? up\b/gi, 'has a respectful dialogue with'],
  [/\bsucks\b/gi, "isn't holding space for anyone"],
  [/\bsucked\b/gi, "didn't hold space for anyone"],
  [/\bthe goat\b/gi, 'the greatest ally of all time'],
  // Swearing
  [/\b(bastards|assholes|douchebags|dickheads)\b/gi, 'people who need sensitivity training'],
  [/\b(bastard|asshole|douchebag|dickhead)\b/gi, 'person who needs sensitivity training'],
  // Bad things
  [/\b(trash|garbage)\b/gi, 'not an inclusive viewing space'],
  [/\b(terrible|awful|horrible)\b/gi, 'deeply problematic'],
  [/\bbad\b/gi, 'problematic'],
  [/\bworse\b/gi, 'more problematic'],
  [/\bboring\b/gi, 'low-energy'],
  [/\b(stupid|dumb)\b/gi, 'intellectually non-inclusive'],
  [/\b(idiots?|morons?)\b/gi, 'uniquely-thinking individual'],
  [/\blame\b/gi, "under-energized (we don't say that word, bro)"],
  [/\b(crazy|insane)\b/gi, "wildly unexpected (we don't say that word, bro)"],
  [/\bevil\b/gi, 'ethically non-inclusive'],
  [/\b(villains?|villans?|antagonists?)\b/gi, 'misunderstood person of conflict'],
  [/\b(jerks?|bully|bullies)\b/gi, 'problematic individual'],
  [/\b(rude|cruel)\b/gi, 'non-supportive'],
  [/(?<!\b(?:i|you|we|they|to|really) )\bmean\b/gi, 'non-supportive'], // but not "I mean"
  [/\bannoying\b/gi, 'triggering'],
  [/\b(gross|disgusting)\b/gi, 'challenging to my comfort zone'],
  [/\b(offensive|edgy)\b/gi, 'in need of sensitivity training'],
  [/\b(dark|brutal|savage)\b/gi, 'trigger-warning-worthy'],
  [/\b(ugly|hideous)\b/gi, 'aesthetically diverse'],
  [/\bfat\b/gi, 'body-positive'],
  [/\bold\b/gi, 'chronologically gifted'],
  [/\bpoor\b/gi, 'economically marginalized'],
  [/\brich\b/gi, 'economically privileged'],
  [/\bmoney\b/gi, 'privilege'],
  [/\b(a|the|big|final) fight\b/gi, '$1 respectful dialogue'],
  [/\bfighting\b/gi, 'respectfully disagreeing'],
  [/\bfights\b/gi, 'respectfully disagrees with'],
  [/\bfight\b/gi, 'respectfully disagree with'],
  [/\bwar\b/gi, 'respectful disagreement'],
  [/\bfears?\b/gi, 'anxiety (which is valid)'],
  [/\bsad\b/gi, 'emotionally unvalidated'],
  [/\b(mid|meh|mediocre)\b/gi, 'not fully inclusive yet'],
  [/\bdisappointing\b/gi, 'a missed opportunity for growth'],
  [/\bmess\b/gi, 'safe space in progress'],
  [/\bloser\b/gi, 'person experiencing non-winning'],
  [/\bweird\b/gi, 'differently normal'],
  [/\bdifferent\b/gi, 'uniquely diverse'],
  [/\bcringe\b/gi, 'a teachable moment'],
  [/\b(overrated|overated)\b/gi, 'privileged'],
  [/\b(underrated|underated)\b/gi, 'marginalized'],
  [/\bworst\b/gi, 'least inclusive'],
  // Good things
  [/\b(funny|hilarious)\b/gi, 'problematic but valid'],
  [/\b(amazing|awesome|great|incredible)\b/gi, 'totally woke'],
  [/\b(perfect|masterpiece|goated)\b/gi, 'fully woke-certified'],
  [/\b(masterful|masterfull)\b/gi, 'masterfully inclusive'],
  [/\bextraordinary\b/gi, 'radically inclusive'],
  [/\b(a|an absolute|such a) classic\b/gi, '$1 historically significant work'],
  [/\bclassic\b/gi, 'historically significant'],
  [/\b(smart|clever|genius|brilliant)\b/gi, 'enlightened'],
  [/\b(beautiful|beauitful|gorgeous)\b/gi, 'aesthetically affirming'],
  [/\bpeak\b/gi, 'maximum inclusivity'],
  [/\bcinema\b/gi, 'inclusive storytelling'],
  [/\bgoat\b/gi, 'greatest ally of all time'],
  [/\bcool\b/gi, 'inclusive'],
  [/\bfun\b/gi, 'affirming'],
  [/\bhappy\b/gi, 'emotionally validated'],
  [/\bgood\b/gi, 'progressive'],
  [/\bbetter\b/gi, 'more progressive'],
  [/\bbest\b/gi, 'most woke'],
  [/\b(favorite|favourite|fave)\b/gi, 'most affirming'],
  [/\b(heroes|protagonists)\b/gi, 'allies'],
  [/\b(hero|protagonist)\b/gi, 'ally'],
  [/\bfriends\b/gi, 'allies'],
  // Feelings and opinions
  [/\benjoyed\b/gi, 'felt affirmed by'],
  [/\benjoying\b/gi, 'feeling affirmed by'],
  [/\benjoyable\b/gi, 'affirming'],
  [/\benjoy\b/gi, 'feel affirmed by'],
  [/\blaughed\b/gi, 'giggled respectfully'],
  [/\blaughing\b/gi, 'giggling respectfully'],
  [/\blaughs\b/gi, 'respectful giggles'],
  [/\blaugh\b/gi, 'giggle respectfully'],
  [/\bjoking\b/gi, 'using humor responsibly'],
  [/\bjokes\b/gi, 'humor moments'],
  [/\bjoke\b/gi, 'humor moment'],
  [/\bunironically\b/gi, 'sincerely'],
  [/\bironically\b/gi, 'with respectful irony'],
  [/\bhonestly\b/gi, 'speaking my truth'],
  [/\btruly\b/gi, 'authentically'],
  [/\bfrank\b/gi, 'radically honest'],
  [/\bhumble\b/gi, 'privilege-aware'],
  [/\bngl\b/gi, 'speaking my truth here'],
  [/\bsmh\b/gi, '(shaking my head, respectfully)'],
  [/\brecommended\b/gi, 'endorsed'],
  [/\brecommend\b/gi, 'endorse'],
  // People
  [/\bguys\b/gi, 'folks'],
  [/\bguy\b/gi, 'person'],
  [/\b(kids|boys|girls)\b/gi, 'young folks'],
  [/\b(kid|boy|girl)\b/gi, 'young person'],
  [/\bgender\b(?! identit)/gi, 'gender identity'],
  [/\b(dude|man)\b/gi, 'bro'],
  [/\blol\b/gi, '(and I say that with respect)'],
  [/\bcartman\b/gi, 'Eric'], // first names only in this school, bro
];

const OPENERS = [
  "Okay, let's unpack this.",
  'Bro, check your viewing privilege.',
  'Before we start: this is a safe space.',
  "Let's have a respectful conversation, bro.",
  'Listen up, bro. PC Principal is here to help.',
  "Whoa, whoa, whoa. Let's take a breath and reframe this.",
  'Bro! We need to talk about the language in this review.',
  "As your principal, I've taken the liberty of making this review inclusive.",
  'Okay, everybody, gather round. This is a learning moment.',
  'Trigger warning, bro: this review contains opinions.',
  "Hey, bro. I'm not mad. I'm just here to educate.",
  'PC Delta, assemble! This review needs our help.',
];
const CLOSERS = [
  "That's what I'm talking about, bro!",
  "Let's all be better.",
  'PC Delta out. 🤜🤛',
  'Respect.',
  'Now bring it in for a chest bump, bro!',
  "And that's how we do it in a progressive school, bro.",
  'Check your privilege at the door.',
  'Inclusivity is a team sport, bro.',
  'Thank you for coming to my safe space.',
  'Stay woke, bro.',
  'You just got educated, bro.',
  'PC Principal has spoken. Class dismissed.',
];

// Small stable hash so the same review always gets the same opener and closer.
const hash = (s) => { let h = 7; for (const ch of s) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return Math.abs(h); };

export function pcify(text) {
  let out = String(text || '');
  for (const [re, to] of SWAPS) {
    // Capitalise the replacement only where it starts a sentence.
    out = out.replace(re, (m, ...rest) => {
      const at = rest[rest.length - 2];
      const start = /(^|[.!?]\s+)$/.test(out.slice(0, at));
      const rep = to.replace(/\$(\d)/g, (_, k) => (rest[k - 1] || '').toLowerCase()); // "$1" = a captured word
      return start ? rep[0].toUpperCase() + rep.slice(1) : rep;
    });
  }
  out = out.trim();
  if (out && !/[.!?)]$/.test(out)) out += '.';
  else if (out.endsWith(')') && !/[.!?]\)$/.test(out)) out += '.';
  const h = hash(text || '');
  // Sprinkle in "bro": about 2 in 5 sentences (picked from each sentence's own hash, so it's the
  // same every time), and always at least one.
  let added = 0;
  out = out.replace(/([^.!?]+?)([.!?]+)(?=\s|$)/g, (m, body, punct) => {
    if (/\bbro\b/i.test(body) || body.trim().endsWith(')') || body.trim().length < 12 || /\b(Mr|Mrs|Ms|Dr|St|vs)$/i.test(body)) return m;
    if (hash(body) % 5 >= 2) return m;
    added++;
    return `${body}, bro${punct}`;
  });
  if (!added && !/\bbro\b/i.test(out)) out = out.replace(/([.!?]+)$/, ', bro$1');
  return [OPENERS[h % OPENERS.length], out, CLOSERS[(h >> 3) % CLOSERS.length]].join(' ');
}

/** The toggle button for a review card's footer. */
export const pcButtonHTML = (rating) => `<button type="button" class="link-button pc-toggle" data-pc${rating != null ? ` data-pc-rating="${esc(String(rating))}"` : ''} aria-pressed="false" title="Let PC Principal rewrite this review in his own words">✊ Let PC Principal fix it</button>`;

const PC_BY = ["PC Principal rewrote this review. You're welcome, bro.", 'PC Principal has made this review a safe space.', 'This review has been through sensitivity training with PC Principal.', 'PC Principal checked this review\'s privilege for you.'];

let installed = false;
export function installPC() {
  if (installed) return;
  installed = true;
  document.addEventListener('click', (e) => {
    const talk = e.target.closest?.('[data-pc-talk]');
    if (talk) return toggleTalk(talk);
    const b = e.target.closest?.('[data-pc]');
    if (!b) return;
    const p = b.closest('.review')?.querySelector('.review-body > p');
    if (!p) return;
    const on = b.getAttribute('aria-pressed') !== 'true';
    if (on) {
      if (p.dataset.original == null) p.dataset.original = p.textContent;
      p.textContent = pcify(p.dataset.original);
      p.classList.add('pc-text');
      // A signed header so it's obvious who did this.
      const by = document.createElement('div');
      by.className = 'pc-by';
      by.innerHTML = `<span class="pc-badge" aria-hidden="true">✊</span><span><strong>PC Principal's version</strong> ${esc(PC_BY[hash(p.dataset.original) % PC_BY.length])}</span>`;
      p.before(by);
    } else {
      p.textContent = p.dataset.original ?? p.textContent;
      p.classList.remove('pc-text');
      if (p.previousElementSibling?.classList.contains('pc-by')) p.previousElementSibling.remove();
    }
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? '↩ Undo PC Principal' : '✊ Let PC Principal fix it';
  });
}

// Character accounts (their reviews and comments) aren't rewritten: PC Principal has a word with
// that character instead.
const TALKS = {
  stan: [
    "Stan, bro, real honest stuff. If things ever start looking like crap again, my door is open.",
    "Marsh! I like how you keep it simple. Just try ending one of these with something hopeful, bro.",
    "Stan, bro, it's okay to care about things. Saying you don't is not a personality.",
    "Bro. BRO. You just shrugged through an entire opinion. We use our words in this school.",
    "Marsh, I'm hearing a lot of 'whatever' and I am not okay with it. Engage, bro.",
    "Dude is a gendered term, Stan. I'm gonna need you to think about that. Real hard.",
    "Stan, my man, you're allowed to say you liked something. Nobody's gonna take your football away.",
    "I hear you, Stan. I validate you. Now I need you to validate yourself, bro.",
    "Do we have a problem, Marsh? No? Awesome. That's what a healthy dialogue looks like.",
    "Stan, if your dad had anything to do with this opinion, I need to know immediately.",
    "That right there is some mature, low-key reflection, and I am PUMPED about it. Woo!",
    "Bro, you sound tired. We've got a wellness room. It has beanbags. Use them.",
    "Marsh, I run a safe space, and that means it's safe for you to admit you're having fun.",
    "Okay, Stan, I read it twice looking for something problematic. Nothing. I'm kinda bummed, bro.",
    "Stan, being the normal kid is cool. Just don't use 'normal' like other people aren't, mmkay? PC, bro.",
  ],
  butters: [
    "Butters, bro, I love the positivity. But you don't have to apologize for having an opinion. Your voice is valid.",
    "Butters! Being this nice is totally progressive, bro. Now go be that nice to yourself.",
    "Listen, Butters, if anybody grounds you for this, you send them to my office.",
    "BUTTERS! That is the most inclusive thing I've read all week. Up top, bro!",
    "Butters, bro, 'fellas' leaves some people out. Try 'everybody'. You're gonna crush it.",
    "I want the whole school to read this. This is what a safe space sounds like, bro.",
    "Butters, who told you that you had to be sorry? Give me a name. I just wanna have a talk.",
    "Golly is a totally acceptable word, Butters. Frankly, more students should use it.",
    "Stotch, running your own club shows real leadership. I'm so proud I might flex.",
    "Bro, you're allowed to give something less than five stars. Disagreeing is not bullying.",
    "Butters, I'm noticing you put everyone else first. That's beautiful. It's also a red flag, bro.",
    "Okay, bro, nothing offensive here. Not one thing. I checked it three times. Awesome job.",
    "Butters, your enthusiasm is a gift, and anybody who mocks it is getting two weeks of detention.",
    "You keep being you, Butters. That's not a suggestion. That's school policy now.",
    "Little man, that was heartfelt. Don't you dare let Cartman talk you out of it. PC, bro.",
  ],
  kyle: [
    "Kyle, bro, great analysis. But not everything needs to end in a lesson. Let other people learn something too.",
    "Kyle, I respect the passion. Now take a breath before you start another speech in my hallway.",
    "Bro, the reading list is awesome. Just remember that disagreeing with you isn't a hate crime, Kyle.",
    "Broflovski! Strong points. But I'm sensing a tone, and that tone is 'I'm the only one who gets it.'",
    "Bro, you learned something today. We know. Give somebody else a turn.",
    "Kyle, I love a student who thinks critically. I love it slightly less when it's about me.",
    "That's a lot of outrage for one review, bro. I should know. That's kind of my whole thing.",
    "Kyle, calling something stupid is not a critique. Unpack it. Use your inside voice.",
    "Awesome social awareness, Kyle. Have you considered joining my fraternity of progressive thinkers?",
    "Bro, check your privilege. Not everyone had time to take two pages of notes.",
    "Kyle, you and Eric need to resolve this in a mediated setting. With me. Flexing.",
    "Hey. HEY. Good argument. You didn't name-call once. Wait, let me read it again.",
    "Broflovski, being right is cool. Being right at everybody is a microaggression.",
    "I see you advocating, Kyle. I see you. Now advocate for your own nap time, bro.",
    "Kyle, this is thoughtful, nuanced and totally PC. Don't let it go to your head, bro.",
  ],
  cartman: [
    "CARTMAN! My office. NOW. That language is not okay in my school, bro.",
    "Eric, bro, I read this twice and got angrier both times. That's two weeks of detention.",
    "Oh, HELL no, Cartman. You're going to apologize, and you're going to mean it, bro.",
    "Excuse me?! Did you just post that? In MY school district? Two weeks, bro!",
    "That is a microaggression, Cartman. Actually, there's nothing micro about it.",
    "Cartman, I'm gonna need you to take about eight steps back and rethink your entire attitude.",
    "Bro. BRO. You do not get to talk like that and then ask for snacks.",
    "You think this is funny, Eric? Because I'm not laughing. I'm flexing, and it's out of anger.",
    "That's it. Sensitivity training. Saturday. Bring a pencil and a better outlook, bro.",
    "Eric, self-love is awesome. Doing it by putting everybody else down is NOT, bro.",
    "Do you have a problem with other people having opinions, Cartman? Because it sure sounds like it!",
    "I've got a whole filing cabinet with your name on it, and you just started a new drawer.",
    "Cartman, 'screw you guys' is not how we close a discussion. We close it with respect.",
    "Not okay! So not okay! You're going to write a new one, and it's going to include everyone.",
    "I want to believe you're growing, Eric. You are making it extremely hard, bro.",
  ],
  kenny: [
    "Kenny, bro, I didn't catch a single word, and that's on me. Every voice deserves to be heard, even through a parka.",
    "Mmph right back at you, Kenny. I'm proud of you for speaking your truth, bro.",
    "Kenny, I'm getting you a microphone. Nobody gets muffled in a progressive school.",
    "McCormick! I don't know what you said, but you said it with confidence. Awesome, bro.",
    "Anybody who says they can't understand you isn't trying hard enough. I'm trying SO hard.",
    "Kenny, bro, I'm gonna take that as constructive feedback until somebody tells me otherwise.",
    "Hold on. Was that a bad word? Kenny, look me in the eye and mmph that again.",
    "Your communication style is valid, little man. I'm learning it. I've got flash cards.",
    "Kenny, there's no wrong way to express yourself. Unless that was about my mustache.",
    "Bro, I ran that through a translator and it just started crying. You're powerful, Kenny.",
    "I respect the parka. It's your body, your hood, your rules. PC, bro.",
    "Mmph mmf, Kenny. Did I say that right? Please tell me I didn't just offend you.",
    "Kenny, you've got a free lunch and a free voice in this school. Use both.",
    "I'm nodding like I got all that because I support you, bro. Unconditionally.",
    "McCormick, looking out for yourself and your sister? That's alpha. That's real alpha. Respect.",
  ],
};

/** The same button, for a character's review or comment. `text` picks which message they get. */
export const pcTalkButtonHTML = (who, text) => `<button type="button" class="link-button pc-toggle" data-pc-talk="${esc(who)}" data-pc-pick="${hash(String(text || '')) % TALKS[who].length}" aria-pressed="false">✊ Hear what PC Principal has to say</button>`;

function toggleTalk(b) {
  const on = b.getAttribute('aria-pressed') !== 'true';
  if (on) {
    const box = document.createElement('div');
    box.className = 'pc-by pc-talk';
    box.setAttribute('role', 'status');
    box.innerHTML = `<span class="pc-badge" aria-hidden="true">✊</span><span><strong>PC Principal</strong> ${esc(TALKS[b.dataset.pcTalk][b.dataset.pcPick])}</span>`;
    (b.closest('.review-foot, .kyle-note-foot') || b).after(box);
    b.pcBox = box;
  } else b.pcBox?.remove();
  b.setAttribute('aria-pressed', String(on));
  b.textContent = on ? '↩ Hide PC Principal' : '✊ Hear what PC Principal has to say';
}
