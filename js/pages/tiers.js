// tiers.html?u=name: a season tier list. Owners drag seasons into tiers (or tap a season, then tap a tier).
import { initPage } from '../layout.js?v=20261127193601';
import { supabase } from '../supabase.js?v=20261127193601';
import { SITE_NAME } from '../config.js?v=20261127193601';
import { $, esc, params, profileTabsHTML, notify, toast } from '../ui.js?v=20261127193601';
import { loadAllEpisodes } from '../episodes.js?v=20261127193601';
import { allLatestRatings } from '../insights.js?v=20261127193601';

const { profile: me } = await initPage({ title: 'Tier list', auth: 'required' });
const root = $('#tiers');

const TIERS = [['S', '#d63a3a'], ['A', '#f2711c'], ['B', '#f5c518'], ['C', '#3fb950'], ['D', '#4a90e2']];
const wanted = (params.get('u') || me.username).toLowerCase();
const { data: person } = await supabase.from('profiles').select('id, username, display_name, season_tiers').eq('username', wanted).maybeSingle();

if (!person) {
  root.innerHTML = `<div class="big-message"><h1 class="cut">Nobody by that name</h1><a class="btn btn-green" href="tiers.html">Your tier list</a></div>`;
  root.removeAttribute('aria-busy');
} else {
  const isMe = person.id === me.id;
  const name = person.display_name || person.username;
  document.title = `${isMe ? 'Your tier list' : `${name}'s tier list`} · ${SITE_NAME}`;

  const [all, everyone] = await Promise.all([loadAllEpisodes(), allLatestRatings()]);
  const seasons = [...new Set(all.filter((e) => e.kind === 'episode').map((e) => e.season))].sort((a, b) => a - b);
  // Their average rating per season, shown on each chip as a hint.
  const theirs = everyone.get(person.id) || new Map();
  const seasonOf = new Map(all.map((e) => [e.id, e.season]));
  const sums = new Map();
  for (const [epId, r] of theirs) {
    const s = seasonOf.get(epId);
    if (s == null) continue;
    const x = sums.get(s) || { sum: 0, n: 0 };
    x.sum += r; x.n++;
    sums.set(s, x);
  }
  const avgOf = (s) => (sums.get(s) ? (sums.get(s).sum / sums.get(s).n).toFixed(1) : null);

  // State: tier → [season numbers]; anything not placed is unranked.
  const state = Object.fromEntries(TIERS.map(([t]) => [t, (person.season_tiers?.[t] || []).filter((s) => seasons.includes(s))]));
  let selected = null;
  let dirty = false;

  const chip = (s) => {
    const inner = `S${s}${avgOf(s) ? `<span class="avg">${avgOf(s)}</span>` : ''}`;
    const label = `Season ${s}${avgOf(s) ? `, average rating ${avgOf(s)}` : ''}`;
    return isMe
      ? `<button type="button" class="tier-chip" data-season="${s}" draggable="true" aria-pressed="${selected === s}" aria-label="${label}">${inner}</button>`
      : `<a class="tier-chip" href="seasons.html?s=${s}" aria-label="${label}">${inner}</a>`;
  };

  function render() {
    const placed = new Set(Object.values(state).flat());
    const unranked = seasons.filter((s) => !placed.has(s));
    root.innerHTML = `
      <div>
        <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">${isMe ? 'Your season tier list' : `${esc(name)}'s season tier list`}</h1>
        ${profileTabsHTML(person.username, 'tiers')}
      </div>
      ${isMe ? '<p class="result-count" style="margin:0">Drag seasons into tiers. On a phone: tap a season, then tap a tier. The little number is your average rating for that season.</p>' : ''}
      <p class="notice" id="msg" hidden></p>
      <div class="tiers${isMe ? '' : ' tier-view'}">
        ${TIERS.map(([t, colour]) => `
          <div class="tier">
            <div class="label" style="background:${colour}">${t}</div>
            <div class="slot" data-tier="${t}" ${isMe ? 'role="button" tabindex="0" aria-label="Put the selected season in tier ' + t + '"' : ''}>${state[t].map(chip).join('')}</div>
          </div>`).join('')}
      </div>
      ${isMe ? `
        <section>
          <div class="section-head"><h2>Unranked</h2><span class="result-count">${unranked.length}</span></div>
          <div class="tier-pool slot" data-tier="" role="button" tabindex="0" aria-label="Move the selected season back to unranked">${unranked.map(chip).join('') || '<span class="result-count">Everything is ranked. Look at you.</span>'}</div>
        </section>
        <div class="toolbar"><button type="button" class="btn btn-green" id="save" ${dirty ? '' : 'disabled'}>Save tier list</button>
          <button type="button" class="btn btn-ghost" id="clear">Clear all</button></div>`
        : (Object.values(state).flat().length ? '' : `<p class="empty">${esc(name)} hasn't made a tier list yet. Coward.</p>`)}`;
    root.removeAttribute('aria-busy');
    if (isMe) wire();
  }

  function move(season, tier) {
    for (const [t] of TIERS) state[t] = state[t].filter((s) => s !== season);
    if (tier) state[tier].push(season);
    selected = null;
    dirty = true;
    render();
  }

  function wire() {
    root.querySelectorAll('.tier-chip').forEach((c) => {
      const s = Number(c.dataset.season);
      c.addEventListener('click', (e) => { e.stopPropagation(); selected = selected === s ? null : s; render(); });
      c.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(s)); e.dataTransfer.effectAllowed = 'move'; });
    });
    root.querySelectorAll('.slot').forEach((slot) => {
      const tier = slot.dataset.tier;
      slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drop-hover'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('drop-hover'));
      slot.addEventListener('drop', (e) => { e.preventDefault(); move(Number(e.dataTransfer.getData('text/plain')), tier); });
      const place = () => { if (selected != null) move(selected, tier); };
      slot.addEventListener('click', place);
      slot.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); place(); } });
    });
    $('#clear').onclick = () => { for (const [t] of TIERS) state[t] = []; dirty = true; render(); };
    $('#save').onclick = async () => {
      const { error } = await supabase.from('profiles').update({ season_tiers: state }).eq('id', me.id);
      if (error) return notify($('#msg'), error.message, 'error');
      dirty = false;
      render();
      const s = state.S;
      toast(s.length ? `Saved. Season ${s[0]} in S tier? Respect.` : 'Saved. Nothing in S tier? Tough crowd.');
    };
  }

  render();
}
