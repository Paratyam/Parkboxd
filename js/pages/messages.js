// messages.html?u=name: direct messages. You can only message people who follow you back
// (the database enforces it too). The open conversation checks for new messages every few seconds.
import { initPage, refreshMail } from '../layout.js?v=20261128081746';
import { supabase } from '../supabase.js?v=20261128081746';
import { $, esc, params, avatarHTML, toast } from '../ui.js?v=20261128081746';
import { loadAllEpisodes } from '../episodes.js?v=20261128081746';
import { loadStreaks, plantSVG } from '../streak.js?v=20261128081746';
import { messageHTML, previewText } from '../dm-cards.js?v=20261128081746';
import { presenceAvatar, presenceText, showPresence } from '../presence.js?v=20261128081746';

const { user } = await initPage({ title: 'Messages', auth: 'required' });
const root = $('#messages');
const me = user.id;
let withName = (params.get('u') || '').toLowerCase();
let poll = null;
let shown = false;
const byId = new Map((await loadAllEpisodes()).map((e) => [e.id, e]));

let streaks = null; // friends' Tegridy streaks, loaded once per visit
const streakBadge = (id) => {
  const s = streaks?.get(id);
  if (!s) return '';
  const label = `Tegridy streak: ${s.current} day${s.current === 1 ? '' : 's'}`;
  return `<span class="dm-streak" title="${label}" aria-label="${label}" role="img">${plantSVG(s.current)}<b>${s.current}</b></span>`;
};

const CARTMAN_LINES = [
  'Heard that through the grapevine, did you?',
];

const ago = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

async function load() {
  // People who follow you AND whom you follow.
  const [{ data: out }, { data: inc }] = await Promise.all([
    supabase.from('follows').select('followee_id').eq('follower_id', me),
    supabase.from('follows').select('follower_id').eq('followee_id', me),
  ]);
  const following = new Set((out || []).map((f) => f.followee_id));
  const followers = new Set((inc || []).map((f) => f.follower_id));
  const mutualIds = [...following].filter((id) => followers.has(id));
  const [{ data: people }, { data: msgs }] = await Promise.all([
    mutualIds.length ? supabase.from('profiles').select('id, username, display_name, avatar_color, avatar_icon').in('id', mutualIds) : Promise.resolve({ data: [] }),
    supabase.from('messages').select('id, sender_id, recipient_id, body, read, created_at').or(`sender_id.eq.${me},recipient_id.eq.${me}`).order('created_at', { ascending: false }).limit(500),
  ]);
  return { following, followers, people: people || [], msgs: msgs || [] };
}

async function render() {
  const { following, followers, people, msgs } = await load();
  // Streaks are decoration: a failure must not stop the messages showing.
  streaks ||= await loadStreaks(people.map((p) => p.id)).catch(() => null);
  const other = (m) => (m.sender_id === me ? m.recipient_id : m.sender_id);
  const convos = people.map((p) => {
    const mine = msgs.filter((m) => other(m) === p.id);
    return { p, last: mine[0], unread: mine.filter((m) => m.recipient_id === me && !m.read).length };
  }).sort((a, b) => (b.last?.created_at || '').localeCompare(a.last?.created_at || '') || (a.p.display_name || a.p.username).localeCompare(b.p.display_name || b.p.username));

  // Who's open: ?u=name, else the most recent conversation.
  let current = convos.find((c) => c.p.username === withName)?.p || null;
  let notMutual = null;
  if (withName && !current) {
    const { data: someone } = await supabase.from('profiles').select('id, username, display_name, avatar_color, avatar_icon').eq('username', withName).maybeSingle();
    if (someone && someone.id !== me) notMutual = { p: someone, iFollow: following.has(someone.id), theyFollow: followers.has(someone.id) };
  }
  // Not on phones: the chat sits below the list, so it would be marked read without being seen.
  if (!current && !notMutual && convos[0]?.last && !matchMedia('(max-width: 760px)').matches) current = convos[0].p;

  root.innerHTML = `
    <section class="dm-head">
      <h1 class="cut">Messages</h1>
      <p class="dm-cartman"><span aria-hidden="true">🍗</span> “${esc(CARTMAN_LINES[0])}” <span>— Cartman, reading over your shoulder</span></p>
      <p class="result-count">You can message anyone who follows you back. It's private: just the two of you. (Cartman is kidding. Probably.)</p>
    </section>
    <div class="dm-layout">
      <aside class="dm-list" aria-label="Conversations">
        ${convos.length ? convos.map((c) => `
          <a class="dm-person${current?.id === c.p.id ? ' active' : ''}" href="messages.html?u=${encodeURIComponent(c.p.username)}">
            ${presenceAvatar(c.p.id, avatarHTML(c.p, 38))}
            <span class="dm-who"><strong>${esc(c.p.display_name || c.p.username)}</strong>
              <small>${c.last ? `${c.last.sender_id === me ? 'You: ' : ''}${esc(previewText(c.last.body, byId))}` : 'Say hi!'}</small>
              ${presenceText(c.p.id)}</span>
            ${streakBadge(c.p.id)}
            ${c.unread ? `<span class="dm-unread">${c.unread}</span>` : c.last ? `<time>${ago(c.last.created_at)}</time>` : ''}
          </a>`).join('')
          : `<p class="empty">Nobody to message yet. You need people who follow you <em>and</em> who you follow back. <a href="friends.html?tab=everyone">Find people</a></p>`}
      </aside>
      <section class="dm-thread" id="dm-thread" aria-live="polite">
        ${notMutual ? `
          <div class="dm-empty">${avatarHTML(notMutual.p, 56)}
            <p><strong>You can't message ${esc(notMutual.p.display_name || notMutual.p.username)} yet.</strong></p>
            <p>${notMutual.iFollow ? '' : 'You need to follow them. '}${notMutual.theyFollow ? '' : 'They need to follow you back. '}Messages are only for people who follow each other.</p>
            <a class="btn btn-ghost" href="profile.html?u=${encodeURIComponent(notMutual.p.username)}">Go to their profile</a>
          </div>`
          : current ? threadHTML(current, msgs.filter((m) => other(m) === current.id).reverse())
            : '<div class="dm-empty"><p>Pick someone to start talking.</p></div>'}
      </section>
    </div>`;
  root.removeAttribute('aria-busy');
  showPresence(root);
  if (current) {
    current.newestId = msgs.find((m) => other(m) === current.id)?.id; // msgs are newest first
    wireThread(current);
  }
  // Phones stack the list above the chat: bring an opened chat into view, once.
  if (!shown && params.get('u') && matchMedia('(max-width: 760px)').matches) $('#dm-thread').scrollIntoView({ block: 'start' });
  shown = true;
}

