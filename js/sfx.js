// Sound effects: short, quiet and original, all made in the browser (no audio files).
// Off until someone turns them on (footer or Edit profile); remembered on this device.

const KEY = 'parkboxd-sound';
const RECENT_TAP_MS = 25 * 1000; // saving and badge checks take a moment after the tap

let ctx;
let lastTap = 0;
let busy = null; // the sound playing now: { out, until, priority }

export function soundOn() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

function audio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  ctx ||= new Ctx();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}

// Browsers only allow sound after a tap, so wake the audio up on one.
for (const type of ['pointerdown', 'pointerup', 'click', 'keydown']) {
  window.addEventListener(type, (e) => {
    if (!e.isTrusted) return;
    lastTap = Date.now();
    if (soundOn()) audio();
  }, { capture: true, passive: true });
}

// A single note, optionally sliding to another pitch.
function tone(out, at, { f, to, d = 0.15, type = 'sine', v = 0.5 }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + d);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(v, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + d);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + d + 0.02);
}

// A burst of filtered noise: cymbals and whooshes.
function noise(out, at, { d, filter = 'highpass', f, to, q = 1, v = 0.4, attack = 0.005 }) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * d), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = filter;
  band.Q.value = q;
  band.frequency.setValueAtTime(f, at);
  if (to) band.frequency.exponentialRampToValueAtTime(to, at + d);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(v, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + d);
  src.connect(band).connect(g).connect(out);
  src.start(at);
}

// name: [length in seconds, recipe]
const SOUNDS = {
  // Badge unlocked: a little brass fanfare.
  fanfare: [0.9, (out, t) => {
    [[523, 0, 0.14], [659, 0.12, 0.14], [784, 0.24, 0.14], [1047, 0.38, 0.5]].forEach(([f, s, d]) => {
      tone(out, t + s, { f, d, type: 'triangle', v: 0.6 });
      tone(out, t + s, { f: f / 2, d, type: 'square', v: 0.08 });
    });
  }],
  // Hamburger rain: soft plops.
  plops: [0.9, (out, t) => {
    for (let i = 0; i < 7; i++) tone(out, t + i * 0.11 + Math.random() * 0.04, { f: 320 + Math.random() * 160, to: 90, d: 0.1, v: 0.45 });
  }],
  // Fist bump: one thud, timed to when the fists meet.
  thud: [0.8, (out, t) => {
    tone(out, t + 0.5, { f: 170, to: 45, d: 0.22, v: 0.9 });
    noise(out, t + 0.5, { d: 0.08, filter: 'lowpass', f: 900, v: 0.5 });
  }],
  // Eagle flyby: a whoosh.
  whoosh: [0.9, (out, t) => noise(out, t, { d: 0.9, filter: 'bandpass', f: 300, to: 2200, q: 1.6, v: 0.7, attack: 0.4 })],
  // Cage Match: the ring bell, struck twice.
  bell: [0.95, (out, t) => {
    for (const s of [0, 0.22]) {
      [[880, 0.4], [1320, 0.18], [2380, 0.12]].forEach(([f, v]) => tone(out, t + s, { f, d: 0.7, v }));
    }
  }],
  // Mystery solved: a rising jingle.
  jingle: [0.75, (out, t) => {
    [659, 880, 988, 1319].forEach((f, i) => tone(out, t + i * 0.11, { f, d: i === 3 ? 0.38 : 0.14, type: 'triangle', v: 0.45 }));
  }],
  // Jimmy: ba-dum-tss.
  rimshot: [0.85, (out, t) => {
    tone(out, t, { f: 220, to: 110, d: 0.13, v: 0.8 });
    tone(out, t + 0.16, { f: 160, to: 75, d: 0.15, v: 0.8 });
    noise(out, t + 0.36, { d: 0.48, f: 5500, v: 0.4 });
  }],
};

// Sounds never overlap: the first one wins, except that the fanfare cuts anything off
// and a new joke restarts the drums.
const PRIORITY = { fanfare: 2, rimshot: 1 };

/** Play a sound, if sounds are on and someone tapped recently. */
export function sfx(name) {
  if (!soundOn() || document.hidden || Date.now() - lastTap > RECENT_TAP_MS) return;
  try {
    if (!audio()) return;
    const [length, recipe] = SOUNDS[name];
    const priority = PRIORITY[name] || 0;
    const now = ctx.currentTime;
    if (busy && now < busy.until) {
      if (!priority || priority < busy.priority) return;
      busy.out.disconnect();
    }
    const out = ctx.createGain();
    out.gain.value = 0.18; // quiet
    out.connect(ctx.destination);
    recipe(out, now + 0.02);
    busy = { out, until: now + length, priority };
  } catch { /* a sound must never break the page */ }
}

/** The "Sound effects" switch. Every copy on the page stays in step. */
export function soundSwitch() {
  const label = document.createElement('label');
  label.className = 'checkbox sound-switch';
  label.innerHTML = '<input type="checkbox"><span>🔊 Sound effects</span>';
  const box = label.querySelector('input');
  box.checked = soundOn();
  box.addEventListener('change', () => {
    try { localStorage.setItem(KEY, box.checked ? '1' : '0'); } catch { /* private window */ }
    window.dispatchEvent(new Event('parkboxd:sound'));
    if (box.checked) { lastTap = Date.now(); sfx('jingle'); } // so you hear what you turned on
  });
  const sync = () => { box.checked = soundOn(); };
  window.addEventListener('parkboxd:sound', sync);
  window.addEventListener('storage', sync);
  return label;
}
