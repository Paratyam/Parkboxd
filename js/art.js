// Original paper-cutout art for Parkboxd (no show characters): flat shapes, dark outlines,
// a little wonk, like everything was cut out of construction paper. Each export is an SVG string.

const INK = '#141414';
const SNOW = '#eef3f7';

// One pine tree with a snow cap, its base centred at (x, y), h tall.
function pine(x, y, h, fill = '#2e6b3f') {
  const w = h * 0.62;
  const tier = (top, bottom, half) => `M${x} ${top} L${x + half} ${bottom} L${x - half} ${bottom} Z`;
  return `
    <rect x="${x - h * 0.05}" y="${y - h * 0.16}" width="${h * 0.1}" height="${h * 0.16}" fill="#5b3a1e" stroke="${INK}" stroke-width="2"/>
    <path d="${tier(y - h, y - h * 0.55, w * 0.32)} ${tier(y - h * 0.78, y - h * 0.33, w * 0.42)} ${tier(y - h * 0.56, y - h * 0.14, w * 0.5)}" fill="${fill}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M${x} ${y - h} L${x + w * 0.12} ${y - h * 0.83} L${x + w * 0.03} ${y - h * 0.86} L${x - w * 0.06} ${y - h * 0.82} L${x - w * 0.12} ${y - h * 0.84} Z" fill="${SNOW}"/>`;
}

/** A row of snowy pines along a snow bank: sits on top of the footer on every page. */
export function pineStripSVG() {
  const trees = [];
  const xs = [30, 95, 150, 260, 330, 470, 560, 640, 790, 880, 960, 1100, 1180, 1290, 1370, 1420];
  xs.forEach((x, i) => trees.push(pine(x, 74, 46 + ((i * 37) % 30), i % 3 ? '#2e6b3f' : '#24573a')));
  return `<svg class="art-pines" viewBox="0 0 1440 90" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    ${trees.join('')}
    <path d="M0 90 L0 72 C120 62 220 80 360 70 C520 60 640 80 800 70 C960 60 1080 80 1220 68 C1320 62 1390 72 1440 70 L1440 90 Z" fill="${SNOW}" stroke="${INK}" stroke-width="2.5"/>
  </svg>`;
}

/** Paper microphone: Cartman's hosting mic in the Cage Match. */
export function micSVG() {
  return `<svg class="art art-mic" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M30 40 L34 40 L36 58 L28 58 Z" fill="#2b2b2b" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M22 41 Q32 46 42 41 L40 47 Q32 50 24 47 Z" fill="#d63a3a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="32" cy="24" r="16" fill="#c9ced6" stroke="${INK}" stroke-width="3"/>
    <path d="M20 18 H44 M18 24 H46 M20 30 H44 M26 10 V38 M32 8 V40 M38 10 V38" stroke="#6b7480" stroke-width="2"/>
    <path d="M22 15 Q26 11 31 10" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`;
}

/** Paper boxing glove. */
export function gloveSVG() {
  return `<svg class="art art-glove" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M14 38 Q8 20 22 12 Q34 6 46 12 Q58 20 54 34 Q52 44 42 46 L22 46 Q16 44 14 38 Z" fill="#d63a3a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M16 30 Q12 22 20 20 Q26 19 26 26 Q26 32 20 33 Z" fill="#b52a2a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M30 16 Q40 13 47 19" stroke="#ff8a8a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M20 46 L44 46 L46 58 L18 58 Z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M22 52 H42" stroke="#d63a3a" stroke-width="2.5"/>
  </svg>`;
}

