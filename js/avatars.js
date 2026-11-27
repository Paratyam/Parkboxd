// Profile pictures: small original paper-cutout icons (no show characters) that sit on the
// person's avatar colour. Stored in profiles.avatar_icon by key; null means the first letter.

const K = '#141414'; // ink outline
const S = 'stroke="#141414" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
const svg = (body) => `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">${body}</svg>`;

export const AVATAR_ICONS = {
  beanie: { label: 'Beanie', svg: svg(`
    <path d="M8 27 Q8 11 20 11 Q32 11 32 27 Z" fill="#4fc3d9" ${S}/>
    <path d="M14 14 L14 26 M20 12 L20 26 M26 14 L26 26" stroke="#2a8fa3" stroke-width="2"/>
    <rect x="6" y="25" width="28" height="7" rx="2" fill="#f5c518" ${S}/>
    <circle cx="20" cy="8" r="4.5" fill="#d63a3a" ${S}/>`) },
  mittens: { label: 'Mittens', svg: svg(`
    <path d="M13 31 L12 17 Q12 9 19 9 Q26 9 26 17 L26 22 L29 19 Q32 17 33 20 Q33 23 27 29 L27 31 Z" fill="#f5c518" ${S}/>
    <rect x="11" y="30" width="17" height="5" rx="1.5" fill="#d63a3a" ${S}/>
    <path d="M15 15 Q17 12 20 12" stroke="#fff3a6" stroke-width="2" fill="none"/>`) },
  snowman: { label: 'Snowman', svg: svg(`
    <circle cx="20" cy="27" r="9" fill="#f4f8fb" ${S}/>
    <circle cx="20" cy="15" r="6.5" fill="#f4f8fb" ${S}/>
    <rect x="14" y="5" width="12" height="4" fill="#2b2b2b" ${S}/>
    <rect x="16" y="1.5" width="8" height="5" fill="#2b2b2b" ${S}/>
    <path d="M20 15.5 L26 17 L20 17.5 Z" fill="#f2711c" ${S}/>
    <circle cx="17.5" cy="13.5" r="1" fill="${K}"/><circle cx="22" cy="13.5" r="1" fill="${K}"/>
    <circle cx="20" cy="25" r="1.1" fill="${K}"/><circle cx="20" cy="29" r="1.1" fill="${K}"/>`) },
  pine: { label: 'Pine tree', svg: svg(`
    <rect x="18" y="30" width="4" height="6" fill="#5b3a1e" ${S}/>
    <path d="M20 4 L27 15 L23 15 L30 24 L25 24 L32 31 L8 31 L15 24 L10 24 L17 15 L13 15 Z" fill="#3fb950" ${S}/>
    <path d="M20 4 L23.5 9.5 L21 9 L19 10.5 L16.5 9.5 Z" fill="#f4f8fb"/>`) },
  mountain: { label: 'Mountain', svg: svg(`
    <path d="M3 32 L15 12 L21 21 L26 14 L37 32 Z" fill="#5a7590" ${S}/>
    <path d="M15 12 L19 18.5 L16.5 18 L14 20 L12 17 Z M26 14 L29 19 L27 18.5 L25 20 L23.5 18 Z" fill="#f4f8fb" ${S}/>
    <path d="M3 32 L37 32" ${S}/>`) },
  bus: { label: 'School bus', svg: svg(`
    <rect x="7" y="8" width="26" height="24" rx="4" fill="#f5c518" ${S}/>
    <rect x="10" y="11" width="20" height="9" rx="1.5" fill="#bfe3f2" ${S}/>
    <circle cx="12" cy="25" r="2" fill="#fff3a6" ${S}/><circle cx="28" cy="25" r="2" fill="#fff3a6" ${S}/>
    <path d="M16 26 H24" ${S}/>
    <rect x="9" y="31" width="5" height="4" fill="#2b2b2b" ${S}/><rect x="26" y="31" width="5" height="4" fill="#2b2b2b" ${S}/>`) },
  ufo: { label: 'Visitors', svg: svg(`
    <path d="M14 26 L10 36 M26 26 L30 36" stroke="#b8f5a1" stroke-width="2" opacity=".8"/>
    <path d="M13 18 Q13 9 20 9 Q27 9 27 18 Z" fill="#bfe3f2" ${S}/>
    <ellipse cx="20" cy="21" rx="15" ry="5.5" fill="#9aa5b1" ${S}/>
    <circle cx="12" cy="21" r="1.4" fill="#f5c518"/><circle cx="20" cy="22.5" r="1.4" fill="#f5c518"/><circle cx="28" cy="21" r="1.4" fill="#f5c518"/>`) },
  burger: { label: 'Burger', svg: svg(`
    <path d="M7 17 Q7 7 20 7 Q33 7 33 17 Z" fill="#e0a050" ${S}/>
    <circle cx="15" cy="11.5" r=".9" fill="#fff3a6"/><circle cx="21" cy="10" r=".9" fill="#fff3a6"/><circle cx="26" cy="12.5" r=".9" fill="#fff3a6"/>
    <path d="M6 19 Q10 17 13 19 Q17 21 20 19 Q24 17 27 19 Q31 21 34 19 L34 21 L6 21 Z" fill="#3fb950" ${S}/>
    <rect x="6" y="21" width="28" height="5" rx="2" fill="#6b3d1f" ${S}/>
    <path d="M7 28 L33 28 Q33 33 20 33 Q7 33 7 28 Z" fill="#e0a050" ${S}/>`) },
  star: { label: 'Gold star', svg: svg(`
    <path d="M20 4 L24.5 14 L35 15 L27 22.5 L29.5 33 L20 27.5 L10.5 33 L13 22.5 L5 15 L15.5 14 Z" fill="#f5c518" ${S}/>
    <path d="M20 9 L22.5 15" stroke="#fff3a6" stroke-width="2"/>`) },
  glove: { label: 'Boxing glove', svg: svg(`
    <path d="M9 23 Q6 11 15 7 Q22 4 29 8 Q36 13 33 22 Q31 28 25 28 L14 28 Q10 27 9 23 Z" fill="#d63a3a" ${S}/>
    <path d="M10 18 Q8 13 13 12 Q17 12 17 16 Q17 20 13 20 Z" fill="#b52a2a" ${S}/>
    <path d="M13 28 L26 28 L27 35 L12 35 Z" fill="#f4f8fb" ${S}/>`) },
  mic: { label: 'Microphone', svg: svg(`
    <circle cx="20" cy="14" r="9" fill="#c9ced6" ${S}/>
    <path d="M13 11 H27 M12 15 H28 M14 19 H26" stroke="#6b7480" stroke-width="1.5"/>
    <path d="M18 23 L22 23 L23 35 L17 35 Z" fill="#2b2b2b" ${S}/>`) },
  books: { label: 'Books', svg: svg(`
    <path d="M6 29 L34 28 L35 35 L7 36 Z" fill="#2f6db5" ${S}/>
    <path d="M9 21 L33 22 L32 28 L8 28 Z" fill="#d63a3a" ${S}/>
    <path d="M7 13 L33 12 L34 20 L8 21 Z" fill="#3fb950" ${S}/>
    <path d="M12 16.5 L24 16" stroke="#f4f8fb" stroke-width="2"/>
    <path d="M20 12 Q19 5 24 4" stroke="#5b3a1e" stroke-width="2" fill="none"/>`) },
  earflaps: { label: 'Earflap hat', svg: svg(`
    <path d="M8 24 Q8 8 20 8 Q32 8 32 24 Z" fill="#3fb950" ${S}/>
    <path d="M8 22 L7 33 Q10 35 13 32 L13 22 Z" fill="#3fb950" ${S}/>
    <path d="M32 22 L33 33 Q30 35 27 32 L27 22 Z" fill="#3fb950" ${S}/>
    <rect x="7" y="21" width="26" height="5" rx="2" fill="#2a8a3a" ${S}/>
    <path d="M14 13 Q17 10 21 10" stroke="#8fe39b" stroke-width="2" fill="none"/>`) },
};

export const AVATAR_KEYS = Object.keys(AVATAR_ICONS);
