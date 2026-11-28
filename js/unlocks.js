// "You unlocked a badge" message: what you earned and every perk that comes with it. Checked
// after anything that can earn a badge (js/supabase.js announces it) and now and then on page
// load. profiles.badges_seen remembers what was already announced, on every device.
import { sfx } from './sfx.js?v=20261128085011';
import { supabase } from './supabase.js?v=20261128085011';
import { esc, avatarHTML } from './ui.js?v=20261128085011';
import { loadBadges, rankFor } from './badges.js?v=20261128085011';
import { AVATAR_ICONS } from './avatars.js?v=20261128085011';
import { CACHE_KEY as FLAIR_CACHE } from './flair.js?v=20261128085011';

const DIRTY = 'parkboxd-badges-dirty';
const CHECKED = 'parkboxd-badges-checked';
const IDLE_MS = 5 * 60 * 1000; // page loads re-check this often even if nothing happened
const GAP_MS = 20 * 1000; // quick-fire actions (Cage Match picks) don't check every time

const TOGGLE = '(on/off in <a href="settings.html">Edit profile</a>)';
const PERKS = {
  friends: ['🤜🤛 A fist bump every time you follow someone'],
  bookworm: [`📚 A gold library card after your name and on your profile ${TOGGLE}`],
  detective: ['🕵️ A “Detective” tag on the Mystery leaderboard'],
  ringmaster: ['🥊 Cartman announces you as guest referee in the Cage Match'],
  screwyou: ['🚪 A “Screw you guys, I\'m going home” stamp on your reviews of 1★ or less'],
  tegridy: ['🦅 An eagle flies past when you rate a Randy episode', '🇺🇸 A stars-and-stripes Tegridy streak card, to keep and share'],
  completionist: [`👑 A crown on your avatar across the site ${TOGGLE}`],
  critic: [`✍️ A “Critic” tag after your name ${TOGGLE}`],
  hottake: [`🌶️ A pepper after your name ${TOGGLE}`],
  coon: ['🦝 VIP treatment when The Coon takes over the site, including #2 on his Rankings', '📋 Your own phase in his franchise plan'],
  rewatch: ['🧻 A towel reminder every time you log a rewatch'],
  chaos: ['😈 Secret mode: type “chaos” anywhere on the site, or tap the logo 5 times on a phone'],
  kenny: ['❓ Secret mode: type “mysterion” anywhere on the site, or press and hold the logo on a phone'],
};

export function startUnlocks(profile) {
  let timer;
  let running = false;
  const schedule = (delay) => { clearTimeout(timer); timer = setTimeout(run, delay); };
  async function run() {
    // Never talk over another dialog (the log form, a share card).
    if (running || document.hidden || document.querySelector('dialog[open]')) return schedule(3000);
    running = true;
    const marked = sessionStorage.getItem(DIRTY);
    sessionStorage.setItem(CHECKED, String(Date.now()));
    try {
      await check(profile);
      if (sessionStorage.getItem(DIRTY) === marked) sessionStorage.removeItem(DIRTY);
    } catch { /* a celebration must never break the page */ }
    running = false;
  }
  const since = () => Date.now() - Number(sessionStorage.getItem(CHECKED) || 0);
  window.addEventListener('parkboxd:progress', () => {
    sessionStorage.setItem(DIRTY, String(Date.now())); // survives a reload straight after saving
    schedule(Math.max(2500, GAP_MS - since()));
  });
  if (sessionStorage.getItem(DIRTY) || since() > IDLE_MS) schedule(1500);
}

async function check(profile) {
  const { data: me, error } = await supabase.from('profiles').select('badges_seen').eq('id', profile.id).maybeSingle();
  if (error || !me) return;
  const mine = (await loadBadges([profile.id])).get(profile.id);
  if (!mine) return;
  const earned = mine.badges.filter((b) => b.earned);
  const seen = new Set(me.badges_seen || []);
  const fresh = earned.filter((b) => !seen.has(b.id));
  if (me.badges_seen && !fresh.length) return;
  const { error: saveError } = await supabase.from('profiles')
    .update({ badges_seen: [...new Set([...seen, ...earned.map((b) => b.id)])] }).eq('id', profile.id);
  // The very first check only takes note of what you already had.
  if (saveError || !me.badges_seen) return;
  sessionStorage.removeItem(FLAIR_CACHE); // so the new perks work straight away
  show(profile, fresh, earned.length, mine.badges.length);
}

function show(profile, fresh, count, total) {
  const rank = rankFor(count);
  const newRank = rank && rank.id !== rankFor(count - fresh.length)?.id;
  const cards = fresh.map((b) => {
    const [key, icon] = Object.entries(AVATAR_ICONS).find(([, a]) => a.badge === b.id) || [];
    // No username on this avatar, so the site-wide ring and crown don't decorate the preview.
    const preview = { display_name: profile.display_name || profile.username, avatar_color: profile.avatar_color, avatar_icon: key };
    const perks = [
      ...(icon ? [`<span class="unlock-avatar">${avatarHTML(preview, 34)} New profile picture: ${esc(icon.label)}</span>`] : []),
      ...(PERKS[b.id] || []),
      '🖼️ A badge card to share from your profile',
    ];
    return `<section class="unlock-badge">
      <h3><span aria-hidden="true">${b.emoji}</span> ${esc(b.name)}</h3>
      <p>${esc(b.desc)}</p>
      <ul>${perks.map((p) => `<li>${p}</li>`).join('')}</ul>
    </section>`;
  }).join('');

  const d = document.createElement('dialog');
  d.className = 'log-dialog unlock-dialog';
  d.setAttribute('aria-labelledby', 'unlock-title');
  d.innerHTML = `
    <div class="sheet paper">
      <h2 class="cut" id="unlock-title">Congratulations!</h2>
      <p>You unlocked ${fresh.length === 1 ? 'a new badge' : `${fresh.length} new badges`}. Here's what you got.</p>
      ${cards}
      <p class="unlock-rank">${newRank ? `⭕ New: a <strong>${rank.name.toLowerCase()} ring</strong> around your avatar ${TOGGLE}. ` : ''}${count} of ${total} badges unlocked.</p>
      <div class="actions">
        <a class="btn btn-ghost" href="settings.html">Edit profile</a>
        <a class="btn btn-ghost" data-flair="1" href="profile.html?u=${encodeURIComponent(profile.username)}">My badges</a>
        <button type="button" class="btn btn-green" data-close>Sweet!</button>
      </div>
    </div>`;
  d.querySelector('[data-close]').addEventListener('click', () => d.close());
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
  sfx('fanfare');
}
