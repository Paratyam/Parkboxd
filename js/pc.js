// PC Principal's "PC it" filter: rewrites a review in his voice with word swaps, plus an opener,
// a closer and a verdict from the star rating. Browser only, never saved. Any review card with a
// [data-pc] button gets the toggle (installPC() listens once for the whole page).
import { esc } from './ui.js?v=20261127081050';

// [pattern, replacement]. Order matters: longer phrases first. "$c" keeps a capital first letter.
const SWAPS = [
  [/\bthe best\b/gi, 'the most woke'],
  [/\bthe worst\b/gi, 'the least inclusive'],
  [/\bi think\b/gi, 'my lived experience tells me'],
  [/\bi hated\b/gi, "I couldn't hold space for"],
  [/\bi hate\b/gi, "I can't hold space for"],
  [/\bi loved\b/gi, 'I fully supported'],
  [/\bi love\b/gi, 'I fully support'],
  [/\b(trash|garbage)\b/gi, 'not an inclusive viewing space'],
  [/\b(terrible|awful|horrible)\b/gi, 'deeply problematic'],
  [/\bbad\b/gi, 'problematic'],
  [/\bboring\b/gi, 'low-energy, bro'],
  [/\b(stupid|dumb)\b/gi, 'intellectually non-inclusive'],
  [/\b(funny|hilarious)\b/gi, 'problematic but valid'],
  [/\b(amazing|awesome|great)\b/gi, 'totally woke'],
  [/\bgood\b/gi, 'progressive'],
  [/\bbest\b/gi, 'most woke'],
  [/\bworst\b/gi, 'least inclusive'],
  [/\boverrated\b/gi, 'privileged'],
  [/\bunderrated\b/gi, 'marginalized'],
  [/\bcringe\b/gi, 'a teachable moment'],
  [/\b(crazy|insane)\b/gi, "wildly unexpected (we don't say that word, bro)"],
  [/\bweird\b/gi, 'differently normal'],
  [/\bguys\b/gi, 'folks'],
  [/\b(dude|man)\b/gi, 'bro'],
  [/\blol\b/gi, '(and I say that with respect)'],
  [/\bcartman\b/i, 'Cartman (who is in detention, again)'],
];

const OPENERS = ["Okay, let's unpack this.", 'Bro, check your viewing privilege.', 'Before we start: this is a safe space.', "Let's have a respectful conversation, bro."];
const CLOSERS = ["That's what I'm talking about, bro!", "Let's all be better.", 'PC Delta out. 🤜🤛', 'Respect.'];

const verdict = (r) => {
  if (r == null || Number.isNaN(r)) return '';
  if (r >= 5) return 'Verdict: fully woke-certified.';
  if (r >= 4) return 'Verdict: approved by the PC Delta fraternity.';
  if (r >= 3) return 'Verdict: needs a little sensitivity training.';
  return 'Verdict: this episode is in detention, bro.';
};

// Small stable hash so the same review always gets the same opener and closer.
const hash = (s) => { let h = 7; for (const ch of s) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return Math.abs(h); };

export function pcify(text, rating) {
  let out = String(text || '');
  for (const [re, to] of SWAPS) {
    out = out.replace(re, (m) => (m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? to[0].toUpperCase() + to.slice(1) : to));
  }
  const h = hash(text || '');
  return [OPENERS[h % OPENERS.length], out.trim(), verdict(rating == null ? null : Number(rating)), CLOSERS[(h >> 3) % CLOSERS.length]].filter(Boolean).join(' ');
}

/** The toggle button for a review card's footer. */
export const pcButtonHTML = (rating) => `<button type="button" class="link-button pc-toggle" data-pc${rating != null ? ` data-pc-rating="${esc(String(rating))}"` : ''} aria-pressed="false" title="Rewrite this review in PC Principal's voice">✊ PC it</button>`;

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
      p.textContent = pcify(p.dataset.original, b.dataset.pcRating);
      p.classList.add('pc-text');
    } else {
      p.textContent = p.dataset.original ?? p.textContent;
      p.classList.remove('pc-text');
    }
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? '↩ Original' : '✊ PC it';
  });
}
