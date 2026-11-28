// Stan's site tour, worked out in the browser like the Book Club notes (js/club-notes.js, which
// merges these into the bell and the notifications page). New members get a welcome, then at most
// one note per day they visit (or all at once with a speedrun), skipping features they've already
// used, except the finale. Members who joined before the tour existed only get an invite. State
// (including which tour notes were read or cleared) is saved on the account (auth user metadata)
// so it follows you across devices; localStorage is the working copy.
import { supabase } from './supabase.js?v=20261128091302';

const LAUNCH = '2026-11-27T00:00:00Z'; // accounts older than this are invited, not enrolled

const WELCOME = {
  id: 'welcome', href: 'notifications.html',
  text: "Hey, I'm showing you around Parkboxd. One tip a day, or hit “Speedrun the tour” up top to get it all now. Annoying? Hit “End the tour”. I won't take it personally, dude.",
};

// `used` lists the tables that show someone has already found the feature. The last stop is the
// goodbye, so it has none: it's never skipped.
const STEPS = [
  { id: 'log', href: 'episodes.html', used: [['logs', 'user_id']],
    text: "📺 Start here: find an episode you've seen and log it. Rating, review, whatever. Most of the cool stuff runs on that." },
  { id: 'club', href: 'club.html', used: [['club_votes', 'user_id'], ['butters_likes', 'user_id']],
    text: "📚 Butters runs a Book Club, except the books are episodes. Watch this week's pick and vote on the next one. He gets really excited." },
  { id: 'cage', href: 'cage.html', used: [['cage_votes', 'user_id']],
    text: "🥊 Cartman's Cage Match: pick the better of two episodes you've watched and your own ranking builds itself. He talks the whole time. Sorry." },
  { id: 'mystery', href: 'mystery.html', used: [['mystery_plays', 'user_id']],
    text: "🔍 There's a new mystery episode to guess every day. It's Kenny's thing. Don't ask me to repeat the clues he gives." },
  { id: 'report', href: 'stats.html',
    text: "🍎 Your Stats page has your streak and a report card from Mr. Garrison. Seriously, don't take the grades personally." },
  { id: 'badges', href: 'profile.html',
    text: "🏅 Check out the badges on your profile. Some of them unlock cool stuff, like a gold ring around your picture, a tag next to your name, or a secret mode. I'm not spoiling how you get them all, dude." },
  { id: 'friends', href: 'friends.html',
    text: "🤝 Last stop: find your friends and follow them, so you can see what they're watching. That's the tour, but there's a ton of other cool stuff on here, so go explore and find it. You're good, dude." },
];

const key = (userId) => `parkboxd-tour-${userId}`;
const load = (userId) => { try { return JSON.parse(localStorage.getItem(key(userId))); } catch { return null; } };
const store = (userId, state) => localStorage.setItem(key(userId), JSON.stringify(state));
const today = () => new Date().toDateString();

let pushing = Promise.resolve();
function push(state) {
  pushing = pushing.then(() => supabase.auth.updateUser({ data: { tour: state } })).catch(() => {});
  return pushing;
}
function save(userId, state) {
  const next = { ...state, updated: Date.now() };
  store(userId, next);
  return push(next);
}

// Read and cleared flags this browser saved before they were kept on the account.
const oldFlags = (name, userId) => {
  try { return JSON.parse(localStorage.getItem(`parkboxd-club-${name}-${userId}`) || '[]').filter((id) => id.startsWith('tour-')); } catch { return []; }
};

async function pull(userId) {
  const { data, error } = await supabase.auth.getUser(); // fresh from the server, not the saved session
  if (error || data.user?.id !== userId) return false;
  const remote = data.user.user_metadata?.tour;
  const local = load(userId);
  if (!remote && !local) return true;
  // The newer copy wins. A copy from before syncing wins if it is further along.
  const useLocal = !remote || (local && ((!local.updated && (local.sent?.length || 0) > (remote.sent?.length || 0))
    || (local.updated || 0) > (remote.updated || 0)));
  const state = { ...(useLocal ? local : remote) };
  const union = (field, old) => [...new Set([...(remote?.[field] || []), ...(local?.[field] || []), ...oldFlags(old, userId)])].slice(-40);
  state.read = union('read', 'seen');
  state.hidden = union('hidden', 'hidden');
  state.updated ||= Date.now();
  store(userId, state);
  if (JSON.stringify(state) !== JSON.stringify(remote)) await push(state);
  return true;
}

let pulled;
/** Fetch the account's copy once per page. Resolves false if it couldn't be reached. */
export function syncTour(userId) {
  pulled ||= pull(userId).catch(() => false);
  return pulled;
}

/** Tour note ids the person has read ('read') or cleared ('hidden'), on any device. */
export const tourFlags = (userId, field) => load(userId)?.[field] || [];

