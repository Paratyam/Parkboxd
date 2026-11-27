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

// Tegridy streak rewards: `streak` = the longest streak (in days) needed to pick it.
Object.assign(AVATAR_ICONS, {
  seedling: { label: 'Seedling', streak: 7, svg: svg(`
    <path d="M20 29 L20 17" stroke="#141414" stroke-width="4" stroke-linecap="round"/>
    <path d="M20 29 L20 17" stroke="#2f8f3a" stroke-width="2" stroke-linecap="round"/>
    <path d="M20 19 Q9 21 7 10 Q18 8 20 19 Z" fill="#5ccf4a" ${S}/>
    <path d="M20 17 Q22 5 33 7 Q32 18 20 17 Z" fill="#5ccf4a" ${S}/>
    <path d="M8 31 Q20 23 32 31 L32 34 L8 34 Z" fill="#6b3d1f" ${S}/>`) },
  wateringcan: { label: 'Watering can', streak: 30, svg: svg(`
    <path d="M11 18 Q12 7 19 8 Q26 9 25 18" fill="none" stroke="#141414" stroke-width="5"/>
    <path d="M11 18 Q12 7 19 8 Q26 9 25 18" fill="none" stroke="#9aa5b1" stroke-width="2"/>
    <path d="M23 24 L32 14 L35 17 L25 31 Z" fill="#4a90e2" ${S}/>
    <path d="M30 11 L37 19" stroke="#141414" stroke-width="4" stroke-linecap="round"/>
    <rect x="7" y="17" width="20" height="17" rx="3" fill="#4a90e2" ${S}/>
    <path d="M11 22 H19" stroke="#bfe3f2" stroke-width="2" stroke-linecap="round"/>
    <path d="M36 24 L35 27 M32 26 L31 29" stroke="#bfe3f2" stroke-width="2" stroke-linecap="round"/>`) },
  goldplant: { label: 'Golden plant', streak: 100, svg: svg(`
    <path d="M20 29 L20 12" stroke="#141414" stroke-width="4" stroke-linecap="round"/>
    <path d="M20 26 Q9 29 6 20 Q16 16 20 26 Z M20 26 Q31 29 34 20 Q24 16 20 26 Z M20 19 Q11 19 10 11 Q19 10 20 19 Z M20 19 Q29 19 30 11 Q21 10 20 19 Z" fill="#f5c518" ${S}/>
    <path d="M20 2 L22.5 7 L28 8.5 L22.5 10.5 L20 15 L17.5 10.5 L12 8.5 L17.5 7 Z" fill="#fff3a6" ${S}/>
    <path d="M11 28 L29 28 L26 37 L14 37 Z" fill="#c8693a" ${S}/>`) },
});

