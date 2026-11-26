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

// ---- Professor Chaos mode (type "chaos" anywhere) ----

const CHAOS_KEY = 'parkboxd-chaos';
export const isChaos = () => localStorage.getItem(CHAOS_KEY) === '1';

export function applyChaos() {
  document.documentElement.classList.toggle('chaos', isChaos());
}

export function initChaos(onToggle) {
  applyChaos();
  let typed = '';
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.closest?.('input, textarea, select, [contenteditable="true"]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-5);
    if (typed !== 'chaos') return;
    typed = '';
    const on = !isChaos();
    localStorage.setItem(CHAOS_KEY, on ? '1' : '0');
    applyChaos();
    onToggle?.(on);
    toast(on
      ? 'I am Professor Chaos! Bringer of destruction and doom! (Type "chaos" again to go back to being Butters.)'
      : 'Professor Chaos has been grounded. Back to normal, fellas.');
  });
}
