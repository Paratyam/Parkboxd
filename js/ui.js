// Small DOM helpers shared by every page.
import { AVATAR_ICONS } from './avatars.js?v=20261127081655';

export const $ = (sel, root = document) => root.querySelector(sel);

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

export const params = new URLSearchParams(location.search);

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// Only allow redirects to our own pages, e.g. "profile.html?u=kyle".
export function safeNext(fallback = 'profile.html') {
  const next = params.get('next');
  return next && /^[a-z0-9_-]+\.html(\?[^#]*)?$/i.test(next) ? next : fallback;
}

// The current page as a relative path, for ?next= links.
export function currentPage() {
  return (location.pathname.split('/').pop() || 'index.html') + location.search;
}

// Show a message in a .notice element. type: 'error' | 'ok' | 'info'
export function notify(el, text, type = 'info') {
  el.textContent = text;
  el.className = `notice notice-${type}`;
  el.hidden = !text;
}

// A short message that pops up at the bottom of the screen and fades away.
export function toast(text, ms = 4500) {
  if (!text) return;
  let host = document.getElementById('toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.append(host);
  }
  const t = document.createElement('div');
  t.className = 'toast paper';
  t.textContent = text;
  host.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
}

export function setBusy(button, busy, busyText = 'Working…') {
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

export function avatarHTML(profile, size = 40) {
  const name = profile?.display_name || profile?.username || '?';
  const colour = profile?.avatar_color || '#f2711c';
  const who = profile?.username ? ` data-u="${esc(profile.username)}"` : '';
  const icon = profile?.avatar_icon && AVATAR_ICONS[profile.avatar_icon];
  return `<span class="avatar${icon ? ' has-icon' : ''}"${who} style="--c:${esc(colour)};--size:${size}px" aria-hidden="true">${icon ? icon.svg : esc(name[0].toUpperCase())}</span>`;
}

export function formatDate(value, opts = { year: 'numeric', month: 'long', day: 'numeric' }) {
  if (!value) return '';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return d.toLocaleDateString(undefined, opts);
}

// Short label for an episode row: "S5 E4", "Special 3" or "Movie · 1999".
export function epCode(ep) {
  if (!ep) return '';
  if (ep.kind === 'movie') return `Movie${ep.air_date ? ` · ${ep.air_date.slice(0, 4)}` : ''}`;
  if (ep.kind === 'special' || ep.season === 0) return `Special ${ep.number}`;
  return `S${ep.season} E${ep.number}`;
}

// Profile / Diary / Watchlist tabs for a user.
export function profileTabsHTML(username, active) {
  const u = encodeURIComponent(username);
  const tabs = [['profile', 'Profile', `profile.html?u=${u}`], ['diary', 'Diary', `diary.html?u=${u}`], ['reviews', 'Reviews', `reviews.html?u=${u}`], ['watchlist', 'Watchlist', `watchlist.html?u=${u}`], ['ratings', 'Ratings', `ratings.html?u=${u}`], ['cage', 'Rankings', `cage.html?u=${u}&view=ranking`], ['stats', 'Stats', `stats.html?u=${u}`], ['tiers', 'Tier list', `tiers.html?u=${u}`]];
  return `<nav class="profile-tabs" aria-label="Profile sections">${tabs.map(([key, label, href]) =>
    `<a href="${href}"${key === active ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

export function stars(rating) {
  if (rating == null) return '';
  const full = Math.floor(rating);
  return '★'.repeat(full) + (rating % 1 ? '½' : '');
}
