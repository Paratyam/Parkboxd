// Invite links (?invite=<username>): someone who joins through one follows the inviter.
// Only new accounts follow automatically, so clicking a link never changes an existing one.
import { supabase } from './supabase.js?v=20261127211246';
import { USERNAME_RE, params, toast } from './ui.js?v=20261127211246';
import { SITE_LINK } from './config.js?v=20261127211246';
import { inviteMessage } from './share-text.js?v=20261127211246';

const KEY = 'parkboxd-invite';
const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000;

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (name) => {
  try { if (name) localStorage.setItem(KEY, name); else localStorage.removeItem(KEY); } catch { /* not remembered */ }
};

/** The invite waiting to be used, if any (sign-up saves it on the new account). */
export const pendingInvite = () => (USERNAME_RE.test(read() || '') ? read() : null);

/** Call on every page load, before any redirect to the login page. */
export function captureInvite(session) {
  const name = (params.get('invite') || '').toLowerCase();
  if (!USERNAME_RE.test(name) || session) return;
  write(name);
  setTimeout(() => toast(`${name} invited you to Parkboxd! Sign up and you'll be following them.`, 9000), 600);
}

/** Once a new account has a username: follow whoever invited them, one time. */
export async function redeemInvite(session, profile) {
  if (!session || !profile?.username) return;
  const saved = session.user.user_metadata?.invited_by; // survives confirming the email elsewhere
  const isNew = Date.now() - new Date(profile.created_at) < NEW_ACCOUNT_MS;
  const name = String(saved || (isNew && pendingInvite()) || '').toLowerCase();
  if (!USERNAME_RE.test(name)) { write(null); return; }

  if (name !== profile.username) {
    const { data: host, error } = await supabase.from('profiles').select('id, username, display_name').eq('username', name).maybeSingle();
    if (error) return; // try again on the next page
    if (host) {
      const { error: followError } = await supabase.from('follows').insert({ followee_id: host.id });
      if (followError && followError.code !== '23505') return; // 23505: already following
      if (!followError) toast(`You're now following ${host.display_name || host.username}.`, 7000);
    }
  }
  write(null);
  if (saved) await supabase.auth.updateUser({ data: { invited_by: null } });
}

/** Share (or copy) your own invite link. */
export async function shareInvite(username) {
  const url = `https://${SITE_LINK}/?invite=${encodeURIComponent(username)}`;
  const text = inviteMessage(username); // the link is inside, so it always comes last
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      toast('Invite link copied. Paste it to a friend.');
    }
  } catch (e) {
    if (e?.name !== 'AbortError') toast(`Your invite link: ${url}`, 12000);
  }
}
