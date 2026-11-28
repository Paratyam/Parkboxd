// Animations some badge holders get. Original paper-cutout art.
import { sfx } from './sfx.js?v=20261128085740';
import { toast } from './ui.js?v=20261128085740';
import { iHave } from './flair.js?v=20261128085740';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const S = 'stroke="#141414" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

// A fist coming in from the left; the right one is this one mirrored, in another colour.
const fist = (sleeve, skin) => `<svg viewBox="0 0 100 80" aria-hidden="true" focusable="false">
  <rect x="2" y="22" width="34" height="40" rx="4" fill="${sleeve}" ${S}/>
  <path d="M36 20 H72 Q92 20 92 36 V52 Q92 66 74 66 H36 Z" fill="${skin}" ${S}/>
  <path d="M74 32 H90 M74 43 H92 M74 54 H90 M44 24 Q60 30 56 44" fill="none" ${S}/></svg>`;

const BURST = `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 2 L60 30 L88 14 L74 42 L98 52 L72 62 L86 90 L58 74 L50 98 L40 72 L12 88 L28 60 L2 50 L28 40 L14 12 L42 28 Z" fill="#f5c518" ${S}/></svg>`;

const EAGLE = `<svg viewBox="0 0 200 110" aria-hidden="true" focusable="false">
  <g class="eagle-wing"><path d="M92 56 L66 12 L56 24 L48 8 L40 24 L28 14 L28 34 L12 30 L24 48 L10 52 L42 66 L82 74 Z" fill="#6b4226" ${S}/></g>
  <path d="M52 72 L14 66 L24 78 L10 86 L28 88 L22 100 L62 84 Z" fill="#f4f8fb" ${S}/>
  <ellipse cx="94" cy="70" rx="52" ry="24" fill="#8a5a3b" ${S}/>
  <path d="M124 52 Q132 28 154 30 Q170 32 170 48 Q168 66 146 72 L134 64 Z" fill="#f4f8fb" ${S}/>
  <path d="M166 42 Q192 42 192 56 Q190 66 184 66 Q184 56 166 56 Z" fill="#f5c518" ${S}/>
  <circle cx="156" cy="44" r="3.5" fill="#141414"/>
  <path d="M147 36 L164 40" fill="none" ${S}/>
  <path d="M86 92 L82 104 M104 92 L108 104" stroke="#f5c518" stroke-width="6" stroke-linecap="round"/>
  <g class="eagle-wing"><path d="M108 62 L96 18 L86 28 L78 12 L72 30 L60 24 L62 44 L50 44 L66 62 L84 72 Z" fill="#a8744c" ${S}/></g></svg>`;

function play(className, html, ms) {
  if (reducedMotion()) return;
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = html;
  document.body.append(el);
  setTimeout(() => el.remove(), ms);
}

/** 🤝 Super Best Friends: a fist bump when you follow someone. */
export async function followReward() {
  if (!await iHave('friends')) return;
  toast('🤜🤛 Super best friends!');
  sfx('thud');
  play('fist-bump', `<span class="fist-left">${fist('#4a90e2', '#f5c9a0')}</span><span class="fist-burst">${BURST}</span><span class="fist-right">${fist('#3fb950', '#c8935f')}</span>`, 1900);
}

/** 🦅 I Thought This Was America: an eagle flies past when you rate a Randy episode. */
export async function randyReward() {
  if (!await iHave('tegridy')) return;
  sfx('whoosh');
  play('eagle-flyby', EAGLE, 3600);
}
