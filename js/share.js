// Shareable paper-cutout cards: one of your reviews, or your Top 4, drawn on a canvas.
// Original art, plus the episode stills on both cards. Any button with data-share-review="<log id>" or
// data-share-top4="<username>" or data-share-award (badge / personality) opens the preview.
import { supabase } from './supabase.js?v=20261127134202';
import { epCode, stars, toast } from './ui.js?v=20261127134202';
import { fallbackColour, stillUrl } from './episodes.js?v=20261127134202';
import { SITE_LINK } from './config.js?v=20261127134202';

const W = 1080;
const H = 1350;
const INK = '#141414';
const PAPER = '#f6f1e1';
const NAVY = '#1d3557';
const LOGO_COLOURS = ['#3fb950', '#4a90e2', '#d63a3a', '#f5c518', '#f2711c'];
const DISPLAY = '"Luckiest Guy", cursive';
const BODY = 'Inter, sans-serif';


// ---- Drawing helpers ----

/** A slightly crooked cut-out rectangle with a hard shadow. */
function paper(c, x, y, w, h, colour, tilt = 0) {
  c.save();
  c.translate(x + w / 2, y + h / 2);
  c.rotate((tilt * Math.PI) / 180);
  const l = -w / 2;
  const t = -h / 2;
  const points = [[l + 4, t + 10], [l + w * 0.45, t], [l + w - 8, t + 6], [l + w, t + h * 0.52],
    [l + w - 5, t + h - 7], [l + w * 0.55, t + h], [l + 9, t + h - 4], [l, t + h * 0.48]];
  const trace = (dx, dy) => {
    c.beginPath();
    points.forEach(([px, py], i) => c[i ? 'lineTo' : 'moveTo'](px + dx, py + dy));
    c.closePath();
  };
  trace(10, 12);
  c.fillStyle = 'rgba(0,0,0,.45)';
  c.fill();
  trace(0, 0);
  c.fillStyle = colour;
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = INK;
  c.stroke();
  c.restore();
}

function text(c, value, x, y, { size = 32, font = BODY, weight = 400, colour = INK, align = 'left' } = {}) {
  c.font = `${weight} ${size}px ${font}`;
  c.fillStyle = colour;
  c.textAlign = align;
  c.textBaseline = 'alphabetic';
  c.fillText(value, x, y);
}

