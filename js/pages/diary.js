import { initPage, logEpisode } from '../layout.js?v=20261127113852';
import { supabase } from '../supabase.js?v=20261127113852';
import { SITE_NAME } from '../config.js?v=20261127113852';
import { $, esc, params, epCode, stars, profileTabsHTML } from '../ui.js?v=20261127113852';
import { line } from '../jokes.js?v=20261127113852';

const { profile: me } = await initPage({ title: 'Diary', auth: 'required' });
const root = $('#diary');

const wanted = (params.get('u') || me.username).toLowerCase();
const { data: person } = await supabase.from('profiles').select('id, username, display_name').eq('username', wanted).maybeSingle();

if (!person) {
  root.innerHTML = `<div class="big-message"><h1 class="cut">Nobody by that name</h1><a class="btn btn-green" href="diary.html">Your diary</a></div>`;
  root.removeAttribute('aria-busy');
} else {
  await render();
  window.addEventListener('parkboxd:logged', render);
}

async function render() {
  const isMe = person.id === me.id;
  const name = person.display_name || person.username;
  document.title = `${isMe ? 'Your diary' : `${name}'s diary`} · ${SITE_NAME}`;

  const { data: logs } = await supabase.from('logs')
    .select('*, episodes(id, kind, season, number, title, air_date, still_path)')
    .eq('user_id', person.id)
    .order('watched_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1000);

  // Group by month; undated logs go last.
  const groups = new Map();
  for (const l of logs || []) {
    const key = l.watched_on ? l.watched_on.slice(0, 7) : 'undated';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }
  const monthName = (key) => key === 'undated' ? 'No date'
    : new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const body = logs?.length
    ? [...groups.entries()].map(([key, items]) => `
      <section class="diary-month">
        <h3>${esc(monthName(key))}</h3>
        <ol class="diary">
          ${items.map((l) => `
            <li>
              <span class="date">${l.watched_on ? esc(String(Number(l.watched_on.slice(8, 10)))) : '–'}</span>
              <span class="title" style="min-width:0">
                <a class="title" href="episode.html?id=${l.episodes.id}">${esc(l.episodes.title)}</a><span class="code">${esc(epCode(l.episodes))}</span>
                ${l.review ? `<span class="review-snippet">“${esc(l.review.length > 140 ? `${l.review.slice(0, 140)}…` : l.review)}”</span>` : ''}
              </span>
              <span class="rating" aria-label="${l.rating ? `${l.rating} stars` : 'No rating'}">${stars(l.rating)}</span>
              ${l.liked ? '<span class="heart" aria-label="Liked">♥</span>' : ''}
              ${l.is_rewatch ? '<span class="rewatch" title="Rewatch">↻</span>' : ''}
              ${isMe ? `<span class="actions"><button type="button" class="link-button" data-edit="${l.id}">Edit</button></span>` : ''}
            </li>`).join('')}
        </ol>
      </section>`).join('')
    : `<p class="empty">${esc(isMe ? line('diaryEmptyMine') : line('diaryEmptyOther', { name }))}</p>`;

  root.innerHTML = `
    <div>
      <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">${isMe ? 'Your diary' : `${esc(name)}'s diary`}</h1>
      ${profileTabsHTML(person.username, 'diary')}
    </div>
    <div>${body}</div>`;
  root.removeAttribute('aria-busy');

  root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
    const log = logs.find((l) => l.id === Number(b.dataset.edit));
    logEpisode({ episode: log.episodes, log });
  }));
}
