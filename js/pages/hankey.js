// hankey.html: Mr. Hankey's 12 Days of Christmas. One door a day, December 13 to 24.
// Doors stay open for the rest of December. Which ones you've opened is remembered per year.
import { initPage } from '../layout.js?v=20261127150743';
import { $, esc, epCode } from '../ui.js?v=20261127150743';
import { loadAllEpisodes, myLogMap, thumbHTML } from '../episodes.js?v=20261127150743';

const FIRST_DAY = 13;
const DOORS = [
  { title: 'The Spirit of Christmas (Jesus vs. Santa)', note: 'Start where it all started.' },
  { title: 'Mr. Hankey, the Christmas Poo', note: 'Howdy ho! The one that made it official.' },
  { title: 'Merry Christmas Charlie Manson!', note: 'A family visit with a very unexpected guest.' },
  { title: "Mr. Hankey's Christmas Classics", note: 'Sing along. Quietly, if there are neighbours.' },
  { title: 'A Very Crappy Christmas', note: 'Somebody has to save the holiday spirit.' },
  { title: 'Red Sleigh Down', note: "Santa's toughest delivery route." },
  { title: "It's Christmas in Canada", note: 'A long road north for a very important present.' },
  { title: 'Woodland Critter Christmas', note: 'Aww, look at the cute little critters. Look away.' },
  { title: '#HappyHolograms', note: 'A holiday special for the very online.' },
  { title: 'The Problem with a Poo', note: 'Mr. Hankey versus the internet.' },
  { title: 'Bike Parade', note: 'Deck the handlebars.' },
  { title: 'Christmas Snow', note: 'Merry Christmas Eve! One last door.' },
];

const { user, profile } = await initPage({ title: '12 Days of Christmas', auth: 'required' });
const root = $('#advent');

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const [all, mine] = await Promise.all([loadAllEpisodes(), myLogMap(user.id)]);
const byTitle = new Map(all.map((e) => [norm(e.title), e]));
const doors = DOORS.map((d, i) => ({ ...d, day: FIRST_DAY + i, ep: byTitle.get(norm(d.title)) }));

const now = new Date();
const KEY = `parkboxd-advent-${now.getFullYear()}`;
let opened = new Set();
try { opened = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { /* start fresh */ }

const unlocked = (day) => now.getMonth() === 11 && now.getDate() >= day;

function countdown() {
  if (unlocked(FIRST_DAY + DOORS.length - 1)) return 'Every door is unlocked. Happy holidays!';
  if (unlocked(FIRST_DAY)) return 'A new door unlocks every day until Christmas Eve.';
  const first = new Date(now.getFullYear() + (now.getMonth() === 11 && now.getDate() > 24 ? 1 : 0), 11, FIRST_DAY);
  const days = Math.ceil((first - now) / 86400000);
  return `The first door unlocks on December ${FIRST_DAY}. ${days} ${days === 1 ? 'day' : 'days'} to go.`;
}

function doorHTML(d, i) {
  const n = i + 1;
  if (!unlocked(d.day)) {
    return `<li class="door locked paper"><span class="door-num cut">${n}</span><span class="door-when">🔒 Dec ${d.day}</span></li>`;
  }
  if (!opened.has(d.day) || !d.ep) {
    return `<li><button type="button" class="door ready paper" data-day="${d.day}"><span class="door-num cut">${n}</span><span class="door-when">🎁 Open me</span></button></li>`;
  }
  const seen = mine.has(d.ep.id);
  return `<li class="door open${seen ? ' seen' : ''}">
    <a href="episode.html?id=${d.ep.id}">${thumbHTML(d.ep, { showTitle: false })}
      <strong>${n}. ${esc(d.ep.title)}</strong></a>
    <span>${esc(epCode(d.ep))}${seen ? ' · ✓ Seen' : ''}</span>
    <p>${esc(d.note)}</p>
  </li>`;
}

function render() {
  const seen = doors.filter((d) => d.ep && mine.has(d.ep.id)).length;
  const done = seen === doors.length;
  root.innerHTML = `
    <div class="advent-head paper">
      <span class="advent-emoji" aria-hidden="true">🎄</span>
      <div>
        <h1 class="cut">Mr. Hankey's 12 Days of Christmas</h1>
        <p>${esc(countdown())}</p>
        <p>You've seen <strong>${seen}</strong> of ${doors.length} holiday picks.</p>
      </div>
    </div>
    <ol class="advent">${doors.map(doorHTML).join('')}</ol>
    ${done ? `<div class="advent-cert paper">
      <span aria-hidden="true">🏅</span>
      <h2 class="cut">Certificate of Holiday Spirit</h2>
      <p>Awarded to <strong>${esc(profile.display_name || profile.username)}</strong> for watching all ${doors.length} holiday picks. Howdy ho!</p>
    </div>` : `<p class="result-count">Watch all ${doors.length} to earn the Certificate of Holiday Spirit.</p>`}`;
  root.removeAttribute('aria-busy');
}

root.addEventListener('click', (e) => {
  const door = e.target.closest('[data-day]');
  if (!door) return;
  opened.add(Number(door.dataset.day));
  try { localStorage.setItem(KEY, JSON.stringify([...opened])); } catch { /* still opens this time */ }
  render();
});

render();