/** Split into lines that fit the width (uses the current font). Very long words are broken. */
function wrap(c, value, width) {
  const lines = [];
  for (const para of String(value).split('\n')) {
    let line = '';
    for (let word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (c.measureText(next).width <= width) { line = next; continue; }
      if (line) lines.push(line);
      while (c.measureText(word).width > width) {
        let n = word.length - 1;
        while (n > 1 && c.measureText(word.slice(0, n)).width > width) n--;
        lines.push(word.slice(0, n));
        word = word.slice(n);
      }
      line = word;
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Wrapped text capped at maxLines, with … when something had to go. Returns the lines used. */
function clamp(c, value, width, maxLines) {
  const lines = wrap(c, value, width);
  if (lines.length <= maxLines) return lines;
  const cut = lines.slice(0, maxLines);
  let last = cut[maxLines - 1];
  while (last && c.measureText(`${last}…`).width > width) last = last.slice(0, -1);
  cut[maxLines - 1] = `${last.trimEnd()}…`;
  return cut;
}

function pine(c, x, base, height, colour) {
  c.fillStyle = colour;
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x, base - height);
  for (const [dx, dy] of [[0.28, 0.62], [0.14, 0.62], [0.44, 0.2], [-0.44, 0.2], [-0.14, 0.62], [-0.28, 0.62]]) {
    c.lineTo(x + dx * height, base - dy * height);
  }
  c.closePath();
  c.fill();
  c.stroke();
}

/** Night sky, logo tiles, pines on the snow and the invitation at the bottom. */
function backdrop(c) {
  c.fillStyle = '#14181c';
  c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,.5)';
  for (let i = 0; i < 90; i++) {
    c.beginPath();
    c.arc((i * 263) % W, (i * 419) % H, 1.5 + (i % 3), 0, Math.PI * 2);
    c.fill();
  }
  const letters = 'PARKBOXD';
  const size = 76;
  let x = (W - letters.length * (size + 8)) / 2;
  [...letters].forEach((ch, i) => {
    paper(c, x, 48 + (i % 2 ? 6 : 0), size, size, LOGO_COLOURS[i % 5], i % 2 ? 4 : -4);
    text(c, ch, x + size / 2, 106 + (i % 2 ? 6 : 0), { size: 52, font: DISPLAY, colour: '#14181c', align: 'center' });
    x += size + 8;
  });
  for (let i = 0; i < 13; i++) pine(c, 40 + i * 84, 1240, 80 + ((i * 37) % 50), i % 3 ? '#2e6b3f' : '#24573a');
  c.fillStyle = '#eef4f8';
  c.strokeStyle = INK;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(-5, H + 5);
  c.lineTo(-5, 1236);
  c.bezierCurveTo(250, 1200, 420, 1260, 620, 1230);
  c.bezierCurveTo(820, 1200, 960, 1250, W + 5, 1225);
  c.lineTo(W + 5, H + 5);
  c.fill();
  c.stroke();
  text(c, `Log your own at ${SITE_LINK}`, W / 2, 1305, { size: 34, weight: 700, colour: NAVY, align: 'center' });
}

async function newCanvas() {
  await Promise.all(['40px "Luckiest Guy"', '400 40px Inter', '700 40px Inter'].map((f) => document.fonts.load(f))).catch(() => {});
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  backdrop(c);
  return { canvas, c };
}

/** { name, title, code, rating, liked, review, picture } -> canvas */
export async function drawReviewCard({ name, title, code, rating, liked, review, picture }) {
  const { canvas, c } = await newCanvas();
  paper(c, 70, 180, 940, 970, PAPER, -0.8);
  const img = await loadPicture(picture);
  // With a picture on top, everything under it is a bit smaller to leave room for the review.
  if (img) cover(c, img, 130, 215, 820, 310);
  const headSize = img ? 52 : 66;
  c.font = `400 ${headSize}px ${DISPLAY}`;
  const heading = clamp(c, title, 820, 2);
  let y = img ? 590 : 280;
  for (const line of heading) { text(c, line, 130, y, { size: headSize, font: DISPLAY, colour: NAVY }); y += headSize + 6; }
  text(c, code, 130, y - 14, { size: img ? 28 : 30, colour: '#555' });
  if (img) {
    // Stars and heart share the episode code's line.
    if (liked) text(c, '♥', 950, y - 12, { size: 44, colour: '#d63a3a', align: 'right' });
    text(c, stars(rating), liked ? 890 : 950, y - 12, { size: 44, colour: '#b9770e', align: 'right' });
    y += 8;
  } else {
    y += 62;
    if (rating != null || liked) {
      text(c, stars(rating), 130, y, { size: 64, colour: '#b9770e' });
      if (liked) text(c, '♥', 950, y, { size: 64, colour: '#d63a3a', align: 'right' });
      y += 34;
    }
  }
  c.fillStyle = '#c0392b';
  c.fillRect(130, y, 820, 3);
  // Short reviews get big writing; long ones shrink, then get cut off.
  const room = 1040 - y;
  let size = 52;
  const fits = () => { c.font = `400 ${size}px ${BODY}`; return wrap(c, review, 820).length * size * 1.4 <= room; };
  while (size > 32 && !fits()) size -= 2;
  c.font = `400 ${size}px ${BODY}`;
  const lines = clamp(c, review, 820, Math.floor(room / (size * 1.4)));
  y += 20;
  for (const line of lines) { y += size * 1.4; text(c, line, 130, y - 8, { size, colour: '#2b2b2b' }); }
  c.font = `700 36px ${BODY}`;
  text(c, clamp(c, `— ${name}`, 820, 1)[0], 950, 1105, { size: 36, weight: 700, colour: NAVY, align: 'right' });
  return canvas;
}

/** { name, picks: [{ id, title, code, rating, picture }] } -> canvas */
export async function drawTop4Card({ name, picks }) {
  const { canvas, c } = await newCanvas();
  c.font = `400 62px ${DISPLAY}`;
  text(c, clamp(c, `${name}'s Top 4`, 960, 1)[0], W / 2, 240, { size: 62, font: DISPLAY, colour: '#fff', align: 'center' });
  const four = picks.slice(0, 4);
  const pictures = await Promise.all(four.map((p) => loadPicture(p.picture)));
  four.forEach((p, i) => {
    const x = 70 + (i % 2) * 485;
    const y = 285 + Math.floor(i / 2) * 440;
    paper(c, x, y, 455, 405, fallbackColour(p), i % 3 ? 1.2 : -1.2);
    // The episode picture (16:9), or a big number on the coloured paper if there isn't one.
    const img = pictures[i];
    if (img) {
      cover(c, img, x + 24, y + 22, 407, 229);
      paper(c, x + 8, y + 8, 70, 70, fallbackColour(p), -5);
      text(c, String(i + 1), x + 43, y + 64, { size: 52, font: DISPLAY, colour: '#fff', align: 'center' });
    } else {
      text(c, String(i + 1), x + 227, y + 190, { size: 150, font: DISPLAY, colour: '#fff', align: 'center' });
    }
    paper(c, x + 24, y + 262, 407, 126, PAPER, 0);
    c.font = `400 32px ${DISPLAY}`;
    const title = clamp(c, p.title, 365, 2);
    title.forEach((line, n) => text(c, line, x + 44, y + (title.length > 1 ? 300 : 316) + n * 34, { size: 32, font: DISPLAY, colour: NAVY }));
    text(c, p.code, x + 44, y + 372, { size: 24, colour: '#555' });
    text(c, stars(p.rating), x + 411, y + 373, { size: 30, colour: '#b9770e', align: 'right' });
  });
  return canvas;
}

/** Resolves to the loaded image, or null. The extra query keeps the browser from reusing the
 *  page's own (non-CORS) cached copy, which would stop the canvas being saved. */
function loadPicture(src) {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 8000);
    img.crossOrigin = 'anonymous';
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = `${src}${src.includes('?') ? '&' : '?'}card=1`;
  });
}

