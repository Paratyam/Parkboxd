// Small DOM helpers shared by every page.

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
  return `<span class="avatar" style="--c:${esc(colour)};--size:${size}px" aria-hidden="true">${esc(name[0].toUpperCase())}</span>`;
}

export function formatDate(value, opts = { year: 'numeric', month: 'long', day: 'numeric' }) {
  if (!value) return '';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return d.toLocaleDateString(undefined, opts);
}

export function stars(rating) {
  if (rating == null) return '';
  const full = Math.floor(rating);
  return '★'.repeat(full) + (rating % 1 ? '½' : '');
}
