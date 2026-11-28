// The Stan's Picks box on the home page: picks with reasons, Save and Not for me.
import { supabase } from './supabase.js?v=20261128092557';
import { esc, toast } from './ui.js?v=20261128092557';
import { cardHTML } from './episodes.js?v=20261128092557';
import { allLatestRatings, characterTags } from './insights.js?v=20261128092557';
import { loadArcs } from './arcs.js?v=20261128092557';
import { stanPicks, stanLine } from './stan.js?v=20261128092557';
import { stanHatSVG } from './art.js?v=20261128092557';

/** Loads everything first, so the page can place the box without jumping: returns mount(element). */
export async function loadStanBox({ userId, all, mine, avgs }) {
  const [everyone, { data: people }, tags, arcs, { data: hiddenRows }, { data: savedRows }] = await Promise.all([
    allLatestRatings(),
    supabase.from('profiles').select('id, username, display_name').not('username', 'is', null),
    characterTags(),
    loadArcs(),
    supabase.from('stan_hidden').select('episode_id').eq('user_id', userId),
    supabase.from('watchlist').select('episode_id').eq('user_id', userId),
  ]);
  const names = new Map((people || []).map((p) => [p.id, p.display_name || p.username]));
  const hidden = new Set((hiddenRows || []).map((r) => r.episode_id));
  const saved = new Set((savedRows || []).map((r) => r.episode_id));
  const day = Math.floor(Date.now() / 86400000);
  const pick = () => stanPicks({ meId: userId, everyone, seen: new Set(mine.keys()), hidden, all, avgs, names, ...tags, arcs, day });

  return function mount(box) {
    if (!box) return;
    const draw = () => {
      const picks = pick();
      box.hidden = !picks.length && !hidden.size;
      box.innerHTML = `
        <div class="stan-top">
          <span class="stan-hat">${stanHatSVG()}</span>
          <div class="stan-head">
            <h2 class="cut">Stan's Picks</h2>
            <p class="stan-sub">Episodes you haven't logged. New mix every day.</p>
          </div>
          <p class="stan-quote">${esc(stanLine(picks, day))}</p>
        </div>
        <div class="stan-grid">${picks.map((p) => `
          <article class="stan-pick" data-id="${p.ep.id}">
            ${cardHTML(p.ep)}
            <p class="stan-reason">${esc(p.reason)}</p>
            <div class="stan-actions">
              <button type="button" class="stan-save" aria-pressed="${saved.has(p.ep.id)}" title="Add to your watchlist">${saved.has(p.ep.id) ? '✓ Saved' : '+ Save'}</button>
              <button type="button" class="stan-hide" title="Stop suggesting this one">✕ Not for me</button>
            </div>
          </article>`).join('')}</div>
        ${hidden.size ? `<button type="button" class="stan-restore">Bring back hidden picks (${hidden.size})</button>` : ''}`;
    };

    // One click handler for the whole box, so redrawing keeps working.
    box.onclick = async (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      const id = Number(button.closest('.stan-pick')?.dataset.id);
      button.disabled = true;
      let res;
      if (button.matches('.stan-save')) {
        const on = saved.has(id);
        res = await (on
          ? supabase.from('watchlist').delete().eq('episode_id', id).eq('user_id', userId)
          : supabase.from('watchlist').upsert({ user_id: userId, episode_id: id }, { onConflict: 'user_id,episode_id', ignoreDuplicates: true }));
        if (!res.error) {
          if (on) saved.delete(id); else saved.add(id);
          button.textContent = on ? '+ Save' : '✓ Saved';
          button.setAttribute('aria-pressed', String(!on));
          toast(on ? 'Removed from your watchlist.' : 'Saved to your watchlist.');
        }
      } else if (button.matches('.stan-hide')) {
        res = await supabase.from('stan_hidden').upsert({ user_id: userId, episode_id: id }, { onConflict: 'user_id,episode_id', ignoreDuplicates: true });
        if (!res.error) { hidden.add(id); draw(); toast("Okay, dude. I won't suggest that one."); return; }
      } else if (button.matches('.stan-restore')) {
        res = await supabase.from('stan_hidden').delete().eq('user_id', userId);
        if (!res.error) { hidden.clear(); draw(); return; }
      }
      button.disabled = false;
      if (res?.error) toast("That didn't work. Try again.");
    };
    draw();
  };
}