/** Fill the box with the image, cropping the overflow, with an ink outline. */
function cover(c, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  c.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  c.lineWidth = 4;
  c.strokeStyle = INK;
  c.strokeRect(x, y, w, h);
}

/** A badge or personality: { kicker, emoji, heading, line, name } -> canvas */
export async function drawAwardCard({ kicker, emoji, heading, line, name }) {
  const { canvas, c } = await newCanvas();
  paper(c, 110, 200, 860, 940, PAPER, 0.8);
  text(c, kicker, W / 2, 292, { size: 36, weight: 700, colour: '#c0392b', align: 'center' });
  paper(c, W / 2 - 150, 340, 300, 300, '#f5c518', -4);
  text(c, emoji, W / 2, 550, { size: 170, align: 'center' });
  c.font = `400 72px ${DISPLAY}`;
  let y = 750;
  for (const l of clamp(c, heading, 760, 2)) { text(c, l, W / 2, y, { size: 72, font: DISPLAY, colour: NAVY, align: 'center' }); y += 80; }
  c.font = `400 36px ${BODY}`;
  y += 5;
  for (const l of clamp(c, line, 740, 4)) { text(c, l, W / 2, y, { size: 36, colour: '#2b2b2b', align: 'center' }); y += 50; }
  c.font = `700 36px ${BODY}`;
  text(c, clamp(c, `— ${name}`, 760, 1)[0], W / 2, 1100, { size: 36, weight: 700, colour: NAVY, align: 'center' });
  return canvas;
}

