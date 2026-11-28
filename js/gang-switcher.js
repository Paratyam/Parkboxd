// The row of character faces at the top of each character profile, for hopping between them.
import { CHARACTERS } from './characters.js?v=20261128090606';
import { avatarHTML } from './ui.js?v=20261128090606';

export function gangSwitcherHTML(current) {
  return `
    <nav class="gang-row" aria-label="Character accounts">${CHARACTERS.map((c) => `
      <a href="profile.html?u=${c.username}"${c.username === current ? ' aria-current="page"' : ''} style="--gang:${c.avatar_color}">
        ${avatarHTML(c, 40)}<span>${c.display_name.replace('Eric ', '').split(' ')[0]}</span>
      </a>`).join('')}
    </nav>`;
}
