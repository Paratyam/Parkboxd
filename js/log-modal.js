// The "log an episode" dialog, used by the header "+ Log" button, episode pages and the diary.
import { supabase } from './supabase.js?v=20261127135216';
import { esc, epCode } from './ui.js?v=20261127135216';
import { line } from './jokes.js?v=20261127135216';
import { celebrate, towelieRewatch } from './fx.js?v=20261127135216';
import { starInput } from './stars.js?v=20261127135216';
import { loadAllEpisodes, thumbHTML, todayISO } from './episodes.js?v=20261127135216';

let dialog;

function ensureDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'log-dialog';
  dialog.setAttribute('aria-labelledby', 'log-title');
  document.body.append(dialog);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  return dialog;
}

/**
 * openLogModal({ episode?, log?, rewatch? })
 *   episode: preselected episode (else a search box is shown)
 *   log: an existing log row to edit
 * Resolves to true if something was saved or deleted.
 */
export function openLogModal({ episode = null, log = null, rewatch = false } = {}) {
  const d = ensureDialog();
  return new Promise((resolve) => {
    let changed = false;
    d.addEventListener('close', () => resolve(changed), { once: true });
    if (episode) showForm(episode); else showPicker();
    d.showModal();

    function showPicker() {
      d.innerHTML = `
        <div class="sheet paper">
          <h2 class="cut" id="log-title">Log an episode</h2>
          <div class="field">
            <label for="log-search">Search episodes, specials and movies</label>
            <input type="search" id="log-search" placeholder="e.g. Scott Tenorman, S5E4" autocomplete="off">
          </div>
          <ul class="pick-results" id="pick-results" aria-live="polite"></ul>
          <div class="actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button></div>
        </div>`;
      d.querySelector('[data-close]').onclick = () => d.close();
      const input = d.querySelector('#log-search');
      const list = d.querySelector('#pick-results');
      let all = [];
      loadAllEpisodes().then((eps) => { all = eps; render(); });
      input.addEventListener('input', render);
      input.focus();

      function render() {
        const q = input.value.trim().toLowerCase();
        const m = q.match(/^s(\d+)\s*e(\d+)$/);
        const hits = (q
          ? all.filter((e) => (m ? e.season === +m[1] && e.number === +m[2] : e.title.toLowerCase().includes(q)))
          : all.slice(-8).reverse()
        ).slice(0, 40);
        list.innerHTML = hits.map((e) => `
          <li><button type="button" data-id="${e.id}"><span>${esc(e.title)}</span><span class="code">${esc(epCode(e))}</span></button></li>`).join('')
          || '<li class="empty">Nothing found.</li>';
        list.querySelectorAll('button').forEach((b) => {
          b.onclick = () => showForm(all.find((e) => e.id === +b.dataset.id));
        });
      }
    }

    async function showForm(ep) {
      // Default the rewatch box to on if the user has logged this before.
      let wasLogged = rewatch;
      if (!log && !rewatch) {
        const { count } = await supabase.from('logs').select('id', { count: 'exact', head: true }).eq('episode_id', ep.id)
          .eq('user_id', (await supabase.auth.getUser()).data.user.id);
        wasLogged = count > 0;
      }
      const editing = !!log;
      d.innerHTML = `
        <form class="sheet paper" method="dialog" novalidate>
          <h2 class="cut" id="log-title">${editing ? 'Edit log' : 'I watched…'}</h2>
          <div class="ep-pick">${thumbHTML(ep, { showTitle: false })}
            <div><div class="title">${esc(ep.title)}</div><div class="code">${esc(epCode(ep))}</div></div>
          </div>
          <div class="row">
            <div class="field">
              <label for="log-date">Watched on</label>
              <input type="date" id="log-date" max="${todayISO()}">
            </div>
            <label class="checkbox"><input type="checkbox" id="log-nodate"> I don't remember when</label>
          </div>
          <div class="row">
            <div class="field">
              <span style="font-size:13px;font-weight:600;color:var(--text-soft)" id="rating-label">Rating</span>
              <div class="star-row"><div id="log-stars"></div><button type="button" class="clear-rating" id="log-clear">Clear</button></div>
            </div>
            <button type="button" class="like-toggle" id="log-like" aria-pressed="false">♥ Like</button>
          </div>
          <div class="field">
            <label for="log-review">Review <span style="font-weight:400;color:var(--muted)">(optional)</span></label>
            <textarea id="log-review" maxlength="5000" placeholder="Respect my authoritah… or don't."></textarea>
          </div>
          <label class="checkbox"><input type="checkbox" id="log-rewatch"> I've watched this before (rewatch)</label>
          <p class="notice" id="log-msg" hidden></p>
          <div class="actions">
            ${editing ? '<button type="button" class="btn btn-ghost" id="log-delete">Delete</button><span class="spacer"></span>' : ''}
            <button type="button" class="btn btn-ghost" data-close>Cancel</button>
            <button type="submit" class="btn btn-green" id="log-save">Save</button>
          </div>
        </form>`;

      const $d = (s) => d.querySelector(s);
      const date = $d('#log-date');
      const noDate = $d('#log-nodate');
      date.value = editing ? (log.watched_on || '') : todayISO();
      noDate.checked = editing && !log.watched_on;
      date.disabled = noDate.checked;
      noDate.onchange = () => { date.disabled = noDate.checked; };

      const starsCtl = starInput($d('#log-stars'), { value: log?.rating ?? null, label: 'Rating' });
      $d('#log-stars').setAttribute('aria-labelledby', 'rating-label');
      $d('#log-clear').onclick = () => { starsCtl.value = null; };

      const like = $d('#log-like');
      like.setAttribute('aria-pressed', String(!!log?.liked));
      like.onclick = () => like.setAttribute('aria-pressed', String(like.getAttribute('aria-pressed') !== 'true'));

      $d('#log-review').value = log?.review || '';
      $d('#log-rewatch').checked = editing ? log.is_rewatch : wasLogged;
      $d('[data-close]').onclick = () => d.close();

      $d('#log-delete')?.addEventListener('click', async () => {
        if (!confirm(line('deleteLog'))) return;
        const { error } = await supabase.from('logs').delete().eq('id', log.id);
        if (error) return showMsg(error.message);
        changed = true;
        d.close();
      });

      d.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const row = {
          episode_id: ep.id,
          watched_on: noDate.checked ? null : (date.value || null),
          rating: starsCtl.value,
          liked: like.getAttribute('aria-pressed') === 'true',
          review: $d('#log-review').value.trim() || null,
          is_rewatch: $d('#log-rewatch').checked,
        };
        if (row.watched_on && row.watched_on > todayISO()) return showMsg(line('futureDate'));
        const save = $d('#log-save');
        save.disabled = true;
        const { error } = editing
          ? await supabase.from('logs').update(row).eq('id', log.id)
          : await supabase.from('logs').insert(row);
        save.disabled = false;
        if (error) return showMsg(error.message);
        if (!editing) await supabase.from('watchlist').delete().eq('episode_id', ep.id);
        if (row.rating != null && row.rating !== log?.rating) {
          const [{ data: t }, { data: me }] = await Promise.all([
            supabase.from('episode_tags').select('tags(name)').eq('episode_id', ep.id),
            supabase.from('profiles').select('favourite_character').eq('id', (await supabase.auth.getUser()).data.user.id).maybeSingle(),
          ]);
          celebrate(row.rating, (t || []).map((x) => x.tags?.name).filter(Boolean), me?.favourite_character);
        }
        if (!editing && row.is_rewatch) towelieRewatch(supabase);
        changed = true;
        d.close();
      });

      function showMsg(text) {
        const m = $d('#log-msg');
        m.textContent = text;
        m.className = 'notice notice-error';
        m.hidden = false;
      }
    }
  });
}
