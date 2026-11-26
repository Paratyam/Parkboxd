// Shared header + footer, and the session/profile check every page runs first.
import { supabase, isConfigured } from './supabase.js';
import { SITE_NAME } from './config.js';
import { esc, avatarHTML, currentPage, toast } from './ui.js';
import { line } from './jokes.js';
import { initModes, modeLogo, isChaos, coonTakeoverDue, showCoonTakeover } from './fx.js';

const LOGO_COLOURS = ['#3fb950', '#4a90e2', '#d63a3a', '#f5c518', '#f2711c'];
const LOGO_TILT = [-4, 3, -2, 5, -3, 2, -5, 4, -1, 3];

// Set ready: true as each page gets built.
const NAV = [
  { label: 'Episodes', href: 'episodes.html', ready: true },
  { label: 'Seasons', href: 'seasons.html', ready: true },
  { label: 'Book Club', href: 'club.html', ready: true },
  { label: 'Cage Match', href: 'cage.html', ready: true },
  { label: 'Rankings', href: 'rankings.html', ready: true },
  { label: 'Lists', href: 'lists.html', ready: true },
  { label: 'Friends', href: 'friends.html', ready: true },
];

const never = () => new Promise(() => {});

/**
 * Run at the top of every page.
 *   auth: 'required' sends logged-out visitors to the login page.
 *   needsUsername: false on pages that must work before a username exists.
 * Resolves to { session, user, profile }.
 */
export async function initPage({ title = '', auth = 'optional', needsUsername = true } = {}) {
  document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  // Swap plain "Loading…" placeholders for something in character.
  document.querySelectorAll('[aria-busy="true"] .empty').forEach((el) => { el.textContent = line('loading'); });

  const { data: { session } } = await supabase.auth.getSession();
  let profile = null;
  if (session) {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    profile = data;
  }

  if (auth === 'required' && !session) {
    location.replace(`login.html?next=${encodeURIComponent(currentPage())}`);
    return never();
  }
  if (session && needsUsername && profile && !profile.username) {
    location.replace(`username.html?next=${encodeURIComponent(currentPage())}`);
    return never();
  }

  renderHeader(profile, session);
  // Mysterion mode masks everyone's identity except yours.
  if (profile?.username && /^[a-z0-9_]+$/.test(profile.username)) {
    const me = profile.username;
    const style = document.createElement('style');
    style.textContent = `
      html.mysterion .avatar[data-u="${me}"] { color: var(--c); }
      html.mysterion .avatar[data-u="${me}"]::after { content: none; }
      html.mysterion a[href="profile.html?u=${me}"]:not(.is-me) { filter: none; }
      html.mysterion .people li:not(:has(a[href="profile.html?u=${me}"])) .who > span { filter: blur(5px); }`;
    document.head.append(style);
  }
  initModes(() => { const logo = document.querySelector('.logo'); if (logo) logo.innerHTML = logoHTML(); syncDice(); });
  if (coonTakeoverDue()) {
    showCoonTakeover((text) => { const logo = document.querySelector('.logo'); if (logo) logo.innerHTML = logoHTML(22, text); });
  }
  renderFooter(session);
  // Badge flair (gold rings, Critic tags, 🌶️) is decoration: load it after the page, never block on it.
  if (session) import('./flair.js').then((m) => m.startFlair()).catch(() => {});
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
  const here = location.pathname.split('/').pop() || 'index.html';

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
        <input type="search" id="header-q" name="q" placeholder="Search episodes">
      </form>
      <a class="icon-btn bell" id="header-bell" href="notifications.html" aria-label="Notifications" title="Notifications"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span class="bell-count" hidden></span></a>
      <button type="button" class="icon-btn" id="header-random" aria-label="Random episode" title="Random episode">🎲</button>
      <button type="button" class="btn btn-green" id="header-log">+ Log</button>
      ${profile.is_admin ? `<a class="header-link" href="admin.html">Admin</a>` : ''}
      <a class="avatar-link" href="${me}" aria-label="Your profile">${avatarHTML(profile, 40)}</a>`;
  } else {
    right = `
      <a class="header-link" href="login.html">Log in</a>
      <a class="btn btn-green" href="login.html?mode=signup">Sign up</a>`;
  }

  el.innerHTML = `
    <div class="wrap header-inner">
      <a class="logo" href="index.html" aria-label="${esc(SITE_NAME)} home">${logoHTML()}</a>
      <nav class="main-nav" aria-label="Main">${nav}</nav>
      <div class="header-right">${right}</div>
    </div>`;

  el.querySelector('#header-log')?.addEventListener('click', () => logEpisode());
  el.querySelector('#header-random')?.addEventListener('click', async () => {
    const r = await import('./random.js');
    if (isChaos()) r.rollWorst((m) => toast(m)); else r.openRandomPicker();
  });
  syncDice();
  if (session) refreshBell();
}

/**
 * Open the log dialog. When something is saved, fires a "parkboxd:logged"
 * event on window so the current page can refresh itself.
 */
export async function logEpisode(opts = {}) {
  const { openLogModal } = await import('./log-modal.js');
  const changed = await openLogModal(opts);
  if (changed) window.dispatchEvent(new CustomEvent('parkboxd:logged'));
  return changed;
}

function renderFooter(session) {
  const el = document.getElementById('site-footer');
  if (!el) return;
  el.innerHTML = `
    <div class="wrap footer-inner">
      <span>Episode data from <a href="https://www.themoviedb.org/" rel="noopener">TMDB</a>.
        This product uses the TMDB API but is not endorsed or certified by TMDB.
        Fan project, not affiliated with South Park Studios.
        All ratings on this site, even those based on real opinions, are entirely fictional and probably wrong.</span>
      ${session ? `<button type="button" class="link-button" id="logout">Screw you guys, I'm logging out</button>` : ''}
    </div>`;
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
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false);
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
