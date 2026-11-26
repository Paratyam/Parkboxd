// friends.html?u=name&tab=following|followers|everyone
import { initPage } from '../layout.js';
import { supabase } from '../supabase.js';
import { SITE_NAME } from '../config.js';
import { $, esc, params, avatarHTML } from '../ui.js';
import { followingIds, followButtonHTML, wireFollowButtons } from '../social.js';

const { profile: me } = await initPage({ title: 'Friends', auth: 'required' });
const root = $('#friends');

const wanted = (params.get('u') || me.username).toLowerCase();
let tab = params.get('tab');

async function render() {
  const [{ data: people }, { data: follows }, { data: stats }, mine] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, avatar_color, bio').not('username', 'is', null),
    supabase.from('follows').select('follower_id, followee_id'),
    supabase.from('user_stats').select('user_id, episodes_watched, review_count'),
    followingIds(me.id),
  ]);
  const person = (people || []).find((p) => p.username === wanted);
  if (!person) {
    root.innerHTML = `<div class="big-message"><h1 class="cut">Nobody by that name</h1><a class="btn btn-green" href="friends.html">Your friends</a></div>`;
    root.removeAttribute('aria-busy');
    return;
  }
  const isMe = person.id === me.id;
  const name = person.display_name || person.username;
  const byId = new Map(people.map((p) => [p.id, p]));
  const statsBy = new Map((stats || []).map((s) => [s.user_id, s]));
  const following = (follows || []).filter((f) => f.follower_id === person.id).map((f) => byId.get(f.followee_id)).filter(Boolean);
  const followers = (follows || []).filter((f) => f.followee_id === person.id).map((f) => byId.get(f.follower_id)).filter(Boolean);
  const everyone = people.filter((p) => p.id !== me.id);

  if (!tab) tab = isMe && !following.length ? 'everyone' : 'following';
  const lists = { following, followers, everyone };
  const list = (lists[tab] || following).sort((a, b) => (a.display_name || a.username).localeCompare(b.display_name || b.username));
  document.title = `${isMe ? 'Friends' : `${name}'s friends`} · ${SITE_NAME}`;

  const tabs = [
    ['following', `Following · ${following.length}`],
    ['followers', `Followers · ${followers.length}`],
    ...(isMe ? [['everyone', `Find people · ${everyone.length}`]] : []),
  ];
  const u = encodeURIComponent(person.username);

  root.innerHTML = `
    <div>
      <h1 class="cut" style="margin:0 0 14px;color:var(--white);font-size:clamp(30px,4vw,44px)">${isMe ? 'Friends' : `${esc(name)}'s friends`}</h1>
      <nav class="profile-tabs" aria-label="Friends lists">
        ${tabs.map(([key, label]) => `<a href="friends.html?u=${u}&tab=${key}"${key === tab ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('')}
      </nav>
    </div>
    ${list.length ? `<ul class="people">${list.map((p) => {
      const s = statsBy.get(p.id);
      return `<li>
        <a href="profile.html?u=${encodeURIComponent(p.username)}" aria-hidden="true" tabindex="-1">${avatarHTML(p, 48)}</a>
        <div class="who">
          <a href="profile.html?u=${encodeURIComponent(p.username)}">${esc(p.display_name || p.username)}</a>
          <span>@${esc(p.username)} · ${s?.episodes_watched ?? 0} watched · ${s?.review_count ?? 0} reviews</span>
        </div>
        ${p.id === me.id ? '<span class="result-count">You</span>' : followButtonHTML(p.id, mine.has(p.id))}
      </li>`;
    }).join('')}</ul>`
    : `<p class="empty">${tab === 'following' ? (isMe ? 'You\'re not following anyone yet. Try "Find people".' : `${esc(name)} isn't following anyone yet.`)
      : tab === 'followers' ? 'No followers yet.' : 'Nobody else has signed up yet. Send your friends the link!'}</p>`}`;
  root.removeAttribute('aria-busy');
  wireFollowButtons(root);
}

await render();