// Badge rewards: `badge` = the badge id (js/insights.js) needed to pick it.
Object.assign(AVATAR_ICONS, {
  // The key stays "bracelet" (and "door" below) so anyone who already picked it keeps a picture.
  bracelet: { label: 'Fist bump', badge: 'friends', svg: svg(`
    <rect x="2" y="17" width="7" height="12" fill="#4a90e2" ${S}/>
    <path d="M9 15 H15 Q19 15 19 19 V26 Q19 30 15 30 H9 Z" fill="#f5c9a0" ${S}/>
    <rect x="31" y="17" width="7" height="12" fill="#3fb950" ${S}/>
    <path d="M31 15 H25 Q21 15 21 19 V26 Q21 30 25 30 H31 Z" fill="#c8935f" ${S}/>
    <path d="M20 4 V10 M13 7 L16 11 M27 7 L24 11" ${S}/>`) },
  tierchart: { label: 'S tier stamp', badge: 'tierlord', svg: svg(`
    <path d="M20 3 L25 8 L32 7 L33 15 L38 20 L33 25 L32 33 L25 32 L20 37 L15 32 L8 33 L7 25 L2 20 L7 15 L8 7 L15 8 Z" fill="#d63a3a" ${S}/>
    <path d="M25.5 14 Q20 10.5 15.5 14 Q13.5 18 20 20 Q26.5 22 24.5 26 Q20 29.5 14.5 26" fill="none" stroke="#141414" stroke-width="6" stroke-linecap="round"/>
    <path d="M25.5 14 Q20 10.5 15.5 14 Q13.5 18 20 20 Q26.5 22 24.5 26 Q20 29.5 14.5 26" fill="none" stroke="#fff3a6" stroke-width="3" stroke-linecap="round"/>`) },
  glasses: { label: 'Reading glasses', badge: 'bookworm', svg: svg(`
    <circle cx="12" cy="22" r="7.5" fill="#bfe3f2" stroke="#141414" stroke-width="3"/>
    <circle cx="28" cy="22" r="7.5" fill="#bfe3f2" stroke="#141414" stroke-width="3"/>
    <path d="M18 20 Q20 17 22 20 M5 20 L3 13 M35 20 L37 13" fill="none" ${S}/>
    <path d="M8.5 20 Q10 17.5 13 17.5 M24.5 20 Q26 17.5 29 17.5" stroke="#fff" stroke-width="2" fill="none"/>`) },
  magnifier: { label: 'Detective hat', badge: 'detective', svg: svg(`
    <path d="M16 9 L20 5 L24 9" fill="#8a5a3b" ${S}/>
    <path d="M9 26 Q9 8 20 8 Q31 8 31 26 Z" fill="#a8744c" ${S}/>
    <path d="M3 29 Q8 21 14 26 H26 Q32 21 37 29 Q28 34 20 30 Q12 34 3 29 Z" fill="#8a5a3b" ${S}/>
    <path d="M9.5 21 Q20 25 30.5 21" fill="none" ${S}/>`) },
  ringbell: { label: 'Champion belt', badge: 'ringmaster', svg: svg(`
    <path d="M2 15 H38 V26 H2 Z" fill="#2b2b2b" ${S}/>
    <circle cx="20" cy="20.5" r="12" fill="#f5c518" ${S}/>
    <path d="M20 13 L22 18 L27 18.5 L23 22 L24.5 27 L20 24.5 L15.5 27 L17 22 L13 18.5 L18 18 Z" fill="#d63a3a" ${S}/>`) },
  pepper: { label: 'Hot pepper', badge: 'hottake', svg: svg(`
    <path d="M25 13 Q35 16 31 26 Q25 37 8 35 Q19 30 18 20 Q18 12 25 13 Z" fill="#d63a3a" ${S}/>
    <path d="M18 15 Q20 9 26 11 Q31 10 30 17 Q24 13 18 15 Z M25 11 Q24 5 30 4" fill="#3fb950" ${S}/>
    <path d="M27 20 Q28 25 23 29" stroke="#ff9a8a" stroke-width="2" fill="none"/>`) },
  door: { label: 'Raspberry', badge: 'screwyou', svg: svg(`
    <circle cx="20" cy="20" r="16" fill="#f5c518" ${S}/>
    <path d="M10 13 L16 16 L10 19 M30 13 L24 16 L30 19" fill="none" ${S}/>
    <path d="M11 24 H29" fill="none" ${S}/>
    <path d="M15 24 V30 Q15 36 20 36 Q25 36 25 30 V24 Z" fill="#ff7eb6" ${S}/>
    <path d="M20 25 V31" stroke="#141414" stroke-width="1.5"/>`) },
  police: { label: 'Police cap', badge: 'authoritah', svg: svg(`
    <path d="M7 22 Q4 9 20 8 Q36 9 33 22 Z" fill="#2f4f8f" ${S}/>
    <rect x="8" y="21" width="24" height="6" fill="#1d2f57" ${S}/>
    <path d="M9 27 Q20 38 31 27 Z" fill="#2b2b2b" ${S}/>
    <path d="M20 11 L22 15 L26 15.5 L23 18 L24 21 L20 19.5 L16 21 L17 18 L14 15.5 L18 15 Z" fill="#f5c518" ${S}/>`) },
  towel: { label: 'Towel', badge: 'rewatch', svg: svg(`
    <path d="M10 7 Q20 4 30 7 L32 34 Q26 31 20 34 Q14 37 8 34 Z" fill="#a78bda" ${S}/>
    <path d="M10 12 L30 12 M9 29 L31 29" stroke="#f4f8fb" stroke-width="2.5"/>
    <circle cx="16" cy="19" r="2.6" fill="#fff" ${S}/><circle cx="24" cy="19" r="2.6" fill="#fff" ${S}/>
    <circle cx="16" cy="19.5" r="1" fill="${K}"/><circle cx="24" cy="19.5" r="1" fill="${K}"/>`) },
  quill: { label: 'Quill', badge: 'critic', svg: svg(`
    <path d="M12 28 Q10 10 34 4 Q34 22 16 27 Z" fill="#f4f8fb" ${S}/>
    <path d="M8 35 L27 12" ${S}/>
    <rect x="22" y="27" width="12" height="9" rx="2" fill="#2f6db5" ${S}/><rect x="25" y="24" width="6" height="4" fill="#2b2b2b" ${S}/>`) },
  clipboard: { label: 'Clipboard', badge: 'mmkay', svg: svg(`
    <rect x="8" y="7" width="24" height="29" rx="2.5" fill="#8a5a3b" ${S}/>
    <rect x="11" y="11" width="18" height="22" fill="#f6f1e1" ${S}/>
    <rect x="15" y="4" width="10" height="7" rx="2" fill="#9aa5b1" ${S}/>
    <path d="M15 18 H25 M15 23 H25 M15 28 H21" ${S}/>`) },
  ticket: { label: 'Premiere ticket', badge: 'dayone', svg: svg(`
    <g transform="rotate(-14 20 20)"><path d="M5 12 H35 V17 Q31 20 35 23 V28 H5 V23 Q9 20 5 17 Z" fill="#f5c518" ${S}/>
    <path d="M26 13 V27" stroke="#141414" stroke-width="1.5" stroke-dasharray="2 2"/>
    <path d="M15 15 L17 18.5 L20.5 19 L18 21.5 L18.5 25 L15 23.5 L11.5 25 L12 21.5 L9.5 19 L13 18.5 Z" fill="#d63a3a" ${S}/></g>`) },
  raccoon: { label: 'Raccoon', badge: 'coon', svg: svg(`
    <path d="M7 18 L6 6 L16 11 Q20 10 24 11 L34 6 L33 18 Q37 24 30 29 Q20 40 10 29 Q3 24 7 18 Z" fill="#9aa5b1" ${S}/>
    <path d="M7 20 Q13 14 18 20 Q20 22 22 20 Q27 14 33 20 Q31 27 25 25 Q20 23 15 25 Q9 27 7 20 Z" fill="#2b2b2b"/>
    <circle cx="14" cy="21" r="2" fill="#fff"/><circle cx="26" cy="21" r="2" fill="#fff"/>
    <path d="M17 29 Q20 27 23 29 Q20 33 17 29 Z" fill="${K}"/>`) },
  foilhat: { label: 'Tinfoil hat', badge: 'chaos', svg: svg(`
    <path d="M5 31 L11 18 L15 21 L20 5 L24 17 L29 14 L35 31 Q20 37 5 31 Z" fill="#cfd8e3" ${S}/>
    <path d="M11 18 L17 29 M20 5 L19 22 L26 30 M29 14 L27 23" stroke="#7d8a99" stroke-width="1.5" fill="none"/>`) },
  question: { label: 'Mystery mark', badge: 'kenny', svg: svg(`
    <circle cx="20" cy="20" r="16" fill="#4b2a7a" ${S}/>
    <path d="M13 15 Q13 8 20 8 Q27 8 27 14 Q27 18 22 20 Q20 21 20 25" fill="none" stroke="#141414" stroke-width="7" stroke-linecap="round"/>
    <path d="M13 15 Q13 8 20 8 Q27 8 27 14 Q27 18 22 20 Q20 21 20 25" fill="none" stroke="#79e06a" stroke-width="4" stroke-linecap="round"/>
    <circle cx="20" cy="31.5" r="2.8" fill="#79e06a" ${S}/>`) },
  barn: { label: 'Farm barn', badge: 'tegridy', svg: svg(`
    <path d="M7 35 V18 L12 9 L20 5 L28 9 L33 18 V35 Z" fill="#c0392b" ${S}/>
    <path d="M5 19 L11 8 L20 4 L29 8 L35 19" fill="none" ${S}/>
    <rect x="14" y="22" width="12" height="13" fill="#f6f1e1" ${S}/>
    <path d="M14 22 L26 35 M26 22 L14 35" stroke="#c0392b" stroke-width="2"/>
    <circle cx="20" cy="14" r="3" fill="#f5c518" ${S}/>`) },
  popcorn: { label: 'Popcorn', badge: 'movies', svg: svg(`
    <path d="M9 18 Q5 11 12 11 Q12 4 19 7 Q24 2 28 8 Q36 8 31 18 Z" fill="#fff3a6" ${S}/>
    <path d="M8 17 H32 L28 36 H12 Z" fill="#f4f8fb" ${S}/>
    <path d="M13 18 L15.5 35 M20 18 V35 M27 18 L24.5 35" stroke="#d63a3a" stroke-width="3.5"/>`) },
  trophy: { label: 'Summit trophy', badge: 'completionist', svg: svg(`
    <path d="M11 10 Q3 10 6 17 Q8 21 14 21 M29 10 Q37 10 34 17 Q32 21 26 21" fill="none" ${S}/>
    <path d="M11 6 H29 Q29 24 20 25 Q11 24 11 6 Z" fill="#f5c518" ${S}/>
    <path d="M18 25 H22 L23 30 H17 Z" fill="#c9a227" ${S}/>
    <rect x="11" y="30" width="18" height="6" rx="1.5" fill="#8a5a3b" ${S}/>
    <path d="M14 18 L19 11 L22 15 L24 13 L26 18 Z" fill="#f4f8fb" ${S}/>`) },
});

export const AVATAR_KEYS = Object.keys(AVATAR_ICONS);
