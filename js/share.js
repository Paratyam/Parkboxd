// Shareable paper-cutout cards: one of your reviews, or your Top 4, drawn on a canvas.
// Original art only (no episode stills). Any button with data-share-review="<log id>" or
// data-share-top4="<username>" opens the preview.
import { supabase } from './supabase.js?v=20261127123741';
import { epCode, stars, toast } from './ui.js?v=20261127123741';
import { fallbackColour } from './episodes.js?v=20261127123741';

const W = 1080;
const H = 1350;
const INK = '#141414';
const PAPER = '#f6f1e1';
const NAVY = '#1d3557';
const LOGO_COLOURS = ['#3fb950', '#4a90e2', '#d63a3a', '#f5c518', '#f2711c'];
const DISPLAY = '"Luckiest Guy", cursive';
const BODY = 'Inter, sans-serif';
export const SITE_LINK = 'paratyam.github.io/Parkboxd';

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

/** { name, title, code, rating, liked, review } -> canvas */
export async function drawReviewCard({ name, title, code, rating, liked, review }) {
  const { canvas, c } = await newCanvas();
  paper(c, 70, 180, 940, 970, PAPER, -0.8);
  c.font = `400 66px ${DISPLAY}`;
  const heading = clamp(c, title, 820, 2);
  let y = 280;
  for (const line of heading) { text(c, line, 130, y, { size: 66, font: DISPLAY, colour: NAVY }); y += 72; }
  text(c, code, 130, y - 14, { size: 30, colour: '#555' });
  y += 62;
  const score = [stars(rating), liked ? '♥' : ''].filter(Boolean);
  if (score.length) {
    text(c, stars(rating), 130, y, { size: 64, colour: '#b9770e' });
    if (liked) text(c, '♥', 950, y, { size: 64, colour: '#d63a3a', align: 'right' });
    y += 34;
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

/** { name, picks: [{ id, title, code, rating }] } -> canvas */
export async function drawTop4Card({ name, picks }) {
  const { canvas, c } = await newCanvas();
  c.font = `400 62px ${DISPLAY}`;
  text(c, clamp(c, `${name}'s Top 4`, 960, 1)[0], W / 2, 240, { size: 62, font: DISPLAY, colour: '#fff', align: 'center' });
  picks.slice(0, 4).forEach((p, i) => {
    const x = 70 + (i % 2) * 485;
    const y = 285 + Math.floor(i / 2) * 440;
    paper(c, x, y, 455, 405, fallbackColour(p), i % 3 ? 1.2 : -1.2);
    text(c, String(i + 1), x + 34, y + 90, { size: 80, font: DISPLAY, colour: '#fff' });
    paper(c, x + 24, y + 125, 407, 250, PAPER, 0);
    c.font = `400 42px ${DISPLAY}`;
    let ty = y + 183;
    for (const line of clamp(c, p.title, 360, 3)) { text(c, line, x + 48, ty, { size: 42, font: DISPLAY, colour: NAVY }); ty += 46; }
    text(c, p.code, x + 48, y + 322, { size: 28, colour: '#555' });
    text(c, stars(p.rating), x + 48, y + 358, { size: 34, colour: '#b9770e' });
  });
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
    .select('rating, liked, review, profiles!logs_user_id_fkey(username, display_name), episodes(id, kind, season, number, title, air_date)')
    .eq('id', id).maybeSingle();
  if (error || !r?.review) throw new Error(error?.message || "Couldn't find that review.");
  return {
    name: r.profiles?.display_name || r.profiles?.username,
    title: r.episodes.title,
    code: epCode(r.episodes),
    rating: r.rating == null ? null : Number(r.rating),
    liked: r.liked,
    review: r.review,
  };
}

async function top4Data(username) {
  const { data: p, error } = await supabase.from('profiles').select('id, username, display_name, top4').eq('username', username).maybeSingle();
  if (error || !p?.top4?.length) throw new Error(error?.message || 'Pick some favourites first.');
  const [{ data: eps }, { data: ratings }] = await Promise.all([
    supabase.from('episodes').select('id, kind, season, number, title, air_date').in('id', p.top4),
    supabase.from('latest_ratings').select('episode_id, rating').eq('user_id', p.id).in('episode_id', p.top4),
  ]);
  const picks = p.top4.map((id) => (eps || []).find((e) => e.id === id)).filter(Boolean).map((e) => {
    const r = (ratings || []).find((x) => x.episode_id === e.id)?.rating;
    return { id: e.id, title: e.title, code: epCode(e), rating: r == null ? null : Number(r) };
  });
  return { name: p.display_name || p.username, picks };
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest?.('[data-share-review], [data-share-top4]');
  if (!b || b.disabled) return;
  b.disabled = true;
  try {
    const { shareReview, shareTop4 } = b.dataset;
    if (shareReview) showPreview(await drawReviewCard(await reviewData(Number(shareReview))), `parkboxd-review-${shareReview}.png`);
    else showPreview(await drawTop4Card(await top4Data(shareTop4)), `parkboxd-top4-${shareTop4}.png`);
  } catch (err) {
    toast(`Couldn't make the card: ${err?.message || err}`);
  } finally {
    b.disabled = false;
  }
});
