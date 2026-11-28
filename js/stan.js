// Stan's Picks: episodes you haven't logged, picked from people with your taste and from your
// own favourites. Pure logic only; the box itself is js/stan-box.js.
import { tasteMatch } from './insights.js?v=20261128092736';
import { isAired } from './episodes.js?v=20261128092736';

const POOL = 20; // each day's picks rotate within the best this many
const FAV_SLOTS = 2; // picks reserved for "because you loved ..."
const CLOSE_MATCH = 75; // only then does Stan say your tastes are close
const PRIOR_WEIGHT = 0.6; // how hard a thinly backed score is pulled towards the site average

/** How much someone's ratings count for you: close taste on many shared episodes counts most. */
export function tasteWeight(tm) {
  if (tm?.score == null) return 0.05;
  const closeness = Math.min(1, Math.max(0, (tm.score - 60) / 35)) ** 2; // 70% ≈ .08, 90% ≈ .73
  const trust = tm.shared / (tm.shared + 5);
  return Math.max(0.05, closeness * trust);
}

// Small stable hash, so the picks change daily but not on every reload.
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return (h ^ (h >>> 13)) >>> 0;
}

const rotate = (list, n, seed) => list.slice(0, POOL)
  .map((p) => [hash(`${seed}:${p.ep.id}`), p])
  .sort((a, b) => a[0] - b[0])
  .slice(0, n)
  .map(([, p]) => p);

