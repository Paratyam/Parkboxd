// Shared header + footer, and the session/profile check every page runs first.
import { findCharacters } from './characters.js?v=20261127201827';
import { soundSwitch } from './sfx.js?v=20261127201827';
import { supabase, isConfigured } from './supabase.js?v=20261127201827';
import { SITE_NAME } from './config.js?v=20261127201827';
import { esc, avatarHTML, currentPage, currentFile, toast } from './ui.js?v=20261127201827';
import { line } from './jokes.js?v=20261127201827';
import { initModes, modeLogo, isChaos, coonTakeoverDue, showCoonTakeover } from './fx.js?v=20261127201827';
import { pineStripSVG, busStopSVG } from './art.js?v=20261127201827';
import { addInstallButton } from './install.js?v=20261127201827';
import { captureInvite, redeemInvite } from './invite.js?v=20261127201827';
import { VERSION } from './version.js?v=20261127201827';
import { renderTabBar, followProfileTabs } from './tabbar.js?v=20261127201827';
import { startPresence } from './presence.js?v=20261127201827';

const LOGO_COLOURS = ['#3fb950', '#4a90e2', '#d63a3a', '#f5c518', '#f2711c'];
const LOGO_TILT = [-4, 3, -2, 5, -3, 2, -5, 4, -1, 3];

// Original paper-cutout tinfoil hat (Chaos mode).
const TINFOIL_HAT = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30"><path d="M3 28 L11 17 L10 14 L19 6 L22 8 L27 13 L29 18 L37 27 L30 25 L24 29 L17 25 L10 29 Z" fill="#c9d2d9" stroke="#141414" stroke-width="2" stroke-linejoin="round"/><path d="M19 6 L17 15 L22 19 L19 25 M11 17 L17 15 M29 18 L22 19" fill="none" stroke="#7c868e" stroke-width="1.5"/><path d="M20 6 L22 2" stroke="#141414" stroke-width="2"/><circle cx="23" cy="2.5" r="2" fill="#7dff4f" stroke="#141414"/></svg>')}`;

// Set ready: true as each page gets built.
const NAV = [
  { label: 'Episodes', href: 'episodes.html', ready: true },
  { label: 'Seasons', href: 'seasons.html', ready: true },
  { label: 'Book Club', href: 'club.html', ready: true },
  { label: 'Cage Match', href: 'cage.html', ready: true },
  { label: 'Mystery', href: 'mystery.html', ready: true },
  { label: 'Rankings', href: 'rankings.html', ready: true },
  { label: 'Lists', href: 'lists.html', ready: true },
  { label: 'Friends', href: 'friends.html', ready: true },
  // Seasonal: Mr. Hankey's advent calendar, December only.
  ...(new Date().getMonth() === 11 ? [{ label: '12 Days 🎄', href: 'hankey.html', ready: true }] : []),
];

const never = () => new Promise(() => {});

/**
 * Run at the top of every page.
 *   auth: 'required' sends logged-out visitors to the login page.
 *   needsUsername: false on pages that must work before a username exists.
 * Resolves to { session, user, profile }.
 */
