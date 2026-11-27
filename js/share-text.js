// The words that go with everything you share. One shape: what it is first, the invitation
// after it, and the link last.
import { SITE_LINK } from './config.js?v=20261127201216';
import { stars } from './ui.js?v=20261127201216';

const compose = (about, invite, path = '') => `${about}\n\n${invite} 👇\nhttps://${SITE_LINK}/${path}`;

/** d: { title, code, rating, episodeId } */
export const reviewMessage = (d) => compose(
  `📝 My review of “${d.title}” (${d.code})${d.rating == null ? '' : `: ${stars(d.rating)}`}`,
  'Seen it? Rate it on Parkboxd', `episode.html?id=${d.episodeId}`,
);

/** picks: [{ title, code }] */
export const top4Message = (picks) => compose(
  `🏆 My ${picks.length === 1 ? 'favourite South Park episode' : `${picks.length} favourite South Park episodes`}:\n${picks.map((p, i) => `${i + 1}. ${p.title} (${p.code})`).join('\n')}`,
  'What are yours? Pick them on Parkboxd',
);

/** picks: the Cage Match ranking, best first. */
export const top10Message = (picks) => compose(
  `🥊 My Cage Match top ${Math.min(10, picks.length)}. My champion: “${picks[0].title}”.`,
  'Think I got it wrong? Make your own ranking', 'cage.html',
);

/** The data on a badge or personality button. */
export const awardMessage = ({ kicker, emoji, heading, line }) => (kicker === 'Badge unlocked'
  ? compose(`${emoji} I unlocked the “${heading}” badge on Parkboxd! (${line})`, 'Come and earn your own')
  : compose(`${emoji} My South Park personality: ${heading.replace(/^I'm an? /, '')}.`, 'Find out yours on Parkboxd'));

export const streakMessage = ({ days }) => compose(
  `🌱 My Tegridy streak on Parkboxd: ${days} day${Number(days) === 1 ? '' : 's'}.`,
  'Grow your own',
);

export const reportCardMessage = ({ isMe, name }) => compose(
  `🍎 ${isMe ? 'Mr. Garrison graded my South Park watching.' : `Mr. Garrison's report card for ${name}.`}`,
  'Get your own report card', 'stats.html',
);

export const inviteMessage = (username) => compose(
  'Follow me on Parkboxd and rate South Park episodes with me.',
  'Join here', `?invite=${encodeURIComponent(username)}`,
);
