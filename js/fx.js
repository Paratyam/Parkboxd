// Little effects: rating reactions, hamburger rain, Professor Chaos mode.
import { toast } from './ui.js';
import { ratingReaction } from './jokes.js';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Show the reaction for a new rating, plus hamburger rain for 5★ Butters episodes. */
export function celebrate(rating, tagNames = [], favourite = null) {
  toast(ratingReaction(rating, tagNames, favourite));
  if (rating === 5 && tagNames.some((t) => t.toLowerCase() === 'butters')) burgerRain();
}

// ---- 🍔 Hamburger rain ----

export function burgerRain(count = 36) {
  if (reducedMotion()) return;
  const layer = document.createElement('div');
  layer.className = 'burger-rain';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const b = document.createElement('span');
    b.textContent = '🍔';
    b.style.left = `${Math.random() * 100}%`;
    b.style.fontSize = `${22 + Math.random() * 26}px`;
    b.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
    b.style.animationDelay = `${Math.random() * 0.8}s`;
    b.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    layer.append(b);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 3500);
}

// ---- Secret modes: Professor Chaos (villain) and Mysterion (hero) ----
// Type the name anywhere (not in a text box). On phones: tap the logo 5 times for Chaos,
// press and hold it for Mysterion. Only one mode at a time; the choice is remembered.

const MODE_KEY = 'parkboxd-mode';
const MODES = {
  chaos: {
    word: 'chaos',
    logo: 'CHAOS',
    on: 'I am Professor Chaos! Bringer of destruction and doom! (Type "chaos" or tap the logo 5 times to go back to being Butters.)',
    off: 'Professor Chaos has been grounded. Back to normal, fellas.',
  },
  mysterion: {
    word: 'mysterion',
    logo: 'MYSTERION',
    on: 'Who is Mysterion? Nobody knows. (Type "mysterion" or hold the logo to unmask.)',
    off: 'Mysterion has vanished into the night. Nobody saw who it was. Probably Kenny.',
  },
};

// Older versions stored Chaos mode under its own key.
if (localStorage.getItem('parkboxd-chaos') === '1' && !localStorage.getItem(MODE_KEY)) localStorage.setItem(MODE_KEY, 'chaos');
localStorage.removeItem('parkboxd-chaos');

export const currentMode = () => (MODES[localStorage.getItem(MODE_KEY)] ? localStorage.getItem(MODE_KEY) : '');
export const isChaos = () => currentMode() === 'chaos';
/** The logo text for the current mode, or null for the normal logo. */
export const modeLogo = () => MODES[currentMode()]?.logo ?? null;

export function applyMode() {
  const mode = currentMode();
  for (const m of Object.keys(MODES)) document.documentElement.classList.toggle(m, m === mode);
}

export function initModes(onChange) {
  applyMode();

  const toggle = (mode) => {
    const wasOn = currentMode() === mode;
    localStorage.setItem(MODE_KEY, wasOn ? '' : mode);
    applyMode();
    onChange?.(currentMode());
    toast(wasOn ? MODES[mode].off : MODES[mode].on);
  };

  // Keyboard: uses the physical key (e.code), so it works with any keyboard language.
  let typed = '';
  const longest = Math.max(...Object.values(MODES).map((m) => m.word.length));
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.closest?.('input, textarea, select, [contenteditable="true"]') || e.ctrlKey || e.metaKey || e.altKey) return;
    const ch = e.code?.startsWith('Key') ? e.code.slice(3).toLowerCase() : (e.key?.length === 1 ? e.key.toLowerCase() : '');
    if (!ch) return;
    typed = (typed + ch).slice(-longest);
    const hit = Object.keys(MODES).find((m) => typed.endsWith(MODES[m].word));
    if (!hit) return;
    typed = '';
    toggle(hit);
  });

  // Phones. Tap the logo 5 times = Chaos. Press and hold it (0.8s) = Mysterion.
  // A single tap still goes home, just a moment later, so the gestures have time to start.
  let taps = 0;
  let tapTimer;
  let holdTimer;
  let held = false;
  document.addEventListener('pointerdown', (e) => {
    const logo = e.target.closest?.('.logo');
    if (!logo || e.button !== 0) return;
    held = false;
    holdTimer = setTimeout(() => { held = true; taps = 0; clearTimeout(tapTimer); toggle('mysterion'); }, 800);
  });
  const cancelHold = () => clearTimeout(holdTimer);
  document.addEventListener('pointerup', cancelHold);
  document.addEventListener('pointercancel', cancelHold);
  document.addEventListener('pointermove', (e) => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) cancelHold(); });
  // Stop the long-press menu ("open in new tab…") from popping up over the logo.
  document.addEventListener('contextmenu', (e) => { if (e.target.closest?.('.logo')) e.preventDefault(); });

  document.addEventListener('click', (e) => {
    const logo = e.target.closest?.('.logo');
    if (!logo || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (held) { held = false; return; } // that "click" was the end of a long press
    clearTimeout(tapTimer);
    taps++;
    if (taps >= 5) {
      taps = 0;
      toggle('chaos');
      return;
    }
    tapTimer = setTimeout(() => {
      if (taps === 1) location.href = logo.href; // it really was just one tap
      taps = 0;
    }, 350);
  });
}