export async function initPage({ title = '', auth = 'optional', needsUsername = true } = {}) {
  checkVersion(); // runs in the background; reloads once if the server has a newer version
  document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  // Swap plain "Loading…" placeholders for something in character.
  document.querySelectorAll('[aria-busy="true"] .empty').forEach((el) => { el.textContent = line('loading'); });

  const { data: { session } } = await supabase.auth.getSession();
  let profile = null;
  if (session) {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    profile = data;
  }

  captureInvite(session);
  if (auth === 'required' && !session) {
    location.replace(`login.html?next=${encodeURIComponent(currentPage())}`);
    return never();
  }
  if (session && needsUsername && profile && !profile.username) {
    location.replace(`username.html?next=${encodeURIComponent(currentPage())}`);
    return never();
  }

  renderHeader(profile, session);
  redeemInvite(session, profile).catch(() => {}); // runs in the background
  if (session && profile?.username) startPresence(session.user.id);
  // Mysterion mode masks everyone's identity except yours; Chaos mode gives you a tinfoil hat.
  if (profile?.username && /^[a-z0-9_]+$/.test(profile.username)) {
    const me = profile.username;
    const style = document.createElement('style');
    style.textContent = `
      html.mysterion .avatar[data-u="${me}"] { color: var(--c); }
      html.mysterion .avatar[data-u="${me}"]::after { content: none; }
      html.mysterion a[href="profile.html?u=${me}"]:not(.is-me) { filter: none; }
      html.mysterion .people li:not(:has(a[href="profile.html?u=${me}"])) .who > span { filter: blur(5px); }
      html.chaos .avatar[data-u="${me}"] { position: relative; }
      html.chaos .avatar[data-u="${me}"]::before { content: ''; position: absolute; left: 50%; bottom: 72%; width: calc(var(--size) * .85); height: calc(var(--size) * .62); transform: translateX(-50%) rotate(-9deg); background: url("${TINFOIL_HAT}") center bottom / contain no-repeat; pointer-events: none; z-index: 2; }`;
    document.head.append(style);
  }
  initModes(() => { const logo = document.querySelector('.logo'); if (logo) logo.innerHTML = logoHTML(); syncDice(); });
  if (coonTakeoverDue()) {
    showCoonTakeover((text) => { const logo = document.querySelector('.logo'); if (logo) logo.innerHTML = logoHTML(22, text); });
  }
  renderFooter(session);
  decorateBigMessages();
  if (session && profile?.username) renderTabBar({ current: currentFile(), onLog: () => logEpisode() });
  followProfileTabs();
  // Badge flair (gold rings, Critic tags, 🌶️) is decoration: load it after the page, never block on it.
  if (session) import('./flair.js?v=20261127201827').then((m) => m.startFlair()).catch(() => {});
  if (session && profile?.username) import('./unlocks.js?v=20261127201827').then((m) => m.startUnlocks(profile)).catch(() => {});
  if (!isConfigured) showConfigWarning();

  return { session, user: session?.user ?? null, profile };
}

export function logoHTML(size = 22, text = null) {
  // A takeover or secret mode can rename the logo (THE COON, CHAOS, MYSTERION).
  return (text || modeLogo() || SITE_NAME.toUpperCase()).split('').map((ch, i) => ch === ' '
    ? '<span style="display:inline-block;width:8px" aria-hidden="true"></span>'
    : `<span class="logo-letter cut paper" style="background-color:${LOGO_COLOURS[i % 5]};transform:rotate(${LOGO_TILT[i % 10]}deg);font-size:${size}px">${esc(ch)}</span>`
  ).join('');
}