/** Book Club attendance stickers: apple, star, bookmark, trophy, crown on a round paper sticker. */
export function stickerSVG(key) {
  const cut = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
  const shapes = {
    apple: `<path d="M32 22 C20 14 12 26 17 38 C21 49 28 52 32 47 C36 52 43 49 47 38 C52 26 44 14 32 22 Z" fill="#d63a3a" ${cut}/>
      <path d="M32 22 Q31 15 35 11" fill="none" ${cut}/><path d="M35 15 Q45 8 48 16 Q41 21 35 15 Z" fill="#3fb950" ${cut}/>`,
    star: `<path d="M32 10 L38 25 L54 26 L42 37 L46 52 L32 44 L18 52 L22 37 L10 26 L26 25 Z" fill="#f5c518" ${cut}/>`,
    bookmark: `<path d="M20 11 L44 11 L45 53 L32 43 L19 53 Z" fill="#f5c518" ${cut}/><circle cx="32" cy="26" r="6" fill="#d63a3a" ${cut}/>`,
    trophy: `<path d="M19 13 L45 13 Q45 36 32 38 Q19 36 19 13 Z" fill="#f5c518" ${cut}/>
      <path d="M19 18 Q9 18 13 27 Q16 31 22 30 M45 18 Q55 18 51 27 Q48 31 42 30" fill="none" ${cut}/>
      <path d="M29 38 L35 38 L36 45 L42 46 L43 53 L21 53 L22 46 L28 45 Z" fill="#b8860b" ${cut}/>`,
    crown: `<path d="M12 20 L23 31 L32 13 L41 31 L52 20 L47 47 L17 47 Z" fill="#f5c518" ${cut}/>
      <circle cx="32" cy="38" r="5" fill="#4a90e2" ${cut}/>`,
  };
  return `<svg class="art art-sticker" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <circle cx="32" cy="32" r="30" fill="#fff" ${cut}/>${shapes[key] || shapes.star}
  </svg>`;
}

/** The people's champion's prize: a crowned gold cup in front of paper flames, with a banner. */
export function peoplesCupSVG() {
  const cut = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
  return `<svg class="art art-peoples" viewBox="0 0 120 128" aria-hidden="true" focusable="false">
    <path d="M60 4 L72 26 L90 12 L90 36 L113 31 L101 53 L118 66 L98 76 L106 96 L82 92 L60 106 L38 92 L14 96 L22 76 L2 66 L19 53 L7 31 L30 36 L30 12 L48 26 Z" fill="#d63a3a" ${cut}/>
    <path d="M60 20 L70 40 L86 31 L84 50 L101 52 L88 65 L98 78 L78 80 L60 94 L42 80 L22 78 L32 65 L19 52 L36 50 L34 31 L50 40 Z" fill="#f2711c"/>
    <path d="M37 52 Q18 52 24 67 Q29 76 43 73 M83 52 Q102 52 96 67 Q91 76 77 73" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M37 52 Q18 52 24 67 Q29 76 43 73 M83 52 Q102 52 96 67 Q91 76 77 73" fill="none" stroke="#f5c518" stroke-width="4" stroke-linecap="round"/>
    <path d="M35 46 L85 46 Q85 80 60 86 Q35 80 35 46 Z" fill="#f5c518" ${cut}/>
    <path d="M43 52 Q44 70 53 77" fill="none" stroke="#fff3b0" stroke-width="5" stroke-linecap="round"/>
    <path d="M55 85 L65 85 L67 96 L77 99 L78 108 L42 108 L43 99 L53 96 Z" fill="#b8860b" ${cut}/>
    <path d="M40 43 L36 20 L49 30 L60 14 L71 30 L84 20 L80 43 Z" fill="#ffdf5e" ${cut}/>
    <circle cx="60" cy="34" r="4" fill="#4a90e2" stroke="${INK}" stroke-width="2"/>
    <path d="M60 53 L63.5 61 L72 62 L65.5 67.500 L68 76 L60 71 L52 76 L54.500 67.500 L48 62 L56.500 61 Z" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M6 104 L22 108 L98 108 L114 104 L107 115 L114 126 L96 123 L24 123 L6 126 L13 115 Z" fill="#fff" ${cut}/>
    <text x="60" y="120" text-anchor="middle" font-family="'Luckiest Guy', cursive" font-size="13" fill="#d63a3a">PEOPLE'S</text>
  </svg>`;
}

