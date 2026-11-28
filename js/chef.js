// Chef's menu: the mood tab of the random picker. Pick a dish, get one episode.
import { supabase } from './supabase.js?v=20261128083817';
import { loadAllEpisodes, myLogMap, isAired, todayISO, seasonLabel } from './episodes.js?v=20261128083817';
import { characterTags } from './insights.js?v=20261128083817';
import { esc } from './ui.js?v=20261128083817';

export const DISHES = [
  { id: 'cartman', emoji: '🍕', name: "Cartman's chaos platter", hint: 'Cartman episodes', who: 'Cartman' },
  { id: 'butters', emoji: '🥧', name: "Butters' wholesome pie", hint: 'Butters episodes', who: 'Butters' },
  { id: 'randy', emoji: '🍲', name: "Randy's nonsense stew", hint: 'Randy episodes', who: 'Randy' },
  { id: 'favorite', emoji: '🏆', name: 'Fan favorite', hint: 'The highest rated' },
  { id: 'gem', emoji: '💎', name: 'Hidden gem', hint: 'Rated high, by fewer people' },
  { id: 'leftovers', emoji: '🥡', name: 'Leftovers', hint: 'From your watchlist' },
  { id: 'spicy', emoji: '🌶️', name: 'Spicy', hint: "Ratings don't agree" },
  { id: 'today', emoji: '📅', name: "Today's special", hint: 'Aired on this date' },
];

const HIGH = 4;       // average that counts as "rated highly"
const MIN_VOTES = 2;  // one person's rating doesn't make a favorite or a gem
const SPICY_MIN = 3;  // same minimum as the Most divisive ranking
const TOP = 20;       // Fan favorite and Spicy pick from this many

async function ratingRows() {
  const { data, error } = await supabase.from('episode_ratings')
    .select('episode_id, avg_rating, rating_count, rating_stddev').gte('rating_count', MIN_VOTES).limit(5000);
  if (error) throw error;
  return data.map((r) => ({ id: r.episode_id, avg: Number(r.avg_rating), count: r.rating_count, sd: Number(r.rating_stddev) }));
}

/** The least-rated third of the highly rated episodes, compared with each other. */
export function hiddenGems(rows) {
  const high = rows.filter((r) => r.avg >= HIGH).sort((a, b) => a.count - b.count);
  if (!high.length) return [];
  const cutoff = high[Math.ceil(high.length / 3) - 1].count;
  const most = high[high.length - 1].count;
  // If they all have the same number of ratings, none is more hidden than another.
  return high.filter((r) => r.count <= cutoff && r.count < most);
}

// Map(episode id → the line explaining the pick), before the "haven't seen" filter.
async function candidates(dish, all, user) {
  if (dish.who) {
    const ids = (await characterTags()).byName.get(dish.who) || new Set();
    return new Map([...ids].map((id) => [id, `A ${dish.who} episode.`]));
  }
  if (dish.id === 'leftovers') {
    const { data, error } = await supabase.from('watchlist').select('episode_id').eq('user_id', user.id);
    if (error) throw error;
    return new Map(data.map((r) => [r.episode_id, 'Saved on your watchlist.']));
  }
  if (dish.id === 'today') {
    const today = todayISO();
    return new Map(all.filter((e) => e.air_date && e.air_date.slice(5) === today.slice(5) && e.air_date < today)
      .map((e) => [e.id, `Aired on this date in ${e.air_date.slice(0, 4)}.`]));
  }
  const rows = await ratingRows();
  const stars = (r) => `${r.avg.toFixed(1)}★ from ${r.count} ratings`;
  if (dish.id === 'gem') return new Map(hiddenGems(rows).map((r) => [r.id, `${stars(r)}, fewer than most top episodes.`]));
  const top = dish.id === 'spicy'
    ? rows.filter((r) => r.count >= SPICY_MIN && r.sd > 0).sort((a, b) => b.sd - a.sd)
    : rows.filter((r) => r.avg >= HIGH).sort((a, b) => b.avg - a.avg || b.count - a.count);
  return new Map(top.slice(0, TOP).map((r) => [r.id, dish.id === 'spicy' ? `People can't agree: ${stars(r)}.` : `${stars(r)}.`]));
}