function peoplePicks({ meId, everyone, candidate, byId, names }) {
  const mine = everyone.get(meId) || new Map();
  let total = 0;
  let count = 0;
  const pool = new Map();
  for (const [uid, theirs] of everyone) {
    for (const r of theirs.values()) { total += r; count++; }
    if (uid === meId) continue;
    const tm = tasteMatch(mine, theirs);
    const person = { uid, weight: tasteWeight(tm), match: tm?.score ?? null };
    for (const [id, r] of theirs) {
      if (!candidate(id)) continue;
      const x = pool.get(id) || { sum: 0, w: 0, fans: [] };
      x.sum += person.weight * r;
      x.w += person.weight;
      if (r >= 4) x.fans.push({ ...person, r });
      pool.set(id, x);
    }
  }
  const prior = count ? total / count : 3;
  return [...pool.entries()]
    .filter(([, x]) => x.fans.length) // somebody has to actually love it
    .map(([id, x]) => {
      const fans = x.fans.sort((a, b) => b.weight - a.weight || b.r - a.r);
      const top = fans[0];
      const name = names.get(top.uid) || 'Someone';
      const match = top.match != null ? ` (${top.match}% match)` : '';
      const more = fans.length > 1 ? ` +${fans.length - 1} more` : '';
      return {
        kind: 'people',
        ep: byId.get(id),
        score: (x.sum + PRIOR_WEIGHT * prior) / (x.w + PRIOR_WEIGHT),
        name,
        close: top.match != null && top.match >= CLOSE_MATCH,
        reason: `${name}${match} gave it ★${top.r}${more}`,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// Episodes that share a story arc or the less common characters with something you loved.
function favouritePicks({ mine, all, candidate, byId, avgs, byEpisode, byName, arcs }) {
  let loved = [...mine].filter(([id, r]) => r >= 4.5 && byId.has(id));
  if (!loved.length) loved = [...mine].filter(([id, r]) => r >= 4 && byId.has(id));
  const common = all.length * 0.25; // the main kids are in everything, so they say nothing
  const best = new Map();
  for (const [favId, r] of loved) {
    const found = new Map(); // epId -> { sim, why, top }
    for (const name of byEpisode.get(favId) || []) {
      const eps = byName.get(name);
      if (!eps || eps.size > common) continue;
      const rarity = Math.log(all.length / eps.size);
      for (const id of eps) {
        const x = found.get(id) || { sim: 0, why: '', top: 0 };
        x.sim += rarity;
        if (rarity > x.top) { x.top = rarity; x.why = `more ${name}`; }
        found.set(id, x);
      }
    }
    for (const arc of arcs) {
      if (!arc.episodeIds.includes(favId)) continue;
      for (const id of arc.episodeIds) {
        const x = found.get(id) || { sim: 0, why: '', top: 0 };
        x.sim += 8;
        x.why = 'same story';
        x.top = Infinity;
        found.set(id, x);
      }
    }
    const fav = byId.get(favId);
    for (const [id, x] of found) {
      if (!candidate(id) || x.sim < 2) continue;
      const avg = avgs.get(id)?.avg;
      if (avg != null && avg < 3) continue;
      const score = x.sim + 2 * (r - 4) + ((avg ?? 3.5) - 3.5);
      if (score > (best.get(id)?.score ?? -Infinity)) {
        best.set(id, { kind: 'fav', ep: byId.get(id), score, fav, reason: `Because you loved ${fav.title}: ${x.why}` });
      }
    }
  }
  // At most three per favourite, so one episode doesn't fill the whole list.
  const per = new Map();
  return [...best.values()].sort((a, b) => b.score - a.score).filter((p) => {
    per.set(p.fav.id, (per.get(p.fav.id) || 0) + 1);
    return per.get(p.fav.id) <= 3;
  });
}

function sitePicks({ candidate, byId, avgs }) {
  return [...avgs.entries()]
    .filter(([id, a]) => candidate(id) && a.count >= 2 && a.avg >= 4)
    .sort((a, b) => b[1].avg - a[1].avg || b[1].count - a[1].count)
    .map(([id, a]) => ({ kind: 'site', ep: byId.get(id), score: a.avg, reason: `Site favourite: ★${a.avg.toFixed(1)} from ${a.count}` }));
}

/**
 * stanPicks(opts) -> [{ kind: 'people'|'fav'|'site', ep, reason, ... }], best backed first.
 *   everyone: Map(userId -> Map(episodeId -> stars)); seen: Set of episode ids you've logged;
 *   hidden: Set of ids you said "not for me" to; avgs: Map(episodeId -> { avg, count });
 *   byEpisode / byName: character tags; arcs: [{ episodeIds }]; day: number that drives rotation.
 */
export function stanPicks({ meId, everyone, seen, hidden = new Set(), all, avgs, names = new Map(), byEpisode = new Map(), byName = new Map(), arcs = [], day = 0, limit = 6 }) {
  const byId = new Map(all.map((e) => [e.id, e]));
  const candidate = (id) => !seen.has(id) && !hidden.has(id) && byId.has(id) && isAired(byId.get(id));
  const seed = `${meId}:${day}`;
  const mine = everyone.get(meId) || new Map();

  const people = peoplePicks({ meId, everyone, candidate, byId, names });
  const favs = favouritePicks({ mine, all, candidate, byId, avgs, byEpisode, byName, arcs });

  const picks = [];
  const have = new Set();
  const add = (list, n) => {
    const fresh = list.filter((p) => !have.has(p.ep.id));
    for (const p of rotate(fresh, Math.max(0, Math.min(n, limit - picks.length)), seed)) {
      picks.push(p);
      have.add(p.ep.id);
    }
  };
  add(people, limit - Math.min(FAV_SLOTS, favs.length));
  add(favs, limit - picks.length);
  add(people, limit - picks.length);
  add(sitePicks({ candidate, byId, avgs }), limit - picks.length);

  const order = { people: 0, fav: 1, site: 2 };
  return picks.sort((a, b) => order[a.kind] - order[b.kind] || b.score - a.score);
}

/** What Stan says, based on where the first pick really came from. */
export function stanLine(picks, seed = 0) {
  const p = picks[0];
  if (!p) return "Dude, that's all I've got. Go log some stuff.";
  const t = `“${p.ep.title}”`;
  let lines;
  if (p.kind === 'people' && p.close) {
    lines = [
      `Dude, start with ${t}. ${p.name} loved it, and you two have pretty close taste.`,
      `Okay, real talk. ${p.name} usually agrees with you, and they loved ${t}.`,
    ];
  } else if (p.kind === 'people') {
    lines = [
      `${p.name} really liked ${t}. I can't promise your taste matches, dude, but it's worth a shot.`,
      `Try ${t}. ${p.name} loved it. That's what I've got so far.`,
    ];
  } else if (p.kind === 'fav') {
    lines = [
      `I'm going off stuff you loved. You liked “${p.fav.title}”, so try ${t}.`,
      `Dude, if “${p.fav.title}” worked for you, give ${t} a shot.`,
    ];
  } else {
    lines = ["I don't know your taste yet, dude. These are just what people here rate highest."];
  }
  return lines[seed % lines.length];
}
