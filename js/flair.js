// Show-off flair earned from badges, shown next to people everywhere on the site:
//   🏔️ Completionist  → gold ring around their avatar
//   ✍️ Critic (25+ reviews) → "Critic" tag after their name
//   🌶️ Hot Take Artist (5+ hot takes) → 🌶️ after their name
import { supabase } from './supabase.js?v=20261127113852';
import { loadAllEpisodes, todayISO } from './episodes.js?v=20261127113852';
import { allLatestRatings, episodeAverages, isHotTake } from './insights.js?v=20261127113852';

const CACHE_KEY = 'parkboxd-flair';
const CACHE_MS = 10 * 60 * 1000;

/** { username: { gold, critic, spicy } } — cached for 10 minutes per tab. */
async function loadFlair() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.t < CACHE_MS) return cached.data;
  } catch { /* ignore a broken cache */ }

  const [all, { data: stats }, { data: logs }, everyone, avgs] = await Promise.all([
    loadAllEpisodes(),
    supabase.from('user_stats').select('user_id, username, review_count'),
    supabase.from('logs').select('user_id, episode_id').limit(50000),
    allLatestRatings(),
    episodeAverages(),
  ]);

  // Completionist: every aired regular episode logged.
  const today = todayISO();
  const aired = all.filter((e) => e.kind === 'episode' && e.air_date && e.air_date <= today).map((e) => e.id);
  const seenBy = new Map();
  for (const l of logs || []) {
    if (!seenBy.has(l.user_id)) seenBy.set(l.user_id, new Set());
    seenBy.get(l.user_id).add(l.episode_id);
  }

  const data = {};
  for (const s of stats || []) {
    if (!s.username) continue;
    const seen = seenBy.get(s.user_id) || new Set();
    const ratings = everyone.get(s.user_id) || new Map();
    const hot = [...ratings].filter(([epId, r]) => isHotTake(r, avgs.get(epId))).length;
    const f = {
      gold: aired.length > 0 && aired.every((id) => seen.has(id)),
      critic: (s.review_count || 0) >= 25,
      spicy: hot >= 5,
    };
    if (f.gold || f.critic || f.spicy) data[s.username] = f;
  }
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data }));
  return data;
}

function decorate(root, flair) {
  // Gold ring on avatars (avatars carry data-u="username").
  root.querySelectorAll('.avatar[data-u]:not([data-flair])').forEach((a) => {
    a.dataset.flair = '1';
    if (flair[a.dataset.u]?.gold) {
      a.classList.add('gold-ring');
      a.title = 'Completionist: has watched every episode';
    }
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
    if (tags) link.insertAdjacentHTML('afterend', tags);
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