const EMPTY = {
  favorite: 'No fan favorites yet. Get more people rating.',
  gem: 'The kitchen is out of gems. Try another dish.',
  leftovers: 'No leftovers. Hit "Watchlist" on any episode page to save some for later.',
  spicy: 'Nothing spicy yet. Not enough people are disagreeing.',
  today: 'Nothing aired on this date. Try another dish.',
};

/** Pick an episode for a dish. Returns { ep, why } or { message }. `not` is the one just sent back. */
export async function serve(id, { unseen = false, not = null } = {}) {
  const dish = DISHES.find((d) => d.id === id);
  const { data: { user } } = await supabase.auth.getUser();
  if (id === 'leftovers' && !user) return { message: 'Log in to get leftovers from your watchlist.' };
  const all = await loadAllEpisodes();
  const found = await candidates(dish, all, user);
  let pool = all.filter((e) => isAired(e) && found.has(e.id));
  if (!pool.length) return { message: EMPTY[id] || `No ${dish.who} episodes are tagged yet. Try another dish.` };
  if (unseen && user && id !== 'leftovers') {
    const mine = await myLogMap(user.id);
    pool = pool.filter((e) => !mine.has(e.id));
    if (!pool.length) return { message: `You've seen everything in this dish. Untick "Only ones I haven't seen" or try another.` };
  }
  if (pool.length > 1) pool = pool.filter((e) => e.id !== not);
  const ep = pool[Math.floor(Math.random() * pool.length)];
  return { ep, why: found.get(ep.id) };
}

/** Draw the menu inside `box`. */
export function mountMenu(box) {
  box.innerHTML = `
    <div class="chef-dishes">${DISHES.map((d) => `<button type="button" class="chef-dish" data-dish="${d.id}">
      <span class="emoji" aria-hidden="true">${d.emoji}</span><span><strong>${esc(d.name)}</strong><small>${esc(d.hint)}</small></span></button>`).join('')}</div>
    <label class="checkbox"><input type="checkbox" class="chef-unseen" checked> Only ones I haven't seen</label>
    <div class="chef-table" aria-live="polite"></div>`;
  const table = box.querySelector('.chef-table');
  let busy = false;

  async function order(id, not) {
    if (busy) return;
    busy = true;
    box.querySelectorAll('[data-dish]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dish === id)));
    table.innerHTML = '<p class="chef-wait">Cooking…</p>';
    try {
      const r = await serve(id, { unseen: box.querySelector('.chef-unseen').checked, not });
      if (!r.ep) {
        table.innerHTML = `<p class="notice notice-info">${esc(r.message)}</p>`;
      } else {
        table.innerHTML = `
          <div class="chef-plate">
            <div class="chef-food"><strong>${esc(r.ep.title)}</strong><small>${esc(seasonLabel(r.ep))}</small><span>${esc(r.why)}</span></div>
            <div class="chef-lid" aria-hidden="true"></div>
          </div>
          <div class="chef-buttons">
            <button type="button" class="btn btn-ghost" data-back>Send it back</button>
            <a class="btn btn-green" href="episode.html?id=${r.ep.id}">Watch it</a>
          </div>`;
        table.querySelector('[data-back]').onclick = () => order(id, r.ep.id);
      }
    } catch {
      table.innerHTML = `<p class="notice notice-error">The kitchen's on fire. Try again.</p>`;
    }
    busy = false;
    table.scrollIntoView({ block: 'nearest' });
  }

  box.querySelectorAll('[data-dish]').forEach((b) => b.addEventListener('click', () => order(b.dataset.dish)));
}
