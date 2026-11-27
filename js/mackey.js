// Mr. Mackey's short counselor notes on the more intense episodes. Spoiler-light on purpose.
import { esc } from './ui.js?v=20261127150223';

const NOTES = {
  "Scott Tenorman Must Die": "This one's revenge goes way, way too far. Maybe don't eat during it, m'kay.",
  "Kenny Dies": "This one deals with a friend being very sick. It's sadder than you'd expect, m'kay.",
  "Best Friends Forever": "Life support and end-of-life decisions come up here. Go gently, m'kay.",
  "You're Getting Old": "Growing apart, family trouble and feeling low. If it hits close to home, talk to someone, m'kay.",
  "Ass Burgers": "Feeling low and drinking to cope are in this one. Drinking your feelings is bad, m'kay.",
  "Raisins": "First heartbreak. Being sad for a while is okay, m'kay.",
  "Butters' Very Own Episode": "A family secret leads somewhere very dark, including a parent putting a child in danger, m'kay.",
  "Stanley's Cup": "Sick kids and a real gut-punch of an ending. You've been warned, m'kay.",
  "Woodland Critter Christmas": "Cute animals, extremely not-cute gore. Don't let the little faces fool you, m'kay.",
  "Good Times with Weapons": "Kids playing with real weapons and a nasty injury. Weapons are bad, m'kay.",
  "Britney's New Look": "Self-harm, graphic injury and media cruelty. Skip it if that's too much today, m'kay.",
  "Bloody Mary": "Addiction, religion and a whole lot of blood, m'kay.",
  "The Death Camp of Tolerance": "Harsh camp imagery and some very adult shock humor, m'kay.",
  "Night of the Living Homeless": "Zombie-movie violence aimed at people with no home. Be kind in real life, m'kay.",
  "HUMANCENTiPAD": "Body horror. Also, read the terms and conditions, m'kay.",
  "Put It Down": "Anxiety about scary news and dangerous driving. It's okay to take a breather, m'kay.",
  "Dead Kids": "School shootings are the subject here. If you need to talk, my door's open, m'kay.",
};

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const BY_TITLE = new Map(Object.entries(NOTES).map(([title, note]) => [norm(title), note]));

/** The note card for an episode, or an empty string if it doesn't need one. */
export function mackeyNoteHTML(ep) {
  const note = BY_TITLE.get(norm(ep.title));
  if (!note) return '';
  return `<aside class="mackey-note paper"><span aria-hidden="true">👔</span><p><strong>Counselor's note</strong>${esc(note)}</p></aside>`;
}
