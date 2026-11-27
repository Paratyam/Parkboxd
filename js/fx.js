// Little effects: rating reactions, hamburger rain, Professor Chaos mode.
import { toast } from './ui.js?v=20261127191134';
import { ratingReaction } from './jokes.js?v=20261127191134';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Show the reaction for a new rating, plus hamburger rain for 5★ Butters episodes. */
export function celebrate(rating, tagNames = [], favourite = null) {
  toast(isChaos() ? chaosReaction(rating) : ratingReaction(rating, tagNames, favourite));
  if (rating === 5 && tagNames.some((t) => t.toLowerCase() === 'butters')) burgerRain();
  if (rating != null && tagNames.some((t) => t.toLowerCase() === 'randy')) import('./rewards.js?v=20261127191134').then((m) => m.randyReward()).catch(() => {});
}

// In Professor Chaos mode every rating gets a villainous reaction.
function chaosReaction(rating) {
  if (rating == null) return null;
  if (rating === 0.5) return 'Half a star! Even General Disarray thinks that\'s harsh. I LOVE it.';
  if (rating <= 2.5) return 'Yes! Destroy it! Destroy everything!';
  if (rating <= 3.5) return 'Mediocrity… the perfect breeding ground for chaos.';
  if (rating < 5) return 'Good. GOOD. Feed the chaos.';
  return 'Excellent… everything is going according to plan.';
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
    exit: 'Go back to being Butters',
  },
  mysterion: {
    word: 'mysterion',
    logo: 'MYSTERION',
    on: 'Who is Mysterion? Nobody knows. (Type "mysterion" or hold the logo to unmask.)',
    off: 'Mysterion has vanished into the night. Nobody saw who it was. Probably Kenny.',
    exit: 'Leave Mysterion mode',
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
  // A way out that always works (typing needs a keyboard and a page without a focused text box).
  const exit = document.getElementById('mode-exit');
  if (exit) {
    exit.hidden = !mode;
    exit.textContent = mode ? `✕ ${MODES[mode].exit}` : '';
  }
}

export function initModes(onChange) {
  applyMode();

  const toggle = (mode) => {
    const wasOn = currentMode() === mode;
    localStorage.setItem(MODE_KEY, wasOn ? '' : mode);
    applyMode();
    onChange?.(currentMode());
    window.dispatchEvent(new CustomEvent('parkboxd:mode', { detail: currentMode() }));
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
  let start = null;
  document.addEventListener('pointerdown', (e) => {
    const logo = e.target.closest?.('.logo');
    if (!logo || e.button !== 0) return;
    held = false;
    start = { x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' };
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { held = true; taps = 0; start = null; clearTimeout(tapTimer); toggle('mysterion'); }, 800);
  });
  const cancelHold = () => { clearTimeout(holdTimer); start = null; };
  document.addEventListener('pointerup', cancelHold);
  // Phones fire pointercancel when they start their own long-press handling; that must not stop
  // the hold (it used to, so a hold often did nothing). A real drag away still cancels below.
  document.addEventListener('pointercancel', () => { if (!start?.touch) cancelHold(); });
  document.addEventListener('pointermove', (e) => {
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) cancelHold();
  });
  // Stop the long-press menu ("open in new tab…") and link dragging on the logo.
  document.addEventListener('contextmenu', (e) => { if (e.target.closest?.('.logo')) e.preventDefault(); });
  document.addEventListener('dragstart', (e) => { if (e.target.closest?.('.logo')) e.preventDefault(); });

  // The exit button (shown by applyMode while a mode is on).
  if (!document.getElementById('mode-exit')) {
    const exit = document.createElement('button');
    exit.type = 'button';
    exit.id = 'mode-exit';
    exit.className = 'mode-exit';
    exit.addEventListener('click', () => { if (currentMode()) toggle(currentMode()); });
    document.body.append(exit);
    applyMode();
  }

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

// ---- Coon takeover: about 1 page load in 150, The Coon "hijacks" the site ----
// Add ?coon=1 to any page URL to force it (for showing friends).

// Once The Coon takes over he stays (for this browser tab) until you click "Fine, whatever".
const COON_KEY = 'parkboxd-coon';
export function coonTakeoverDue() {
  const due = sessionStorage.getItem(COON_KEY) === '1'
    || new URLSearchParams(location.search).get('coon') === '1'
    || Math.random() < 1 / 150;
  if (due) sessionStorage.setItem(COON_KEY, '1');
  return due;
}

// While the takeover is up every rating star on screen becomes a raccoon. Looks only: saved
// ratings are untouched, and people's own writing is left alone.
const OWN_WORDS = 'textarea, script, style, [contenteditable="true"], .review-body p, .comments p, .dm-bubbles p, .pc-text';
const swapped = new Map(); // text node -> its original text
let starWatcher;

function raccoonStars(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = root.nodeType === Node.TEXT_NODE ? root : walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.includes('★') || n.parentElement?.closest(OWN_WORDS)) continue;
    swapped.set(n, n.nodeValue);
    n.nodeValue = n.nodeValue.replaceAll('★', '🦝');
  }
}

