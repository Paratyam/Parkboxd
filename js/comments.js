// Comment threads with replies, shared by review pages (comments) and Butters' Book Club
// review (butters_comments). Replies show one level deep: a reply to a reply joins the same
// thread under the top comment, with an "@name" so it's clear who's being answered.
import { supabase } from './supabase.js?v=20261128081227';
import { esc, avatarHTML, toast } from './ui.js?v=20261128081227';

const when = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * threadHTML(comments, { me, canModerate }) -> HTML for an <ol class="comments">.
 *   comments: rows with id, user_id, parent_id, body, created_at, profiles(...)
 *   canModerate: the viewer may delete anyone's comment here (e.g. it's their review)
 */
export function threadHTML(comments, { me, canModerate = false } = {}) {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const rootOf = (c) => { let x = c; const seen = new Set(); while (x.parent_id && byId.has(x.parent_id) && !seen.has(x.id)) { seen.add(x.id); x = byId.get(x.parent_id); } return x; };
  const tops = comments.filter((c) => !c.parent_id || !byId.has(c.parent_id));
  const replies = new Map();
  for (const c of comments) if (!tops.includes(c)) {
    const r = rootOf(c);
    replies.set(r.id, [...(replies.get(r.id) || []), c]);
  }
  const one = (c, isReply) => {
    const parent = isReply && c.parent_id ? byId.get(c.parent_id) : null;
    const to = parent && parent.parent_id ? `<span class="reply-to">@${esc(parent.profiles?.display_name || parent.profiles?.username || '')}</span> ` : '';
    return `
      <li class="${isReply ? 'is-reply' : ''}" data-cid="${c.id}">
        ${avatarHTML(c.profiles, isReply ? 26 : 32)}
        <div class="body">
          <div class="meta">
            <a href="profile.html?u=${encodeURIComponent(c.profiles?.username || '')}"><strong>${esc(c.profiles?.display_name || c.profiles?.username)}</strong></a>
            <time datetime="${esc(c.created_at)}">${esc(when(c.created_at))}</time>
            <button type="button" class="link-button" data-reply="${c.id}" style="font-size:12px">Reply</button>
            ${c.user_id === me ? `<button type="button" class="link-button" data-edit="${c.id}" style="font-size:12px">Edit</button>` : ''}
            ${c.user_id === me || canModerate ? `<button type="button" class="link-button" data-delete="${c.id}" style="font-size:12px">Delete</button>` : ''}
          </div>
          <p data-body="${c.id}">${to}${esc(c.body)}</p>
          <div class="reply-box" data-reply-box="${c.id}"></div>
        </div>
      </li>`;
  };
  return `<ol class="comments">${tops.map((c) => `${one(c, false)}${replies.has(c.id) ? `<li class="replies"><ol class="comments">${replies.get(c.id).map((r) => one(r, true)).join('')}</ol></li>` : ''}`).join('')}</ol>`;
}

/**
 * wireThread(root, { table, extra, comments, onChange }) wires Reply / Edit / Delete.
 *   table: 'comments' or 'butters_comments'; extra: columns every new row needs ({ log_id } or { week_start })
 */
export function wireThread(root, { table, extra, comments, onChange }) {
  const byId = new Map(comments.map((c) => [c.id, c]));
  root.querySelectorAll('[data-reply]').forEach((b) => b.addEventListener('click', () => {
    const id = Number(b.dataset.reply);
    const box = root.querySelector(`[data-reply-box="${id}"]`);
    if (box.innerHTML) { box.innerHTML = ''; return; }
    const who = byId.get(id)?.profiles;
    box.innerHTML = `
      <div class="comment-edit">
        <textarea maxlength="2000" rows="2" aria-label="Reply to ${esc(who?.display_name || who?.username || 'comment')}" placeholder="Reply to ${esc(who?.display_name || who?.username || 'them')}…"></textarea>
        <div class="toolbar"><button type="button" class="btn btn-green" data-send>Reply</button><button type="button" class="btn btn-ghost" data-cancel>Cancel</button></div>
      </div>`;
    const ta = box.querySelector('textarea');
    ta.focus();
    box.querySelector('[data-cancel]').onclick = () => { box.innerHTML = ''; };
    box.querySelector('[data-send]').onclick = async (e) => {
      const body = ta.value.trim();
      if (!body) return toast('Write something first.');
      e.currentTarget.disabled = true;
      const { error } = await supabase.from(table).insert({ ...extra, body, parent_id: id });
      if (error) { e.currentTarget.disabled = false; return toast(error.message); }
      onChange();
    };
  }));
  root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
    const id = Number(b.dataset.edit);
    const p = root.querySelector(`[data-body="${id}"]`);
    p.outerHTML = `<div class="comment-edit" data-editing="${id}">
      <textarea maxlength="2000" rows="3" aria-label="Edit comment">${esc(byId.get(id)?.body || '')}</textarea>
      <div class="toolbar"><button type="button" class="btn btn-green" data-save>Save</button><button type="button" class="btn btn-ghost" data-cancel>Cancel</button></div>
    </div>`;
    const box = root.querySelector(`[data-editing="${id}"]`);
    const ta = box.querySelector('textarea');
    ta.focus();
    box.querySelector('[data-cancel]').onclick = () => onChange();
    box.querySelector('[data-save]').onclick = async (e) => {
      const body = ta.value.trim();
      if (!body) return toast('A comment needs some words. Or delete it instead.');
      e.currentTarget.disabled = true;
      const { error } = await supabase.from(table).update({ body }).eq('id', id);
      if (error) { e.currentTarget.disabled = false; return toast(error.message); }
      onChange();
    };
  }));
  root.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this comment? Its replies go with it. No take-backs.')) return;
    const { error } = await supabase.from(table).delete().eq('id', Number(b.dataset.delete));
    if (error) return toast(error.message);
    onChange();
  }));
}
