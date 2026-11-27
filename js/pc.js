// PC Principal's "PC it" filter: rewrites a review in his voice with word swaps, plus an opener
// and a closer. Browser only, never saved. Any review card with a [data-pc] button gets the
// toggle (installPC() listens once for the whole page).
import { esc } from './ui.js?v=20261127082653';

// [pattern, replacement]. Order matters: phrases before single words. Each replacement is only
// made of words no later rule matches, so nothing gets swapped twice.
const SWAPS = [
  // Phrases
  [/\bthe best\b/gi, 'the most woke'],
  [/\bthe worst\b/gi, 'the least inclusive'],
  [/\bi think\b/gi, 'my lived experience tells me'],
  [/\bi hated\b/gi, "I couldn't hold space for"],
  [/\bi hate\b/gi, "I can't hold space for"],
  [/\bi loved\b/gi, 'I fully supported'],
  [/\bi love\b/gi, 'I fully support'],
  [/\bi like\b/gi, 'I validate'],
  [/\bi liked\b/gi, 'I validated'],
  [/\bbad guys?\b/gi, 'people making problematic choices'],
  [/\bwent too far\b/gi, 'needed a trigger warning'],
  [/\bmakes fun of\b/gi, 'respectfully critiques'],
  [/\bmade fun of\b/gi, 'respectfully critiqued'],
  [/\bmake fun of\b/gi, 'respectfully critique'],
  [/\bbeats? up\b/gi, 'has a respectful dialogue with'],
  [/\bsucks\b/gi, "isn't holding space for anyone"],
  [/\bsucked\b/gi, "didn't hold space for anyone"],
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
  [/\bvillains?\b/gi, 'misunderstood person of conflict'],
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
  [/\b(fights?|fighting)\b/gi, 'respectful dialogue'],
  [/\bwar\b/gi, 'respectful disagreement'],
  [/\b(mid|meh|mediocre)\b/gi, 'not fully inclusive yet'],
  [/\bdisappointing\b/gi, 'a missed opportunity for growth'],
  [/\bmess\b/gi, 'safe space in progress'],
  [/\bloser\b/gi, 'person experiencing non-winning'],
  [/\bweird\b/gi, 'differently normal'],
  [/\bcringe\b/gi, 'a teachable moment'],
  [/\boverrated\b/gi, 'privileged'],
  [/\bunderrated\b/gi, 'marginalized'],
  [/\bworst\b/gi, 'least inclusive'],
  // Good things
  [/\b(funny|hilarious)\b/gi, 'problematic but valid'],
  [/\b(amazing|awesome|great|incredible)\b/gi, 'totally woke'],
  [/\b(perfect|masterpiece)\b/gi, 'fully woke-certified'],
  [/\bclassic\b/gi, 'historically significant'],
  [/\b(smart|clever|genius)\b/gi, 'enlightened'],
  [/\bcool\b/gi, 'inclusive'],
  [/\bfun\b/gi, 'affirming'],
  [/\bgood\b/gi, 'progressive'],
  [/\bbetter\b/gi, 'more progressive'],
  [/\bbest\b/gi, 'most woke'],
  [/\b(heroes)\b/gi, 'allies'],
  [/\bhero\b/gi, 'ally'],
  [/\bfriends\b/gi, 'allies'],
  // People
  [/\bguys\b/gi, 'folks'],
  [/\bguy\b/gi, 'person'],
  [/\b(kids|boys|girls)\b/gi, 'young folks'],
  [/\b(dude|man)\b/gi, 'bro'],
  [/\blol\b/gi, '(and I say that with respect)'],
  [/\bcartman\b/i, 'Cartman (who is in detention, again)'],
];

const OPENERS = ["Okay, let's unpack this.", 'Bro, check your viewing privilege.', 'Before we start: this is a safe space.', "Let's have a respectful conversation, bro."];
const CLOSERS = ["That's what I'm talking about, bro!", "Let's all be better.", 'PC Delta out. 🤜🤛', 'Respect.'];

// Small stable hash so the same review always gets the same opener and closer.
const hash = (s) => { let h = 7; for (const ch of s) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return Math.abs(h); };

export function pcify(text) {
  let out = String(text || '');
  for (const [re, to] of SWAPS) {
    // Capitalise the replacement only where it starts a sentence.
    out = out.replace(re, (m, ...rest) => {
      const at = rest[rest.length - 2];
      const start = /(^|[.!?]\s+)$/.test(out.slice(0, at));
      return start ? to[0].toUpperCase() + to.slice(1) : to;
    });
  }
  out = out.trim();
  if (out && !/[.!?)]$/.test(out)) out += '.';
  else if (out.endsWith(')') && !/[.!?]\)$/.test(out)) out += '.';
  const h = hash(text || '');
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