function startRaccoonStars() {
  raccoonStars(document.body);
  starWatcher = new MutationObserver((changes) => {
    for (const c of changes) {
      if (c.type === 'characterData') raccoonStars(c.target);
      else c.addedNodes.forEach(raccoonStars);
    }
  });
  starWatcher.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function stopRaccoonStars() {
  starWatcher?.disconnect();
  for (const [node, text] of swapped) node.nodeValue = text;
  swapped.clear();
}

/** Show the banner. setLogo(text) swaps the logo text while it's up (null puts it back). */
export function showCoonTakeover(setLogo) {
  const main = document.querySelector('main');
  if (!main) return;
  const banner = document.createElement('div');
  banner.className = 'coon-takeover';
  banner.setAttribute('role', 'alert');
  banner.innerHTML = `
    <div class="wrap coon-inner">
      <span class="coon-emoji" aria-hidden="true">🦝</span>
      <div>
        <div class="cut coon-title">This website is now property of The Coon.</div>
        <div class="coon-sub">Respect his authoritah. Mysterion is not invited. <a href="franchise.html" style="color:#fff;text-decoration:underline">See the franchise plan</a></div>
      </div>
      <button type="button" class="btn coon-btn">Fine, whatever</button>
    </div>`;
  main.prepend(banner);
  setLogo?.('THE COON');
  document.documentElement.classList.add('coon-takeover-on');
  startRaccoonStars();

  // The Coon renames "Friends" after himself…
  const friendsLink = [...document.querySelectorAll('.main-nav a')].find((a) => a.textContent.trim() === 'Friends');
  if (friendsLink) friendsLink.textContent = 'Coon & Friends';

  banner.querySelector('.coon-btn').addEventListener('click', () => {
    banner.remove();
    setLogo?.(null);
    document.documentElement.classList.remove('coon-takeover-on');
    stopRaccoonStars();
    sessionStorage.removeItem(COON_KEY);
    if (friendsLink) friendsLink.textContent = 'Friends';
    document.querySelectorAll('.coon-fake').forEach((el) => el.remove());
    unrigRankings();
    toast('The Coon will return. When you least expect it.');
  });

  // Members of Coon & Friends (badge holders) get VIP treatment.
  import('./coon-member.js?v=20261127191134').then(({ coonMember }) => coonMember()).then((member) => {
    if (!member || !banner.isConnected) return;
    banner.querySelector('.coon-title').textContent = `Welcome back, ${member.name}. Member of Coon & Friends.`;
    banner.querySelector('.coon-sub').innerHTML = 'You may stay. Everyone else: respect his authoritah. <a href="franchise.html" style="color:#fff;text-decoration:underline">Your spin-off is in the franchise plan</a>';
  }).catch(() => {});
}

// …and rigs the Rankings: pages with a ranked list call this after rendering.
// The Coon goes in at #1; a Coon & Friends member gets #2 as his Official Sidekick.
export async function rigRankings(root) {
  if (!document.documentElement.classList.contains('coon-takeover-on') || !root) return;
  const member = await import('./coon-member.js?v=20261127191134').then(({ coonMember }) => coonMember()).catch(() => null);
  if (!document.documentElement.classList.contains('coon-takeover-on')) return; // dismissed meanwhile

  let list = root.querySelector('.rank-table');
  if (!list) {
    list = document.createElement('ol');
    list.className = 'rank-table coon-fake';
    (root.querySelector('section') || root).append(list);
  }
  const stripes = 'background:repeating-linear-gradient(90deg,#3a3330 0 14px,#4a423d 14px 28px);display:flex;align-items:center;justify-content:center;font-size:30px';
  const rows = [`
    <span class="pos">1</span>
    <a href="franchise.html" class="thumb" aria-hidden="true" tabindex="-1"><div class="ep-thumb paper" style="${stripes}">🦝</div></a>
    <div class="info"><a href="franchise.html">The Coon (2009)</a><span>Ranked #1 by The Coon. Totally legit. See the franchise plan.</span></div>
    <div class="score"><b>∞</b><span>1 rating (his own)</span></div>`];
  if (member) {
    rows.push(`
    <span class="pos">2</span>
    <a href="franchise.html" class="thumb" aria-hidden="true" tabindex="-1"><div class="ep-thumb paper" style="${stripes}">🤝</div></a>
    <div class="info"><a href="franchise.html">${member.name.replace(/[<>&"]/g, '')}: Official Sidekick</a><span>Appointed by The Coon. Ranked just below him, where sidekicks belong.</span></div>
    <div class="score"><b>99.9</b><span>Coon-approved</span></div>`);
  }
  // Everyone else moves down to make room (put back when the takeover is dismissed).
  list.querySelectorAll('li:not(.coon-fake) .pos').forEach((p) => {
    p.dataset.realPos ??= p.textContent;
    p.textContent = String(Number(p.dataset.realPos) + rows.length);
  });
  for (const html of rows.reverse()) {
    const li = document.createElement('li');
    li.className = 'coon-fake';
    li.innerHTML = html;
    list.prepend(li);
  }
}

function unrigRankings() {
  document.querySelectorAll('.pos[data-real-pos]').forEach((p) => {
    p.textContent = p.dataset.realPos;
    delete p.dataset.realPos;
  });
}

// ---- 🧻 Towelie: Same Old Story badge holders (10+ rewatches) get a towel for every rewatch ----

export async function towelieRewatch(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { count } = await supabase.from('logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_rewatch', true);
  if ((count || 0) < 10) return;
  setTimeout(() => toast("🧻 Don't forget to bring a towel! (Same Old Story: rewatch number " + count + '.)', 5000), 400);
  if (reducedMotion()) return;
  const t = document.createElement('div');
  t.className = 'towel-float';
  t.setAttribute('aria-hidden', 'true');
  t.textContent = '🧻';
  document.body.append(t);
  setTimeout(() => t.remove(), 4200);
}
