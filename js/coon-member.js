// Has the signed-in user earned the 🦝 Coon & Friends badge (watched the whole Coon saga)?
// Members get VIP treatment during Coon takeovers and their own phase in the franchise plan.
import { supabase } from './supabase.js?v=20261127081202';
import { loadAllEpisodes } from './episodes.js?v=20261127081202';

export const COON_SAGA = ['The Coon', 'Coon 2: Hindsight', 'Mysterion Rises', 'Coon vs. Coon & Friends'];
const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

let cached;

/** Resolves to { username, name } for a member, or null. */
export function coonMember() {
  cached ||= (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const titles = COON_SAGA.map(norm);
    const saga = (await loadAllEpisodes()).filter((e) => e.kind === 'episode' && titles.includes(norm(e.title)));
    if (saga.length < COON_SAGA.length) return null;
    const [{ data: logs }, { data: me }] = await Promise.all([
      supabase.from('logs').select('episode_id').eq('user_id', user.id).in('episode_id', saga.map((e) => e.id)),
      supabase.from('profiles').select('username, display_name').eq('id', user.id).maybeSingle(),
    ]);
    const seen = new Set((logs || []).map((l) => l.episode_id));
    if (!saga.every((e) => seen.has(e.id)) || !me?.username) return null;
    return { username: me.username, name: me.display_name || me.username };
  })().catch(() => null);
  return cached;
}