export function flagTourNotes(userId, field, ids) {
  const state = load(userId);
  if (!state) return;
  const have = state[field] || [];
  const fresh = ids.filter((id) => id.startsWith('tour-') && !have.includes(id));
  if (fresh.length) save(userId, { ...state, [field]: [...have, ...fresh].slice(-40) });
}

function newRun(replay) {
  const now = new Date().toISOString();
  return { status: 'on', run: Date.now(), replay, day: today(), sent: [{ id: WELCOME.id, at: now }], skipped: [] };
}

async function alreadyUsed(userId, step) {
  const counts = await Promise.all((step.used || []).map(([table, column]) =>
    supabase.from(table).select(column, { count: 'exact', head: true }).eq(column, userId)));
  return counts.some((r) => r.count > 0);
}

// Tours saved before the finale became unskippable may list it as skipped: ignore that.
const FINALE = STEPS[STEPS.length - 1].id;
const handled = (state) => new Set([...state.sent.map((s) => s.id), ...state.skipped.filter((id) => id !== FINALE)]);
const nextStep = (state) => STEPS.find((s) => !handled(state).has(s.id));

// First sight of this person anywhere: start the tour, or leave an invite.
async function firstState(userId) {
  const { data } = await supabase.from('profiles').select('created_at').eq('id', userId).maybeSingle();
  if (!data?.created_at) return null;
  return load(userId) || (new Date(data.created_at) >= new Date(LAUNCH)
    ? newRun(false)
    : { status: 'invited', at: new Date().toISOString() });
}

// Adds today's note if one is due.
async function advance(userId) {
  const synced = await syncTour(userId);
  let state = load(userId);
  if (!state) {
    if (!synced) return null; // can't tell whether the welcome was already sent
    state = await firstState(userId);
    if (state) save(userId, state);
    return state;
  }
  if (state.status !== 'on' || state.day === today()) return state;
  const skipped = [];
  let step = nextStep(state);
  while (step && !state.replay && await alreadyUsed(userId, step)) {
    skipped.push(step.id);
    step = nextStep({ ...state, skipped: [...state.skipped, ...skipped] });
  }
  // Re-read: another call (or "End the tour") may have changed things while we were checking.
  const fresh = load(userId);
  if (!fresh || fresh.status !== 'on' || fresh.run !== state.run || fresh.day === today()) return fresh;
  fresh.skipped.push(...skipped);
  if (step) {
    fresh.sent.push({ id: step.id, at: new Date().toISOString() });
    fresh.day = today();
  }
  save(userId, fresh);
  return fresh;
}

/** [{ id, from, text, href, created_at }] for the bell and the notifications page. */
export async function tourNotes(userId) {
  const state = await advance(userId);
  if (!state) return [];
  if (state.status === 'invited') {
    return [{ id: 'tour-invite', from: 'stan', href: 'notifications.html?tour=start', created_at: state.at,
      text: "Hey, want a tour of the site? One tip a day, or speedrun it all at once. Tap here if you're in." }];
  }
  return (state.sent || []).map((s) => {
    const note = s.id === WELCOME.id ? WELCOME : STEPS.find((x) => x.id === s.id);
    return note && { id: `tour-${state.run}-${s.id}`, from: 'stan', href: note.href, text: note.text, created_at: s.at };
  }).filter(Boolean);
}

/** 'on' (more tips coming), 'done', 'off', 'invited' or 'none'. */
export function tourStatus(userId) {
  const state = load(userId);
  if (!state) return 'none';
  return state.status === 'on' && !nextStep(state) ? 'done' : state.status;
}

/** Start from the welcome. Running it again replays every stop, used or not. */
export function startTour(userId) {
  return save(userId, newRun(Boolean(load(userId)?.run)));
}

/** Every remaining stop right now. Starts the tour first if it isn't running. */
export async function speedrunTour(userId) {
  if (tourStatus(userId) !== 'on') startTour(userId);
  const state = load(userId);
  const sending = [];
  const skipped = [];
  for (const step of STEPS.filter((s) => !handled(state).has(s.id))) {
    const skip = !state.replay && await alreadyUsed(userId, step);
    (skip ? skipped : sending).push(step.id);
  }
  const fresh = load(userId);
  if (!fresh || fresh.status !== 'on' || fresh.run !== state.run) return;
  const ids = [...new Set([...fresh.sent.map((s) => s.id), ...sending])];
  // The list shows newest first, so date them backwards: it then reads welcome to goodbye.
  const now = Date.now();
  fresh.sent = ids.map((id, i) => ({ id, at: new Date(now - i).toISOString() }));
  fresh.skipped.push(...skipped);
  fresh.day = today();
  save(userId, fresh);
}

/** No more tips. Ones already delivered stay in the list. */
export function endTour(userId) {
  const state = load(userId) || {};
  return save(userId, { ...state, status: 'off', sent: state.sent || [], skipped: state.skipped || [] });
}