function threadHTML(p, list) {
  return `
    <div class="dm-thread-head"><a href="profile.html?u=${encodeURIComponent(p.username)}">${presenceAvatar(p.id, avatarHTML(p, 32))} <span class="dm-head-who"><strong>${esc(p.display_name || p.username)}</strong>${presenceText(p.id)}</span></a>${streakBadge(p.id)}</div>
    <ol class="dm-bubbles" id="dm-bubbles">${list.length ? list.map((m) => `
      <li class="${m.sender_id === me ? 'mine' : 'theirs'}">${messageHTML(m.body, byId)}<time datetime="${esc(m.created_at)}">${ago(m.created_at)}</time></li>`).join('')
      : `<li class="dm-start">This is the start of your conversation with ${esc(p.display_name || p.username)}. Don't make it weird.</li>`}</ol>
    <form class="dm-compose" id="dm-compose" autocomplete="off">
      <label class="visually-hidden" for="dm-text">Message ${esc(p.display_name || p.username)}</label>
      <textarea id="dm-text" rows="1" maxlength="2000" placeholder="Message ${esc(p.display_name || p.username)}…"></textarea>
      <button type="submit" class="btn btn-green">Send</button>
    </form>`;
}

async function wireThread(p) {
  const box = $('#dm-bubbles');
  box.scrollTop = box.scrollHeight;
  // Opening the conversation reads it.
  await supabase.from('messages').update({ read: true }).eq('recipient_id', me).eq('sender_id', p.id).eq('read', false);
  refreshMail();
  const ta = $('#dm-text');
  // Not on touch screens: the keyboard would pop up and cover the conversation.
  if (matchMedia('(pointer: fine)').matches) ta.focus();
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#dm-compose').requestSubmit(); } });
  $('#dm-compose').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = ta.value.trim();
    if (!body) return;
    const btn = e.submitter || $('#dm-compose button');
    btn.disabled = true;
    const { error } = await supabase.from('messages').insert({ recipient_id: p.id, body });
    btn.disabled = false;
    if (error) return toast(error.message.includes('row-level security') ? 'You can only message people who follow you back.' : error.message);
    withName = p.username;
    try { history.replaceState(null, '', `messages.html?u=${encodeURIComponent(p.username)}`); } catch { /* address bar only */ }
    render();
  });
  // Check for new messages while the page is open.
  clearInterval(poll);
  const newest = p.newestId;
  poll = setInterval(async () => {
    if (document.hidden || $('#dm-text')?.value) return; // don't redraw while typing
    const { data } = await supabase.from('messages').select('id')
      .or(`and(sender_id.eq.${me},recipient_id.eq.${p.id}),and(sender_id.eq.${p.id},recipient_id.eq.${me})`)
      .order('created_at', { ascending: false }).limit(1);
    if (data?.length && data[0].id !== newest) render();
  }, 6000);
}

await render();
