// Messages: an episode link shows as a picture card instead of a long address.
import { esc, epCode } from './ui.js?v=20261128082231';
import { thumbHTML } from './episodes.js?v=20261128082231';

// Either of the site's addresses, with or without https and ".html".
const EP_LINK = /(?:https?:\/\/)?(?:parkboxd\.pages\.dev|paratyam\.github\.io\/parkboxd)\/episode(?:\.html)?\?id=(\d+)(?!\d)(?:[&#][^\s]*)?/gi;

/** { text, eps }: the message without its episode links, and the episodes they pointed to. */
export function splitEpisodeLinks(body, byId) {
  const eps = new Map();
  const text = body.replace(EP_LINK, (link, id) => {
    const ep = byId.get(Number(id));
    if (!ep) return link; // unknown episode: leave the address as written
    eps.set(ep.id, ep);
    return '';
  }).replace(/[ \t]+\n/g, '\n').trim();
  return { text: eps.size ? text : body, eps: [...eps.values()] };
}

export function messageHTML(body, byId) {
  const { text, eps } = splitEpisodeLinks(body, byId);
  return `${text ? `<p>${esc(text)}</p>` : ''}${eps.map((e) => `
    <a class="dm-ep" href="episode.html?id=${e.id}">${thumbHTML(e, { showTitle: false, code: '' })}
      <span><strong>${esc(e.title)}</strong><small>${esc(epCode(e))}</small></span></a>`).join('')}`;
}

/** One line for the conversation list. */
export function previewText(body, byId) {
  const { text, eps } = splitEpisodeLinks(body, byId);
  const line = eps.length ? `${text.startsWith('📺') ? '' : '📺 '}${eps[0].title}` : text;
  return line.length > 40 ? `${line.slice(0, 40)}…` : line;
}
