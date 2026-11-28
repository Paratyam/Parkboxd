// Show-off flair earned from badges, shown next to people everywhere on the site:
//   5 / 10 / 15 badges  → bronze / silver / gold ring around their avatar
//   🏔️ Completionist    → a crown on their avatar
//   ✍️ Critic (25+ reviews) → "Critic" tag after their name
//   🌶️ Hot Take Artist (5+ hot takes) → 🌶️ after their name
//   📚 Bookworm          → a little gold library card after their name
//   🕵️ Case Closed       → "Detective" on the Mystery leaderboard
//   🚪 Screw You Guys    → a stamp on their reviews of 1★ or less
// People can switch the ring, crown and name tags off in Edit profile (profiles.flair_off).
import { loadBadges, rankFor } from './badges.js?v=20261128093056';
import { supabase } from './supabase.js?v=20261128093056';

export const CACHE_KEY = 'parkboxd-flair-4';
const CACHE_MS = 10 * 60 * 1000;

const CROWN = '<svg viewBox="0 0 40 28" aria-hidden="true" focusable="false"><path d="M4 24 L2 6 L12 14 L20 2 L28 14 L38 6 L36 24 Z" fill="#f5c518" stroke="#141414" stroke-width="3" stroke-linejoin="round"/><circle cx="20" cy="17" r="3.5" fill="#d63a3a" stroke="#141414" stroke-width="2"/></svg>';

let loading; // one load at a time, however many ask
let myName; // the signed-in username

/** { username: { earned, rank, count, crown, critic, ... } } — cached for 10 minutes per tab. */
function loadFlair() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.t < CACHE_MS) return Promise.resolve(cached.data);
  } catch { /* ignore a broken cache */ }
  loading ||= buildFlair().finally(() => { loading = null; });
  return loading;
}

async function buildFlair() {
  const data = {};
  for (const { username, flairOff, badges } of (await loadBadges()).values()) {
    const earned = new Set(badges.filter((b) => b.earned).map((b) => b.id));
    const f = {
      rank: flairOff.includes('ring') ? null : rankFor(earned.size),
      count: earned.size,
      crown: earned.has('completionist') && !flairOff.includes('crown'),
      critic: earned.has('critic') && !flairOff.includes('critic'),
      spicy: earned.has('hottake') && !flairOff.includes('spicy'),
      bookworm: earned.has('bookworm') && !flairOff.includes('bookworm'),
      detective: earned.has('detective'),
      goingHome: earned.has('screwyou'),
      earned: [...earned],
    };
    if (earned.size) data[username] = f;
  }
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data }));
  return data;
}

/** Does this person hold this badge? False if it can't be worked out. */
export async function hasBadge(username, id) {
  try {
    return !!(await loadFlair())[username]?.earned.includes(id);
  } catch {
    return false;
  }
}

/** Do I? */
export async function iHave(id) {
  if (!myName) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();
    myName = data?.username;
  }
  return hasBadge(myName, id);
}

function decorate(root, flair) {
  // Rings and crowns on avatars (avatars carry data-u="username").
  root.querySelectorAll('.avatar[data-u]:not([data-flair])').forEach((a) => {
    a.dataset.flair = '1';
    const f = flair[a.dataset.u];
    if (!f) return;
    const titles = [];
    if (f.rank) {
      a.classList.add(`rank-${f.rank.id}`);
      titles.push(`${f.rank.name} rank: ${f.count} badges`);
    }
    if (f.crown) {
      a.classList.add('crowned');
      a.insertAdjacentHTML('beforeend', `<span class="flair-crown">${CROWN}</span>`);
      titles.push('Completionist: has watched every episode');
    }
    if (titles.length) a.title = titles.join(' · ');
  });
  // Tags after names: text links to a profile (not links wrapping an avatar).
  root.querySelectorAll('a[href^="profile.html?u="]:not([data-flair])').forEach((link) => {
    link.dataset.flair = '1';
    if (link.querySelector('.avatar') || !link.textContent.trim()) return;
    const u = new URLSearchParams(link.getAttribute('href').split('?')[1]).get('u');
    const f = flair[u];
    if (!f) return;
    let tags = '';
    if (f.critic) tags += '<span class="flair-critic" title="Critic: 25+ reviews">Critic</span>';
    if (f.spicy) tags += '<span class="flair-spicy" title="Hot Take Artist: 5+ hot takes" aria-label="Hot Take Artist">🌶️</span>';
    if (f.bookworm) tags += '<span class="flair-bookworm" title="Bookworm: gold library card">📚 Bookworm</span>';
    if (tags) link.insertAdjacentHTML('afterend', tags);
  });
  // Mystery leaderboard names and harsh reviews mark who they belong to.
  root.querySelectorAll('[data-detective]:not([data-flair])').forEach((el) => {
    el.dataset.flair = '1';
    if (flair[el.dataset.detective]?.detective) el.insertAdjacentHTML('afterend', '<span class="flair-detective" title="Case Closed: solved 5 mysteries">🕵️ Detective</span>');
  });
  root.querySelectorAll('[data-going-home]:not([data-flair])').forEach((el) => {
    el.dataset.flair = '1';
    if (flair[el.dataset.goingHome]?.goingHome) el.insertAdjacentHTML('beforeend', '<span class="going-home">Screw you guys, I\'m going home</span>');
  });
}

/** Start decorating the page, including anything rendered later. */
export async function startFlair() {
  let flair;
  try {
    flair = await loadFlair();
  } catch {
    return; // flair is decoration only; never break the page over it
  }
  if (!Object.keys(flair).length) return;
  decorate(document, flair);
  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; decorate(document, flair); });
  }).observe(document.body, { childList: true, subtree: true });
}
