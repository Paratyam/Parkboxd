// Shared header + footer, and the session/profile check every page runs first.
import { supabase, isConfigured } from './supabase.js';
import { SITE_NAME } from './config.js';
import { esc, avatarHTML, currentPage } from './ui.js';

const LOGO_COLOURS = ['#3fb950', '#4a90e2', '#d63a3a', '#f5c518', '#f2711c'];
const LOGO_TILT = [-4, 3, -2, 5, -3, 2, -5, 4, -1, 3];

// Set ready: true as each page gets built.
const NAV = [
  { label: 'Episodes', href: 'episodes.html', ready: true },
  { label: 'Seasons', href: 'seasons.html', ready: true },
  { label: 'Lists', href: 'lists.html', ready: false },
  { label: 'Friends', href: 'friends.html', ready: false },
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
  renderFooter(session);
  if (!isConfigured) showConfigWarning();

  return { session, user: session?.user ?? null, profile };
}

export function logoHTML(size = 22) {
  return SITE_NAME.toUpperCase().split('').map((ch, i) =>
    `<span class="logo-letter cut paper" style="background-color:${LOGO_COLOURS[i % 5]};transform:rotate(${LOGO_TILT[i % 10]}deg);font-size:${size}px">${esc(ch)}</span>`
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
      <button type="button" class="btn btn-green" id="header-log">+ Log</button>
      ${profile.is_admin ? `<a class="header-link" href="import.html">Admin</a>` : ''}
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
        Fan project, not affiliated with South Park Studios.</span>
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
