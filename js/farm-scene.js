// An original paper-cutout farm at sunset: the backdrop behind the plant on the streak share card.
const CUT = 'stroke="#141414" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

const pine = (x, base, h) => `<path d="M${x} ${base - h} L${x + h * 0.22} ${base - h * 0.58} H${x + h * 0.11} L${x + h * 0.36} ${base - h * 0.15} H${x - h * 0.36} L${x - h * 0.11} ${base - h * 0.58} H${x - h * 0.22} Z" fill="#24503a" ${CUT}/>`;
const cloud = (x, y, k) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0 30 Q-4 8 22 12 Q30 -8 55 4 Q80 -2 84 18 Q108 18 104 32 Z" fill="#ffd9c2" ${CUT}/>`;
const star = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`;

export function farmSceneSVG() {
  const rays = Array.from({ length: 11 }, (_, i) => {
    const a = (Math.PI * (i + 0.5)) / 11;
    const at = (angle, r) => `${390 - r * Math.cos(angle)} ${350 - r * Math.sin(angle)}`;
    return `<path d="M${at(a - 0.05, 190)} L${at(a, 420)} L${at(a + 0.05, 190)} Z" fill="#ffe08a" opacity=".22"/>`;
  }).join('');
  // Crop rows running towards the sunset.
  const rows = [-420, -250, -110, 20, 140, 640, 760, 890, 1030, 1200].map((x) => `<path d="M390 380 L${x - 40} 600 H${x + 40} Z" fill="#2f6b34" opacity=".75"/>`).join('');
  const posts = [520, 575, 630, 685, 740].map((x) => `<rect x="${x}" y="430" width="14" height="70" rx="3" fill="#a8744c" ${CUT}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="600" viewBox="0 0 780 600">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b1e5c"/><stop offset=".42" stop-color="#8b3f86"/><stop offset=".72" stop-color="#ee6c4d"/><stop offset="1" stop-color="#ffc15e"/>
    </linearGradient></defs>
    <rect width="780" height="400" fill="url(#sky)"/>
    ${[[60, 40, 3], [150, 90, 2], [250, 35, 2], [520, 55, 3], [610, 25, 2], [720, 80, 2], [380, 20, 2], [90, 140, 2]].map((s) => star(...s)).join('')}
    ${rays}
    <circle cx="390" cy="350" r="175" fill="#ffd166" ${CUT}/>
    <circle cx="390" cy="350" r="135" fill="#ffe08a"/>
    ${cloud(40, 190, 1.1)}${cloud(610, 140, 1.25)}
    <path d="M-10 390 L110 235 L185 320 L265 250 L380 390 Z" fill="#4a3f78" ${CUT}/>
    <path d="M400 390 L545 245 L610 310 L690 215 L790 390 Z" fill="#4a3f78" ${CUT}/>
    <path d="M110 235 L137 270 L118 265 L102 280 L87 264 Z M265 250 L290 281 L270 277 L255 292 L240 278 Z M545 245 L573 275 L552 271 L538 286 L522 269 Z M690 215 L718 264 L696 258 L680 274 L667 252 Z" fill="#f4f8fb" ${CUT}/>
    ${pine(40, 400, 110)}${pine(96, 404, 80)}${pine(668, 400, 95)}${pine(728, 405, 125)}
    <path d="M-10 385 Q200 355 390 380 Q590 405 790 372 V610 H-10 Z" fill="#4f9a45" ${CUT}/>
    ${rows}
    <path d="M70 430 V340 L100 300 L150 280 L200 300 L230 340 V430 Z" fill="#c0392b" ${CUT}/>
    <path d="M58 345 L95 296 L150 272 L205 296 L242 345" fill="none" stroke="#f6f1e1" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="122" y="360" width="56" height="70" fill="#f6f1e1" ${CUT}/>
    <path d="M122 360 L178 430 M178 360 L122 430" stroke="#c0392b" stroke-width="6"/>
    <circle cx="150" cy="322" r="14" fill="#ffe08a" ${CUT}/>
    <path d="M238 430 V335 Q262 305 286 335 V430 Z" fill="#cfd8e3" ${CUT}/>
    <path d="M238 360 H286 M238 390 H286" stroke="#7d8a99" stroke-width="4"/>
    ${posts}
    <path d="M510 450 H775 M510 478 H775" stroke="#141414" stroke-width="13" stroke-linecap="round"/>
    <path d="M510 450 H775 M510 478 H775" stroke="#c8915f" stroke-width="7" stroke-linecap="round"/>
    <path d="M-10 545 Q200 520 390 540 Q590 560 790 530 V610 H-10 Z" fill="#6b4226" ${CUT}/>
    <ellipse cx="390" cy="566" rx="150" ry="16" fill="#141414" opacity=".28"/>
  </svg>`;
}