function renderHeader(profile, session) {
  const el = document.getElementById('site-header');
  if (!el) return;
  const here = currentFile();

  const nav = NAV.map((n) => n.ready
    ? `<a href="${n.href}"${here === n.href ? ' aria-current="page"' : ''}>${n.label}</a>`
    : `<span class="nav-soon" title="Coming soon">${n.label}</span>`
  ).join('');

  let right;
  if (session && profile) {
    const me = profile.username ? `profile.html?u=${encodeURIComponent(profile.username)}` : 'username.html';
    right = `
      <form class="header-search" role="search" action="episodes.html">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        <label class="visually-hidden" for="header-q">Search episodes</label>
        <input type="search" id="header-q" name="q" placeholder="Search episodes, plots, people" autocomplete="off">
      </form>
      <a class="icon-btn bell" id="header-bell" href="notifications.html" aria-label="Notifications" title="Notifications"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span class="bell-count" hidden></span></a>
      <a class="icon-btn bell mail-btn" id="header-mail" href="messages.html" aria-label="Messages" title="Messages"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg><span class="bell-count" hidden></span></a>
      <button type="button" class="icon-btn" id="header-random" aria-label="Random episode" title="Random episode">🎲</button>
      <button type="button" class="btn btn-green" id="header-log">+ Log</button>
      ${profile.is_admin ? `<a class="header-link admin-link" href="admin.html">Admin</a>` : ''}
      <a class="avatar-link" href="${me}" aria-label="Your profile">${avatarHTML(profile, 40)}</a>`;
  } else {
    right = `
      <a class="header-link" href="login.html">Log in</a>
      <a class="btn btn-green" href="login.html?mode=signup">Sign up</a>`;
  }

  // On phones the nav folds into a ☰ panel, with search, random and admin moved inside it.
  const mobileExtras = session && profile ? `
    <form class="header-search nav-mobile-only" role="search" action="episodes.html">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
      <label class="visually-hidden" for="menu-q">Search</label>
      <input type="search" id="menu-q" name="q" placeholder="Search episodes, plots, people" autocomplete="off">
    </form>` : '';
  const mobileLinks = session && profile ? `
    <button type="button" class="nav-mobile-only link-button nav-random">🎲 Random episode</button>
    <a class="nav-mobile-only" href="messages.html" id="menu-mail">✉️ Messages<span class="menu-count" hidden></span></a>
    ${profile.is_admin ? '<a class="nav-mobile-only" href="admin.html">Admin</a>' : ''}` : '';

  el.innerHTML = `
    <div class="wrap header-inner">
      <a class="logo" href="index.html" aria-label="${esc(SITE_NAME)} home">${logoHTML()}</a>
      <nav class="main-nav" id="main-nav" aria-label="Main">${mobileExtras}${nav}${mobileLinks}</nav>
      <div class="header-right">${right}</div>
      <button type="button" class="menu-toggle icon-btn" aria-expanded="false" aria-controls="main-nav" aria-label="Menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </div>`;
  const toggle = el.querySelector('.menu-toggle');
  toggle.addEventListener('click', () => {
    const open = el.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  el.querySelector('.nav-random')?.addEventListener('click', () => el.querySelector('#header-random')?.click());

  el.querySelector('#header-log')?.addEventListener('click', () => logEpisode());
  el.querySelector('#header-random')?.addEventListener('click', async () => {
    const r = await import('./random.js?v=20261127201827');
    if (isChaos()) r.rollWorst((m) => toast(m)); else r.openRandomPicker();
  });
  syncDice();
  el.querySelectorAll(".header-search").forEach(wireSearch);
  if (session) { refreshBell(); refreshMail(); }
}

/**
 * Open the log dialog. When something is saved, fires a "parkboxd:logged"
 * event on window so the current page can refresh itself.
 */
export async function logEpisode(opts = {}) {
  const { openLogModal } = await import('./log-modal.js?v=20261127201827');
  const changed = await openLogModal(opts);
  if (changed) window.dispatchEvent(new CustomEvent('parkboxd:logged'));
  return changed;
}

function renderFooter(session) {
  const el = document.getElementById('site-footer');
  if (!el) return;
  el.innerHTML = `
    <div class="footer-art">${pineStripSVG()}</div>
    <div class="wrap footer-inner">
      <span>Episode data from <a href="https://www.themoviedb.org/" rel="noopener">TMDB</a>.
        This product uses the TMDB API but is not endorsed or certified by TMDB.
        Fan project, not affiliated with South Park Studios.
        All ratings on this site, even those based on real opinions, are entirely fictional and probably wrong.</span>
      ${session ? `<button type="button" class="link-button" id="logout">Screw you guys, I'm logging out</button>` : ''}
    </div>`;
  el.querySelector('.footer-inner').append(soundSwitch());
  addInstallButton(el.querySelector('.footer-inner'));
  el.querySelector('#logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.href = 'index.html';
  });
}

function showConfigWarning() {
  const main = document.querySelector('main');
  if (!main) return;
  const div = document.createElement('div');
  div.className = 'notice notice-error wrap';
  div.textContent = 'Supabase isn\'t set up yet: fill in SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js.';
  main.prepend(div);
}

// Unread notifications count on the header bell. Exported so the notifications page can reset it.
export async function refreshBell() {
  const bell = document.getElementById('header-bell');
  if (!bell) return;
  const [{ count: dbCount }, { data: { user } }] = await Promise.all([
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
    supabase.auth.getUser(),
  ]);
  // Plus unread Book Club notes (new book, vote result), worked out in the browser.
  const club = await import('./club-notes.js?v=20261127201827').then((m) => m.clubNotes(user?.id)).catch(() => []);
  const count = (dbCount || 0) + club.filter((n) => !n.read).length;
  const badge = bell.querySelector('.bell-count');
  badge.hidden = !count;
  badge.textContent = count > 9 ? '9+' : String(count || '');
  bell.setAttribute('aria-label', count ? `Notifications, ${count} unread` : 'Notifications');
}

// In Professor Chaos mode the dice turn evil: they make you rewatch your worst-rated episodes.
function syncDice() {
  const b = document.getElementById('header-random');
  if (!b) return;
  const evil = isChaos();
  b.textContent = evil ? '😈' : '🎲';
  b.title = evil ? 'Unleash chaos: rewatch one of your worst-rated episodes' : 'Random episode';
  b.setAttribute('aria-label', evil ? 'Unleash chaos' : 'Random episode');
}

// "Nothing here" pages (.big-message) get a little paper bus stop sign, whenever they appear.
function decorateBigMessages() {
  const add = () => document.querySelectorAll('.big-message:not([data-art])').forEach((el) => {
    el.dataset.art = '1';
    el.insertAdjacentHTML('afterbegin', `<div class="big-message-art">${busStopSVG()}</div>`);
  });
  add();
  new MutationObserver(add).observe(document.body, { childList: true, subtree: true });
}

// Stale-cache guard: GitHub Pages lets browsers keep files for 10 minutes. If the server's
// version.json is newer than the code running now, reload once with ?v= so every file is fresh.
async function checkVersion() {
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { v } = await res.json();
    if (!v || v === VERSION || sessionStorage.getItem('parkboxd-reloaded-for') === v) return;
    sessionStorage.setItem('parkboxd-reloaded-for', v);
    const url = new URL(location.href);
    url.searchParams.set('v', v);
    location.replace(url.href);
  } catch { /* offline or blocked: keep going with what we have */ }
}

// Header search: a live dropdown with matching people and episodes. Enter still opens the
// full episode search (episodes.html?q=).
function wireSearch(form) {
  const input = form.querySelector('input[type="search"]');
  if (!input) return;
  form.style.position = 'relative';
  const pop = document.createElement('div');
  pop.className = 'search-pop';
  pop.hidden = true;
  form.append(pop);
  let seq = 0;
  const close = () => { pop.hidden = true; };
  // Nobody guesses you can search by plot, so say it: rotating "Try …" placeholders, and a
  // hint with tappable examples when the box is focused but empty.
  const TRY = ["theme park", "nascar", "kenny dies", "cartman eats chili", "weed farm", "jesus boxing", "world of warcraft"];
  const basePlaceholder = input.placeholder;
  let tick = 0;
  setInterval(() => {
    if (document.activeElement === input || input.value) return;
    tick = (tick + 1) % (TRY.length + 1);
    input.placeholder = tick ? `Try “${TRY[tick - 1]}”` : basePlaceholder;
  }, 3000);
  const showHint = () => {
    seq++;
    const picks = [...TRY].sort(() => Math.random() - 0.5).slice(0, 4);
    pop.innerHTML = `<div class="search-pop-hint"><strong>Can't remember the title?</strong> Describe what happened.</div>
      <div class="search-pop-try">${picks.map((t) => `<button type="button" class="chip" data-try="${esc(t)}">${esc(t)}</button>`).join('')}</div>`;
    pop.hidden = false;
  };
  input.addEventListener('focus', () => { if (!input.value.trim()) showHint(); });
  pop.addEventListener('click', (e) => {
    const b = e.target.closest('[data-try]');
    if (!b) return;
    input.value = b.dataset.try;
    input.focus();
    input.dispatchEvent(new Event('input'));
  });
  input.addEventListener('input', async () => {
    const q = input.value.trim();
    const mine = ++seq;
    if (!q) return showHint();
    if (q.length < 2) return close();
    const safe = q.replace(/[^\p{L}\p{N} _-]/gu, '');
    const [{ data: people }, { loadAllEpisodes, seasonCode, matchesCode }, { searchEpisodes, snippetHTML }] = await Promise.all([
      safe ? supabase.from('profiles').select('username, display_name, avatar_color, avatar_icon')
        .not('username', 'is', null).or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`).limit(5) : Promise.resolve({ data: [] }),
      import('./episodes.js?v=20261127201827'),
      import('./search.js?v=20261127201827'),
    ]);
    // "S15" lists the whole season (plus a link to its page), "S15E3" that one episode.
    // Anything else: title matches, then "what happened" matches from the plot summaries.
    const code = seasonCode(q);
    const all = await loadAllEpisodes();
    const hits = code ? [] : searchEpisodes(all, q);
    const titleHits = hits.filter((h) => h.inTitle).slice(0, 5);
    const plotHits = hits.filter((h) => !h.inTitle).slice(0, titleHits.length ? 4 : 6);
    const eps = code ? all.filter((e) => matchesCode(e, code)) : titleHits.map((h) => h.ep);
    const epItem = (e, extra = '') => `
        <a class="search-pop-item" href="episode.html?id=${e.id}"><span class="search-pop-code">${esc(e.kind === 'episode' ? `S${e.season} E${e.number}` : e.kind)}</span><span>${esc(e.title)}${extra}</span></a>`;
    if (mine !== seq) return; // a newer keystroke won
    const found = [...findCharacters(safe), ...(people || [])];
    pop.innerHTML = `
      ${code && code.number == null && eps.length ? `<a class="search-pop-item search-pop-season" href="seasons.html?s=${code.season}"><span class="search-pop-code">📺</span><span><strong>Season ${code.season}</strong> <small>${eps.length} episodes · open the season page</small></span></a>` : ''}
      ${found.length ? `<div class="search-pop-head">People</div>${found.map((p) => `
        <a class="search-pop-item" href="profile.html?u=${encodeURIComponent(p.username)}">${avatarHTML(p, 26)}<span><strong>${esc(p.display_name || p.username)}</strong> <small>@${esc(p.username)}</small></span></a>`).join('')}` : ''}
      ${eps.length ? `<div class="search-pop-head">Episodes</div>${eps.map((e) => epItem(e)).join('')}` : ''}
      ${plotHits.length ? `<div class="search-pop-head">What happened</div>${plotHits.map((h) => epItem(h.ep, `<small class="search-pop-snippet">${snippetHTML(h, 110)}</small>`)).join('')}` : ''}
      ${!found.length && !eps.length && !plotHits.length ? '<div class="search-pop-empty">Nothing found. Not even Kenny.</div>' : ''}
      <button type="submit" class="search-pop-all">See all episode results for “${esc(q)}”</button>`;
    pop.hidden = false;
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); input.blur(); } });
  document.addEventListener('click', (e) => { if (!form.contains(e.target)) close(); });
}

// Unread direct messages: a count on the ✉️ header button and in the phone menu.
export async function refreshMail() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('read', false);
  const n = count || 0;
  for (const el of [document.querySelector('#header-mail .bell-count'), document.querySelector('#menu-mail .menu-count')]) {
    if (!el) continue;
    el.hidden = !n;
    el.textContent = n > 9 ? '9+' : String(n || '');
  }
  document.getElementById('header-mail')?.setAttribute('aria-label', n ? `Messages, ${n} unread` : 'Messages');
}
