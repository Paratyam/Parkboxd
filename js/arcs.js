// Multi-part arcs: loading and the "log the whole arc" dialog.
import { supabase } from './supabase.js?v=20261127133501';
import { esc, epCode } from './ui.js?v=20261127133501';
import { starInput } from './stars.js?v=20261127133501';
import { todayISO } from './episodes.js?v=20261127133501';
import { towelieRewatch } from './fx.js?v=20261127133501';

// All arcs with their episode ids in order: [{ id, name, episodeIds: [] }]
export async function loadArcs() {
  const { data } = await supabase.from('arcs').select('id, name, arc_episodes(episode_id, position)').order('name');
  return (data || []).map((a) => ({
    id: a.id,
    name: a.name,
    episodeIds: (a.arc_episodes || []).sort((x, y) => x.position - y.position).map((x) => x.episode_id),
  }));
}

/**
 * Log every episode of an arc in one go.
 *   eps: the arc's episodes in order; mine: myLogMap. Resolves true if saved.
 */
export function openLogArc(arc, eps, mine) {
  return new Promise((resolve) => {
    let saved = false;
    const d = document.createElement('dialog');
    d.className = 'log-dialog';
    d.setAttribute('aria-labelledby', 'arc-log-title');
    document.body.append(d);
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => { d.remove(); resolve(saved); });

    d.innerHTML = `
      <form class="sheet paper" novalidate>
        <h2 class="cut" id="arc-log-title">Log the whole arc</h2>
        <p style="margin:0;color:var(--text-soft)">${esc(arc.name)}: ${eps.length} parts</p>
        <ol style="margin:0;padding-left:20px;font-size:14px;color:var(--text-soft)">
          ${eps.map((e) => `<li>${esc(e.title)} <span style="color:var(--muted)">${esc(epCode(e))}${mine.has(e.id) ? ' · logged' : ''}</span></li>`).join('')}
        </ol>
        <div class="row">
          <div class="field"><label for="arc-date">Watched on</label><input type="date" id="arc-date" max="${todayISO()}" value="${todayISO()}"></div>
          <label class="checkbox"><input type="checkbox" id="arc-nodate"> I don't remember when</label>
        </div>
        <div class="row">
          <div class="field">
            <span style="font-size:13px;font-weight:600;color:var(--text-soft)" id="arc-rating-label">Same rating for every part (optional)</span>
            <div class="star-row"><div id="arc-stars"></div><button type="button" class="clear-rating" id="arc-clear">Clear</button></div>
          </div>
          <button type="button" class="like-toggle" id="arc-like" aria-pressed="false">♥ Like all</button>
        </div>
        <label class="checkbox"><input type="checkbox" id="arc-skip" checked> Skip parts I've already logged</label>
        <p class="notice" id="arc-msg" hidden></p>
        <div class="actions">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-green">Log arc</button>
        </div>
      </form>`;

    const $d = (s) => d.querySelector(s);
    const stars = starInput($d('#arc-stars'), { value: null, label: 'Rating for every part' });
    $d('#arc-stars').setAttribute('aria-labelledby', 'arc-rating-label');
    $d('#arc-clear').onclick = () => { stars.value = null; };
    $d('#arc-nodate').onchange = () => { $d('#arc-date').disabled = $d('#arc-nodate').checked; };
    const like = $d('#arc-like');
    like.onclick = () => like.setAttribute('aria-pressed', String(like.getAttribute('aria-pressed') !== 'true'));
    $d('[data-close]').onclick = () => d.close();

    d.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const skip = $d('#arc-skip').checked;
      const targets = eps.filter((ep) => !(skip && mine.has(ep.id)));
      const m = $d('#arc-msg');
      if (!targets.length) {
        m.textContent = "You've already logged every part.";
        m.className = 'notice notice-info';
        m.hidden = false;
        return;
      }
      const watched_on = $d('#arc-nodate').checked ? null : ($d('#arc-date').value || null);
      const rows = targets.map((ep) => ({
        episode_id: ep.id,
        watched_on,
        rating: stars.value,
        liked: like.getAttribute('aria-pressed') === 'true',
        is_rewatch: mine.has(ep.id),
      }));
      const { error } = await supabase.from('logs').insert(rows);
      if (error) {
        m.textContent = error.message;
        m.className = 'notice notice-error';
        m.hidden = false;
        return;
      }
      await supabase.from('watchlist').delete().in('episode_id', targets.map((t) => t.id));
      if (rows.some((r) => r.is_rewatch)) towelieRewatch(supabase);
      saved = true;
      d.close();
    });

    d.showModal();
  });
}
