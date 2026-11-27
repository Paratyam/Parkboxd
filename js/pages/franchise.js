// franchise.html: The Coon's (completely self-serving) plan for the Coon & Friends franchise.
import { initPage } from '../layout.js?v=20261127194038';
import { $, esc, epCode } from '../ui.js?v=20261127194038';
import { loadAllEpisodes, myLogMap, thumbHTML } from '../episodes.js?v=20261127194038';
import { coonMember } from '../coon-member.js?v=20261127194038';

const { user } = await initPage({ title: "The Coon's Franchise Plan", auth: 'required' });
const root = $('#franchise');

// title: matched against real episodes; null = "in development" (doesn't exist).
const PHASES = [
  { phase: 'Phase 1', title: 'The Coon', note: 'The origin story. Obviously it goes first. Everything else is just a sequel to greatness.' },
  { phase: 'Phase 2', title: 'Coon 2: Hindsight', note: 'The Coon gets friends. The friends are fine. The Coon is still the best one.' },
  { phase: 'Phase 3', title: 'Coon vs. Coon & Friends', note: 'Spoiler: The Coon wins. The Coon always wins.' },
  { phase: 'Phase 4', title: 'Mysterion Rises', note: 'Only if Mysterion behaves. He will not behave.' },
  { phase: 'Phase 5', title: 'Franchise Prequel', note: 'Coon and Friends go corporate. Netflix deal pending, lawyers involved.' },
  { phase: 'Phase 6', title: null, note: 'The Coon 2: Electric Boogaloo. In development. Coming whenever The Coon feels like it.' },
  { phase: 'Phase 7', title: null, note: 'Mysterion: The Movie. Cancelled. Budget reassigned to The Coon.' },
];

const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
const [all, mine] = await Promise.all([loadAllEpisodes(), myLogMap(user.id)]);
const byTitle = new Map(all.filter((e) => e.kind === 'episode').map((e) => [norm(e.title), e]));
const rows = PHASES.map((p) => ({ ...p, ep: p.title ? byTitle.get(norm(p.title)) : null }));
// Members of Coon & Friends (badge holders) get a phase of their own.
const member = await coonMember();
if (member) rows.push({ phase: 'Phase 8', spinoff: `${member.name}'s spin-off`, note: 'Approved by The Coon (reluctantly). Budget: whatever is left after Phase 6.', ep: null });
const real = rows.filter((r) => r.ep);
const seen = real.filter((r) => mine.has(r.ep.id)).length;

root.innerHTML = `
  <div class="coon-takeover paper" style="padding:22px 26px;border-bottom:0">
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <span style="font-size:48px" aria-hidden="true">🦝</span>
      <div style="flex:1;min-width:220px">
        <h1 class="cut" style="margin:0;color:#fff;font-size:clamp(30px,5vw,44px);line-height:1.05">The Coon's Franchise Plan</h1>
        <p style="margin:6px 0 0;color:#d9cfc5">Approved by The Coon. Not approved by anyone else. You've seen ${seen} of ${real.length} released phases.</p>
      </div>
    </div>
  </div>
  <ol class="rank-table">
    ${rows.map((r, i) => `
      <li${r.ep && mine.has(r.ep.id) ? ' aria-label="watched"' : ''}>
        <span class="pos">${i + 1}</span>
        ${r.ep
          ? `<a href="episode.html?id=${r.ep.id}" class="thumb" aria-hidden="true" tabindex="-1">${thumbHTML(r.ep, { showTitle: false })}</a>`
          : `<div class="thumb"><div class="ep-thumb paper" style="background-color:${r.spinoff ? 'var(--yellow)' : 'var(--surface)'};display:flex;align-items:center;justify-content:center;color:${r.spinoff ? 'var(--bg)' : 'var(--muted)'};font-size:${r.spinoff ? '26px' : '12px'};font-weight:700">${r.spinoff ? '⭐' : 'TBA'}</div></div>`}
        <div class="info">
          <a ${r.ep ? `href="episode.html?id=${r.ep.id}"` : ''} style="${r.ep || r.spinoff ? '' : 'color:var(--muted)'}">${esc(r.phase)}: ${esc(r.ep?.title || r.spinoff || 'Coming soon(ish)')}</a>
          <span>${r.ep ? `${esc(epCode(r.ep))} · ` : ''}${esc(r.note)}</span>
        </div>
        <div class="score">${r.ep ? (mine.has(r.ep.id) ? '<b style="font-size:16px">✓ Seen</b>' : '<span>Not seen</span>') : (r.spinoff ? '<b style="font-size:16px">⭐ Yours</b>' : '<span>Not real</span>')}</div>
      </li>`).join('')}
  </ol>
  <p class="result-count" style="margin:0">Professor Chaos has asked for his own spin-off. The Coon said no.</p>`;
root.removeAttribute('aria-busy');
