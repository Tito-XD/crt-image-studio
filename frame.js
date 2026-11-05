import { fitSize } from './engine.js';
// Framing places the decoded image on a target canvas before the shared CRT pass,
// so preview and export always start from the same composed pixels.
export const RATIOS = [
  { key: 'source', label: '原图' },
  { key: '1:1', label: '1:1', w: 1, h: 1 },
  { key: '4:3', label: '4:3', w: 4, h: 3 },
  { key: '3:4', label: '3:4', w: 3, h: 4 },
  { key: '3:2', label: '3:2', w: 3, h: 2 },
  { key: '16:9', label: '16:9', w: 16, h: 9 },
  { key: '9:16', label: '9:16', w: 9, h: 16 },
  { key: '9:19.5', label: '9:19.5', w: 9, h: 19.5 },
];
export const BACKDROPS = [
  { key: 'blur', label: '模糊' }, { key: 'solid', label: '纯色' }, { key: 'paper', label: '纸纹' },
  { key: 'grid', label: '方格' }, { key: 'dots', label: '圆点' },
];
export const NEUTRALS = ['#f2ecdf', '#1f2b2f'];
const TUBE = '#0d1720';

export function layoutFrame(width, height, frame, limit) {
  const ratio = RATIOS.find(item => item.key === frame.ratio);
  if (!ratio?.w) {
    const size = fitSize(width, height, limit);
    return { ...size, framed: false, image: { x: 0, y: 0, width: size.width, height: size.height }, overflow: { x: 0, y: 0 } };
  }
  const target = ratio.w / ratio.h, aspect = width / height, cover = frame.fit === 'cover';
  let fw, fh;
  if (cover) [fw, fh] = aspect > target ? [height * target, height] : [width, width / target];
  else {
    const inner = 1 - 2 * frame.margin / 100;
    [fw, fh] = aspect > target ? [width / inner, width / inner / target] : [height / inner * target, height / inner];
  }
  const size = fitSize(fw, fh, limit);
  // Cover never shrinks below the frame; contain never enlarges the image beyond its own pixels.
  const scale = cover ? Math.max(size.width / width, size.height / height) : size.width / fw;
  const dw = width * scale, dh = height * scale;
  const pan = (room, value) => room * (.5 + .5 * (cover ? value : 0));
  const image = { x: pan(size.width - dw, frame.panX), y: pan(size.height - dh, frame.panY), width: dw, height: dh };
  return { ...size, framed: true, image, overflow: { x: Math.max(0, dw - size.width), y: Math.max(0, dh - size.height) } };
}
export function composeFrame(image, frame, limit) {
  const box = layoutFrame(image.naturalWidth, image.naturalHeight, frame, limit);
  const canvas = document.createElement('canvas'); canvas.width = box.width; canvas.height = box.height;
  const ctx = canvas.getContext('2d'), r = box.image;
  // Smoothing settings only apply to framed output, keeping the unframed pixels as before.
  if (box.framed) ctx.imageSmoothingQuality = 'high';
  // Unframed output keeps the original path: tube-coloured base, image stretched to the exact canvas.
  ctx.fillStyle = TUBE; ctx.fillRect(0, 0, box.width, box.height);
  if (box.framed && frame.fit === 'contain') {
    drawBackdrop(ctx, image, box, frame);
    const unit = Math.max(box.width, box.height) / 1000;
    ctx.save(); ctx.shadowColor = 'rgba(10,16,20,.32)'; ctx.shadowBlur = 22 * unit; ctx.shadowOffsetY = 6 * unit;
    ctx.fillStyle = TUBE; ctx.fillRect(r.x, r.y, r.width, r.height); ctx.restore();
  }
  ctx.drawImage(image, r.x, r.y, r.width, r.height);
  return { canvas, box };
}
let paperTile;
function paperPattern(ctx) {
  if (!paperTile) {
    paperTile = document.createElement('canvas'); paperTile.width = paperTile.height = 256;
    const t = paperTile.getContext('2d'), data = t.createImageData(256, 256), rand = seeded(7);
    for (let i = 0; i < data.data.length; i += 4) { const v = 118 + rand() * 20; data.data.set([v, v, v, 255], i); }
    t.putImageData(data, 0, 0);
    t.globalAlpha = .07; t.strokeStyle = '#000'; t.lineWidth = .7;
    for (let i = 0; i < 160; i++) { const x = rand() * 256, y = rand() * 256, a = rand() * Math.PI; t.beginPath(); t.moveTo(x, y); t.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 3); t.stroke(); }
  }
  return ctx.createPattern(paperTile, 'repeat');
}
function drawBackdrop(ctx, image, box, frame) {
  const { width: w, height: h } = box, unit = Math.max(w, h) / 1000, color = frame.color;
  if (frame.backdrop === 'blur') {
    const small = document.createElement('canvas'), s = 48 / Math.max(image.naturalWidth, image.naturalHeight);
    small.width = Math.max(1, Math.round(image.naturalWidth * s)); small.height = Math.max(1, Math.round(image.naturalHeight * s));
    small.getContext('2d').drawImage(image, 0, 0, small.width, small.height);
    const k = Math.max(w / small.width, h / small.height) * 1.15;
    ctx.drawImage(small, (w - small.width * k) / 2, (h - small.height * k) / 2, small.width * k, small.height * k);
    ctx.fillStyle = 'rgba(12,18,22,.22)'; ctx.fillRect(0, 0, w, h); return;
  }
  ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
  const dark = luma(color) < .45, ink = dark ? 'rgba(255,250,235,' : 'rgba(30,40,44,';
  if (frame.backdrop === 'paper') {
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .55;
    const p = paperPattern(ctx); p.setTransform(new DOMMatrix().scale(Math.max(1, unit * 1.2)));
    ctx.fillStyle = p; ctx.fillRect(0, 0, w, h); ctx.restore();
    const rand = seeded(3);
    for (let i = 0; i < 6; i++) {
      const x = rand() * w, y = rand() * h, rad = (120 + rand() * 260) * unit, g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(120,90,40,.06)'); g.addColorStop(1, 'rgba(120,90,40,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  } else if (frame.backdrop === 'grid') {
    const step = 28 * unit;
    for (let i = 0, x = (w / 2) % step; x < w; x += step, i++) { ctx.fillStyle = ink + (i % 4 ? .1 : .2) + ')'; ctx.fillRect(Math.round(x), 0, Math.max(1, unit), h); }
    for (let i = 0, y = (h / 2) % step; y < h; y += step, i++) { ctx.fillStyle = ink + (i % 4 ? .1 : .2) + ')'; ctx.fillRect(0, Math.round(y), w, Math.max(1, unit)); }
  } else if (frame.backdrop === 'dots') {
    const step = 22 * unit, rad = 2.6 * unit; ctx.fillStyle = ink + '.22)'; ctx.beginPath();
    for (let y = (h / 2) % step; y < h; y += step) for (let x = (w / 2) % step; x < w; x += step) { ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, Math.PI * 2); }
    ctx.fill();
  }
}

function seeded(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const channels = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const luma = hex => { const [r, g, b] = channels(hex); return .2126 * r + .7152 * g + .0722 * b; };
export const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
// A few distinct, reasonably common colours from the picture for one-tap backgrounds.
export function extractPalette(image, count = 4) {
  const c = document.createElement('canvas'), s = 64 / Math.max(image.naturalWidth, image.naturalHeight);
  c.width = Math.max(1, Math.round(image.naturalWidth * s)); c.height = Math.max(1, Math.round(image.naturalHeight * s));
  const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height).data, buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = (data[i] >> 4) << 8 | (data[i + 1] >> 4) << 4 | data[i + 2] >> 4;
    const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2]; buckets.set(key, b);
  }
  const picked = [];
  for (const b of [...buckets.values()].sort((x, y) => y.n - x.n)) {
    const rgb = [b.r / b.n, b.g / b.n, b.b / b.n];
    if (picked.every(p => Math.hypot(p[0] - rgb[0], p[1] - rgb[1], p[2] - rgb[2]) > 60)) picked.push(rgb);
    if (picked.length === count) break;
  }
  return picked.map(rgb => toHex(...rgb));
}