/** Paper championship belt: gold plate with a star on a black strap. */
export function beltSVG() {
  return `<svg class="art art-belt" viewBox="0 0 140 64" aria-hidden="true" focusable="false">
    <path d="M4 22 Q70 14 136 22 L136 42 Q70 50 4 42 Z" fill="#1d1d1d" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="22" cy="32" r="6" fill="#f5c518" stroke="${INK}" stroke-width="2"/>
    <circle cx="118" cy="32" r="6" fill="#f5c518" stroke="${INK}" stroke-width="2"/>
    <path d="M44 10 Q70 2 96 10 L102 32 L96 54 Q70 62 44 54 L38 32 Z" fill="#f5c518" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M50 16 Q70 10 90 16 L95 32 L90 48 Q70 54 50 48 L45 32 Z" fill="#ffdf5e" stroke="#b8860b" stroke-width="2"/>
    <path d="M70 20 L74 29 L84 30 L76 36 L79 46 L70 40 L61 46 L64 36 L56 30 L66 29 Z" fill="#d63a3a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  </svg>`;
}

/** Paper stack of library books with an apple on top. */
export function booksSVG() {
  return `<svg class="art art-books" viewBox="0 0 84 76" aria-hidden="true" focusable="false">
    <path d="M8 58 L74 56 L76 70 L10 72 Z" fill="#2f6db5" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M14 61 L68 60" stroke="#fff3a6" stroke-width="2"/>
    <path d="M14 44 L70 46 L68 58 L12 57 Z" fill="#d63a3a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M60 46 L59 57" stroke="#f5c518" stroke-width="3"/>
    <path d="M10 32 L72 30 L74 44 L12 45 Z" fill="#3fb950" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M18 37 L40 36.5" stroke="#fff" stroke-width="2"/>
    <path d="M42 14 Q34 10 30 18 Q27 26 34 30 Q38 32 42 30 Q46 32 50 30 Q57 26 54 18 Q50 10 42 14 Z" fill="#e8372f" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M42 14 Q42 8 46 5" stroke="#5b3a1e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M44 9 Q50 4 54 8 Q50 12 44 9 Z" fill="#3fb950" stroke="${INK}" stroke-width="1.5"/>
    <path d="M35 18 Q36 15 39 15" stroke="#ff9c96" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
}

/** Paper bus stop sign on a snowy post, for "nothing here" moments. */
export function busStopSVG() {
  return `<svg class="art art-busstop" viewBox="0 0 90 170" aria-hidden="true" focusable="false">
    <path d="M10 160 Q45 148 80 160 L80 168 L10 168 Z" fill="${SNOW}" stroke="${INK}" stroke-width="2.5"/>
    <rect x="41" y="44" width="8" height="114" fill="#8a96a3" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="45" cy="34" r="28" fill="#2f6db5" stroke="${INK}" stroke-width="3"/>
    <circle cx="45" cy="34" r="22" fill="none" stroke="#fff" stroke-width="2.5"/>
    <text x="45" y="31" text-anchor="middle" font-family="Luckiest Guy, sans-serif" font-size="11" fill="#fff">BUS</text>
    <text x="45" y="44" text-anchor="middle" font-family="Luckiest Guy, sans-serif" font-size="11" fill="#fff">STOP</text>
    <path d="M24 12 Q45 2 66 12 Q60 8 45 8 Q30 8 24 12 Z" fill="${SNOW}" stroke="${INK}" stroke-width="1.5"/>
  </svg>`;
}

/** A row of little paper houses with lit windows and smoking chimneys, for the hero town. */
export function housesSVG() {
  const house = (x, w, h, wall, roof) => `
    <rect x="${x + w * 0.62}" y="${222 - h - 26}" width="${w * 0.12}" height="22" fill="#6b4a2e" stroke="${INK}" stroke-width="2"/>
    <path d="M${x + w * 0.68} ${222 - h - 30} q-6 -10 2 -16 q8 -6 2 -14" stroke="#c9d3dc" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
    <rect x="${x}" y="${222 - h}" width="${w}" height="${h}" fill="${wall}" stroke="${INK}" stroke-width="2.5"/>
    <path d="M${x - 8} ${222 - h} L${x + w / 2} ${222 - h - w * 0.45} L${x + w + 8} ${222 - h} Z" fill="${roof}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M${x - 8} ${222 - h} L${x + w / 2} ${222 - h - w * 0.45} L${x + w + 8} ${222 - h} L${x + w} ${222 - h + 5} L${x + w / 2} ${222 - h - w * 0.45 + 8} L${x} ${222 - h + 5} Z" fill="${SNOW}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="${x + w * 0.15}" y="${222 - h * 0.7}" width="${w * 0.22}" height="${h * 0.26}" fill="#ffd95e" stroke="${INK}" stroke-width="2"/>
    <rect x="${x + w * 0.6}" y="${222 - h * 0.55}" width="${w * 0.24}" height="${h * 0.55}" fill="#5b3a1e" stroke="${INK}" stroke-width="2"/>`;
  return [
    house(980, 70, 52, '#d6a25c', '#a93226'),
    house(1080, 56, 44, '#7fa7c9', '#2c3e52'),
    house(1160, 78, 58, '#c98a8a', '#5b3a1e'),
  ].join('');
}

/** Pines for the hero foreground (in the hero's 1440×320 coordinates). */
export function heroPinesSVG() {
  return [pine(70, 268, 120, '#24573a'), pine(150, 262, 90), pine(1300, 262, 100), pine(1385, 270, 130, '#24573a'), pine(880, 238, 70)].join('');
}

/** Paper magnifying glass with an orange question mark: the Daily Mystery logo. */
export function mysterySVG() {
  return `<svg class="art art-mystery" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
    <path d="M44 46 L62 64 Q65 67 62 70 Q59 72 56 69 L38 51 Z" fill="#7b45b8" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M47 52 L58 63" stroke="#b58ae8" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="30" cy="30" r="22" fill="#5b2a86" stroke="${INK}" stroke-width="3.5"/>
    <circle cx="30" cy="30" r="16" fill="#d9c6f2" stroke="${INK}" stroke-width="2.5"/>
    <path d="M20 22 Q24 16 31 16" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M24 26 Q24 19 30.5 19 Q37 19 37 25 Q37 29 32.5 31 Q30.5 32 30.5 35" fill="none" stroke="#f2711c" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M24 26 Q24 19 30.5 19 Q37 19 37 25 Q37 29 32.5 31 Q30.5 32 30.5 35" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>
    <circle cx="30.5" cy="40.5" r="2.8" fill="#f2711c" stroke="${INK}" stroke-width="1.5"/>
    <path d="M60 8 L62 14 L68 16 L62 18 L60 24 L58 18 L52 16 L58 14 Z" fill="#f2711c" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
  </svg>`;
}

// Paper knit hat with a red brim and bobble: Stan's Picks.
export const stanHatSVG = () => `<svg class="art art-stan-hat" viewBox="0 0 80 72" aria-hidden="true" focusable="false">
  <path d="M10 52 Q10 18 40 17 Q70 18 70 52 Z" fill="#3f6fc4" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M22 30 Q27 23 35 22" stroke="#7fa6e8" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M6 49 Q40 40 74 49 L73 63 Q40 55 7 63 Z" fill="#c8332e" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M18 49 L19 57 M30 47 L30 55 M50 47 L50 55 M62 49 L61 57" stroke="#8f1f1c" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M40 3 L45 6 L51 6 L50 12 L53 16 L47 18 L44 23 L39 20 L33 22 L31 16 L27 13 L32 9 L33 4 Z" fill="#c8332e" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
</svg>`;

// Paper chef hat: the Chef's menu button.
export const chefHatSVG = (size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" style="vertical-align:middle;flex:0 0 auto"><path d="M17 38C6 38 3 22 15 18C15 8 27 4 33 11C41 3 54 9 50 19C62 22 59 39 47 38L46 50L18 50Z" fill="#fdfaf0" stroke="#222" stroke-width="3.5" stroke-linejoin="round"/><path d="M17 49L47 49L46 59L18 60Z" fill="#d63a3a" stroke="#222" stroke-width="3.5" stroke-linejoin="round"/><path d="M26 39L25 45M38 39L39 45" stroke="#222" stroke-width="2.5" stroke-linecap="round"/></svg>`;