// ---- Preview dialog ----

function showPreview(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return toast("Couldn't make the image.");
    const url = URL.createObjectURL(blob);
    const file = new File([blob], filename, { type: 'image/png' });
    const canShare = !!navigator.canShare?.({ files: [file] });
    const d = document.createElement('dialog');
    d.className = 'log-dialog share-dialog';
    d.setAttribute('aria-label', 'Share card');
    d.innerHTML = `
      <div class="sheet paper">
        <h2 class="cut">Your card</h2>
        <img alt="Preview of your share card">
        <div class="actions">
          <button type="button" class="btn btn-ghost" data-close>Close</button>
          <a class="btn ${canShare ? 'btn-ghost' : 'btn-green'}" data-download>Download</a>
          ${canShare ? '<button type="button" class="btn btn-green" data-send>Share</button>' : ''}
        </div>
      </div>`;
    d.querySelector('img').src = url;
    const link = d.querySelector('[data-download]');
    link.href = url;
    link.download = filename;
    d.querySelector('[data-close]').onclick = () => d.close();
    d.querySelector('[data-send]')?.addEventListener('click', async () => {
      try {
        await navigator.share({ files: [file], text: `Log your own at https://${SITE_LINK}` });
      } catch (e) {
        if (e?.name !== 'AbortError') toast("Sharing didn't work. Download it instead.");
      }
    });
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => { d.remove(); URL.revokeObjectURL(url); });
    document.body.append(d);
    d.showModal();
  }, 'image/png');
}

// ---- Loading what goes on the card ----

async function reviewData(id) {
  const { data: r, error } = await supabase.from('logs')
    .select('rating, liked, review, profiles!logs_user_id_fkey(username, display_name), episodes(id, kind, season, number, title, air_date, still_path)')
    .eq('id', id).maybeSingle();
  if (error || !r?.review) throw new Error(error?.message || "Couldn't find that review.");
  return {
    name: r.profiles?.display_name || r.profiles?.username,
    title: r.episodes.title,
    code: epCode(r.episodes),
    rating: r.rating == null ? null : Number(r.rating),
    liked: r.liked,
    review: r.review,
    picture: stillUrl(r.episodes, 'w780'),
  };
}

async function top4Data(username) {
  const { data: p, error } = await supabase.from('profiles').select('id, username, display_name, top4').eq('username', username).maybeSingle();
  if (error || !p?.top4?.length) throw new Error(error?.message || 'Pick some favourites first.');
  const [{ data: eps }, { data: ratings }] = await Promise.all([
    supabase.from('episodes').select('id, kind, season, number, title, air_date, still_path').in('id', p.top4),
    supabase.from('latest_ratings').select('episode_id, rating').eq('user_id', p.id).in('episode_id', p.top4),
  ]);
  const picks = p.top4.map((id) => (eps || []).find((e) => e.id === id)).filter(Boolean).map((e) => {
    const r = (ratings || []).find((x) => x.episode_id === e.id)?.rating;
    return { id: e.id, title: e.title, code: epCode(e), rating: r == null ? null : Number(r), picture: stillUrl(e, 'w500') };
  });
  return { name: p.display_name || p.username, picks };
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest?.('[data-share-review], [data-share-top4], [data-share-award]');
  if (!b || b.disabled) return;
  b.disabled = true;
  try {
    const { shareReview, shareTop4 } = b.dataset;
    if (b.hasAttribute('data-share-award')) showPreview(await drawAwardCard(b.dataset), 'parkboxd-card.png');
    else if (shareReview) showPreview(await drawReviewCard(await reviewData(Number(shareReview))), `parkboxd-review-${shareReview}.png`);
    else showPreview(await drawTop4Card(await top4Data(shareTop4)), `parkboxd-top4-${shareTop4}.png`);
  } catch (err) {
    toast(`Couldn't make the card: ${err?.message || err}`);
  } finally {
    b.disabled = false;
  }
});
