// In-page half of tool/make-demo.mjs. Every frame is a pure function of time, so all motion stays continuous.
import { CRTRenderer, PRESETS, CONTROLS } from '../engine.js';

const FONT = 'system-ui, "PingFang SC", "Microsoft YaHei UI", "Noto Sans SC", sans-serif';
const MONO = 'ui-monospace, "Cascadia Mono", Consolas, monospace';
const C = { ink: '#263c43', cream: '#fcfcf5', text: '#3c5049', faint: '#6e7a68', sage: '#6f8664', fill: '#7d9470', track: '#dbe2d2', accent: '#cf6245' };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const out3 = t => 1 - Math.pow(1 - t, 3);
const outBack = t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], t))).join(',')})`; };

const look = (key, tweak = {}) => key
  ? { id: key + JSON.stringify(tweak), label: PRESETS[key].label, settings: { ...PRESETS[key], ...tweak } }
  : { id: 'orig', label: '原图', settings: null };
const ORIG = look(null), VHS = look('vhs'), ARCADE = look('arcade');
const COMIC = look('comic', { lines: 320, halftone: 80, saturation: 120 });
const SWEEP = ['handheld', 'terminal', 'amber', 'polaroid', 'sepia', 'newsprint', 'pocket', 'eightbit', 'warm'].map(k => look(k));
// The slider demo shows these chips and performs these drags on top of 街机时刻.
const CHIPS = ['scan', 'curve', 'warmth', 'lines'].map(key => CONTROLS.find(c => c.key === key));
const DRAGS = [{ key: 'lines', to: 140 }, { key: 'curve', to: 62 }, { key: 'warmth', to: 55 }];

// Timeline in seconds.
const T = {};
let clock = 0;
const mark = (name, d) => { T[name] = [clock, clock + d]; clock += d; };
mark('intro', 1.1); mark('sweep', 3.4); mark('comic', 1.0); mark('toVhs', .75); mark('vhs', .9);
mark('toArcade', .75); mark('arcade', .35); mark('panelIn', .5);
DRAGS.forEach((_, i) => mark(`drag${i}`, 1.55));
mark('panelOut', .5); mark('toOrig', .85); mark('outro', .7);
export const DURATION = clock;
const D0 = i => T[`drag${i}`][0];
const tapAt = i => D0(i) + .35;
const dragWin = i => [D0(i) + .7, D0(i) + 1.45];
const SEL = [{ t: -1, key: 'scan' }, ...DRAGS.map((d, i) => ({ t: tapAt(i), key: d.key }))];

function valueAt(key, t) {
  let v = ARCADE.settings[key];
  DRAGS.forEach((d, i) => { if (d.key === key) v = lerp(v, d.to, inOut(seg(t, ...dragWin(i)))); });
  return v;
}
function tuned(t) {
  const settings = { ...ARCADE.settings };
  for (const d of DRAGS) settings[d.key] = valueAt(d.key, t);
  return { id: 'tuned', label: t > dragWin(0)[0] + .15 ? '街机时刻 · 自定义' : ARCADE.label, settings, live: true };
}

// Which two looks are on screen and where the refresh beam is (0 = top, 1 = bottom).
const SWEEP_PATH = [ORIG, ...SWEEP, COMIC];
function sweepPhase(t) {
  const u = seg(t, ...T.sweep);
  return lerp(u, inOut(u), .55) * (SWEEP_PATH.length - 1);
}
function stateAt(t) {
  if (t < T.intro[1]) return { from: ORIG, to: ORIG, y: 1 };
  if (t < T.sweep[1]) {
    const p = Math.min(sweepPhase(t), SWEEP_PATH.length - 1 - 1e-6), i = Math.floor(p);
    return { from: SWEEP_PATH[i], to: SWEEP_PATH[i + 1], y: p - i };
  }
  const wipe = (name, from, to) => ({ from, to, y: inOut(seg(t, ...T[name])) });
  if (t < T.comic[1]) return { from: COMIC, to: COMIC, y: 1 };
  if (t < T.toVhs[1]) return wipe('toVhs', COMIC, VHS);
  if (t < T.vhs[1]) return { from: VHS, to: VHS, y: 1 };
  if (t < T.toArcade[1]) return wipe('toArcade', VHS, ARCADE);
  if (t < T.arcade[1]) return { from: ARCADE, to: ARCADE, y: 1 };
  if (t < T.panelOut[1]) { const l = tuned(t); return { from: l, to: l, y: 1 }; }
  if (t < T.toOrig[1]) return wipe('toOrig', tuned(t), ORIG);
  return { from: ORIG, to: ORIG, y: 1 };
}
const shownLabel = s => (s.y >= .5 ? s.to : s.from).label;

let gl, renderer, base, out, ctx, W, H, K;
const cache = new Map();
function layer(l) {
  if (!l.settings) return base;
  if (!l.live && cache.has(l.id)) return cache.get(l.id);
  renderer.render(l.settings, W, H);
  if (l.live) return gl;
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(gl, 0, 0);
  cache.set(l.id, c); return c;
}

// Layout is designed at 540 px wide and scaled with K so other image sizes keep proportions.
let L, labelEvents, cursorKeys;
function layout() {
  const pw = W / K - 36, ph = 132;
  L = { px: 18, pw, ph, py: H / K - ph - 18, chipY: 16, chipH: 30, headY: 70, trackY: 102 };
  L.trackX = L.px + 18; L.trackW = pw - 36;
  ctx.font = `13px ${FONT}`;
  let x = L.px + 16;
  L.chips = CHIPS.map(c => { const w = ctx.measureText(c.label).width + 22, chip = { ...c, x, w }; x += w + 6; return chip; });
  const chip = key => L.chips.find(c => c.key === key);
  const chipC = key => ({ x: chip(key).x + chip(key).w / 2, y: L.py + L.chipY + L.chipH / 2 });
  const thumb = (key, v) => ({ x: L.trackX + L.trackW * frac(key, v), y: L.py + L.trackY });
  const k = [];
  const add = (t, p) => k.push({ t, ...p });
  add(T.panelIn[0] + .15, { x: W / K * .78, y: H / K + 30 });
  DRAGS.forEach((d, i) => {
    const before = valueAt(d.key, dragWin(i)[0]);
    add(D0(i) + .05, i ? thumb(DRAGS[i - 1].key, DRAGS[i - 1].to) : { x: W / K * .7, y: L.py + 60 });
    add(tapAt(i) - .02, chipC(d.key)); add(tapAt(i) + .12, chipC(d.key));
    add(dragWin(i)[0] - .06, thumb(d.key, before));
    add(dragWin(i)[1] + .05, thumb(d.key, d.to));
  });
  const last = DRAGS.at(-1);
  add(T.panelOut[0], thumb(last.key, last.to));
  add(T.panelOut[0] + .45, { x: W / K * .86, y: H / K + 40 });
  cursorKeys = k;
  // Label changes happen exactly when the beam passes the middle of the picture.
  labelEvents = [];
  let prev = null;
  for (let t = 0; t <= DURATION; t += 1 / 240) {
    const text = shownLabel(stateAt(t));
    if (text !== prev) { labelEvents.push({ t, text, w: textW(text) }); prev = text; }
  }
}
const frac = (key, v) => { const c = CONTROLS.find(x => x.key === key); return (v - c.min) / (c.max - c.min); };
const textW = s => { ctx.save(); ctx.font = `600 19px ${FONT}`; const w = ctx.measureText(s).width; ctx.restore(); return w; };
function selectedAt(t) { let i = 0; SEL.forEach((s, j) => { if (t >= s.t) i = j; }); return i; }
function cursorAt(t) {
  const k = cursorKeys, d = DRAGS.findIndex((_, i) => t >= dragWin(i)[0] - .06 && t <= dragWin(i)[1] + .05);
  if (d >= 0) return { x: L.trackX + L.trackW * frac(DRAGS[d].key, valueAt(DRAGS[d].key, t)), y: L.py + L.trackY };
  if (t <= k[0].t) return k[0];
  for (let i = 1; i < k.length; i++) if (t <= k[i].t) {
    const e = inOut(seg(t, k[i - 1].t, k[i].t));
    return { x: lerp(k[i - 1].x, k[i].x, e), y: lerp(k[i - 1].y, k[i].y, e) };
  }
  return k.at(-1);
}

// ---- drawing ----
let lastY = null;
function drawPicture(t) {
  const s = stateAt(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer(s.from), 0, 0);
  const y = Math.round(s.y * H);
  if (s.to !== s.from && y > 0) {
    ctx.drawImage(layer(s.to), 0, 0, W, y, 0, 0, W, y);
    // Faster beam, longer afterglow; a red/cyan fringe sells the tube refresh.
    const speed = lastY == null ? 0 : Math.abs(s.y - lastY);
    const band = clamp(speed * H * 2.2, 26 * K, 120 * K);
    const g = ctx.createLinearGradient(0, y - band, 0, y);
    g.addColorStop(0, 'rgba(120,255,220,0)'); g.addColorStop(1, 'rgba(120,255,220,.38)');
    ctx.fillStyle = g; ctx.fillRect(0, y - band, W, band);
    ctx.fillStyle = 'rgba(255,90,90,.55)'; ctx.fillRect(0, y - 4 * K, W, 2 * K);
    ctx.fillStyle = 'rgba(90,230,255,.55)'; ctx.fillRect(0, y + 1 * K, W, 2 * K);
    ctx.fillStyle = 'rgba(240,255,250,.97)'; ctx.fillRect(0, y - 2 * K, W, 3 * K);
  }
  lastY = s.to !== s.from ? s.y : null;
  ctx.setTransform(K, 0, 0, K, 0, 0);
}
function panelShown(t) {
  if (t < T.panelIn[0] || t > T.panelOut[1]) return 0;
  if (t < T.panelIn[1]) return outBack(seg(t, ...T.panelIn));
  if (t > T.panelOut[0]) return 1 - inOut(seg(t, ...T.panelOut));
  return 1;
}
function drawBrand(t) {
  const a = 1 - inOut(seg(t, .55, .95)) + inOut(seg(t, DURATION - .6, DURATION - .15));
  if (a <= 0) return;
  const w = W / K, rise = (1 - a) * -10;
  ctx.save(); ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, 0, 0, 150);
  g.addColorStop(0, 'rgba(6,11,15,.9)'); g.addColorStop(.6, 'rgba(6,11,15,.7)'); g.addColorStop(1, 'rgba(6,11,15,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, 150);
  ctx.fillStyle = '#fff'; ctx.font = `700 30px ${FONT}`; ctx.fillText('CRT 显像工坊', 18, 48 + rise);
  ctx.fillStyle = '#7dffd9'; ctx.font = `500 17px ${FONT}`; ctx.fillText('crt.tito.cafe · 图片只在浏览器里处理', 18, 76 + rise * 1.4);
  ctx.restore();
}

// Odometer roll between two strings inside a clip box: old slides up and out, new slides in from below.
function roll(prev, next, e, x, y, h) {
  ctx.save();
  if (prev != null && e < 1) { ctx.globalAlpha *= 1 - e; ctx.fillText(prev, x, y - e * h); }
  ctx.restore(); ctx.save();
  ctx.globalAlpha *= prev == null ? 1 : e; ctx.fillText(next, x, y + (1 - e) * h);
  ctx.restore();
}
function drawPill(t) {
  let i = 0; labelEvents.forEach((ev, j) => { if (t >= ev.t) i = j; });
  const cur = labelEvents[i], prev = labelEvents[i - 1];
  const e = prev ? out3(seg(t, cur.t, cur.t + .22)) : 1;
  const w = lerp(prev ? prev.w : cur.w, cur.w, e) + 30, h = 40;
  const x = 18, y = H / K - 18 - h - panelShown(t) * (L.ph + 12);
  ctx.save();
  ctx.fillStyle = 'rgba(6,11,15,.72)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.clip();
  ctx.fillStyle = '#eafff8'; ctx.font = `600 19px ${FONT}`; ctx.textBaseline = 'middle';
  roll(prev && e < 1 ? prev.text : null, cur.text, e, x + 15, y + h / 2 + 1, 26);
  ctx.restore();
}
function drawPanel(t) {
  const shown = panelShown(t);
  if (shown <= 0) return;
  ctx.save();
  ctx.translate(0, (1 - shown) * (L.ph + 40));
  const { px, py, pw, ph } = L;
  ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = 'rgba(252,252,245,.96)'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 16); ctx.fill();
  ctx.shadowColor = 'transparent';
  const sel = selectedAt(t), selE = out3(seg(t, SEL[sel].t, SEL[sel].t + .18));
  ctx.font = `13px ${FONT}`; ctx.textBaseline = 'middle';
  for (const c of L.chips) {
    const on = (c.key === SEL[sel].key ? selE : 0) + (sel && c.key === SEL[sel - 1].key ? 1 - selE : 0);
    const y = py + L.chipY;
    ctx.beginPath(); ctx.roundRect(c.x, y, c.w, L.chipH, L.chipH / 2);
    ctx.fillStyle = mix('#eef2e6', C.ink, on); ctx.fill();
    ctx.strokeStyle = mix('#b9c6b1', C.ink, on); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = mix(C.text, C.cream, on); ctx.fillText(c.label, c.x + 11, y + L.chipH / 2 + 1);
    // Accent dot appears as soon as that value starts to move, like the real app's "changed" mark.
    const di = DRAGS.findIndex(d => d.key === c.key);
    const dot = di < 0 ? 0 : out3(seg(t, dragWin(di)[0], dragWin(di)[0] + .2));
    if (dot > 0) { ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(c.x + c.w - 6, y + 6, 3 * dot, 0, Math.PI * 2); ctx.fill(); }
  }
  drawSlider(t, sel, selE);
  ctx.restore();
}

function dragPress(t) {
  let p = 0;
  DRAGS.forEach((_, i) => { const [a, b] = dragWin(i); p = Math.max(p, out3(seg(t, a - .1, a)) * (1 - out3(seg(t, b, b + .12)))); });
  return p;
}
function tapPress(t) {
  let p = 0;
  DRAGS.forEach((_, i) => { const a = tapAt(i); p = Math.max(p, out3(seg(t, a - .08, a)) * (1 - out3(seg(t, a + .02, a + .14)))); });
  return p;
}
function drawSlider(t, sel, selE) {
  const key = SEL[sel].key, prevKey = sel ? SEL[sel - 1].key : null;
  const glide = inOut(seg(t, SEL[sel].t, SEL[sel].t + .32));
  const f = prevKey ? lerp(frac(prevKey, valueAt(prevKey, t)), frac(key, valueAt(key, t)), glide) : frac(key, valueAt(key, t));
  const label = k => CONTROLS.find(c => c.key === k).label;
  const { px, py, pw } = L, hy = py + L.headY;
  ctx.save();
  ctx.beginPath(); ctx.rect(px + 12, hy - 11, pw - 24, 22); ctx.clip();
  ctx.font = `13px ${FONT}`; ctx.fillStyle = C.text; ctx.textAlign = 'left';
  roll(prevKey && selE < 1 ? label(prevKey) : null, label(key), selE, px + 18, hy, 18);
  ctx.font = `12px ${MONO}`; ctx.fillStyle = C.faint; ctx.textAlign = 'right';
  roll(prevKey && selE < 1 ? String(Math.round(valueAt(prevKey, t))) : null, String(Math.round(valueAt(key, t))), selE, px + pw - 18, hy, 18);
  ctx.restore();
  const ty = py + L.trackY, x = L.trackX + L.trackW * f;
  ctx.fillStyle = C.track; ctx.beginPath(); ctx.roundRect(L.trackX, ty - 2, L.trackW, 4, 2); ctx.fill();
  ctx.fillStyle = C.fill; ctx.beginPath(); ctx.roundRect(L.trackX, ty - 2, Math.max(4, x - L.trackX), 4, 2); ctx.fill();
  const p = dragPress(t), r = 8 * (1 + .18 * p);
  if (p > 0) { ctx.fillStyle = `rgba(207,98,69,${.18 * p})`; ctx.beginPath(); ctx.arc(x, ty, r + 9 * p, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = mix(C.sage, C.accent, p); ctx.beginPath(); ctx.arc(x, ty, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.cream; ctx.lineWidth = 2; ctx.stroke();
}
function drawCursor(t) {
  const a = inOut(seg(t, T.panelIn[0] + .1, T.panelIn[1] + .1)) * (1 - inOut(seg(t, T.panelOut[0] + .15, T.panelOut[1])));
  if (a <= 0) return;
  const c = cursorAt(t), press = Math.max(dragPress(t), tapPress(t));
  ctx.save(); ctx.globalAlpha = a;
  DRAGS.forEach((_, i) => {
    const u = seg(t, tapAt(i), tapAt(i) + .4);
    if (u > 0 && u < 1) { ctx.strokeStyle = `rgba(255,255,255,${.8 * (1 - u)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, 14 + 22 * out3(u), 0, Math.PI * 2); ctx.stroke(); }
  });
  const r = 17 * (1 - .16 * press);
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
  ctx.fillStyle = `rgba(255,255,255,${.55 + .2 * press})`; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(38,60,67,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

export async function setup(src) {
  const img = new Image(); img.src = src; await img.decode();
  W = img.naturalWidth; H = img.naturalHeight; K = Math.min(W / 540, H / 720);
  base = document.createElement('canvas'); base.width = W; base.height = H;
  const b = base.getContext('2d'); b.fillStyle = '#060b0f'; b.fillRect(0, 0, W, H); b.drawImage(img, 0, 0);
  gl = document.createElement('canvas'); renderer = new CRTRenderer(gl); renderer.setSource(base);
  out = document.createElement('canvas'); out.width = W; out.height = H; ctx = out.getContext('2d');
  ctx.setTransform(K, 0, 0, K, 0, 0); layout();
  return { width: W, height: H, duration: DURATION };
}
export function frame(t) {
  drawPicture(t);
  drawBrand(t); drawPill(t); drawPanel(t); drawCursor(t);
  return out.toDataURL('image/png').split(',')[1];
}
// One picture split into four quarters: 原图 / 漫画网点 / 录像带 / 街机时刻.
export function quad() {
  const looks = [ORIG, COMIC, VHS, ARCADE].map(l => ({ label: l.label, canvas: layer(l) }));
  const cx = Math.round(W / 2), cy = Math.round(H / 2);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const q = c.getContext('2d');
  const cells = [[0, 0, cx, cy], [cx, 0, W - cx, cy], [0, cy, cx, H - cy], [cx, cy, W - cx, H - cy]];
  cells.forEach(([x, y, w, h], i) => q.drawImage(looks[i].canvas, x, y, w, h, x, y, w, h));
  q.fillStyle = 'rgba(255,255,255,.92)'; q.fillRect(cx - K, 0, 3 * K, H); q.fillRect(0, cy - K, W, 3 * K);
  q.font = `600 ${20 * K}px ${FONT}`; q.textBaseline = 'middle';
  cells.forEach(([x, y, w, h], i) => {
    const tw = q.measureText(looks[i].label).width, bw = tw + 24 * K, bh = 38 * K;
    const lx = x === 0 ? x + 14 * K : x + w - bw - 14 * K, ly = y === 0 ? y + 14 * K : y + h - bh - 14 * K;
    q.fillStyle = 'rgba(6,11,15,.74)'; q.beginPath(); q.roundRect(lx, ly, bw, bh, bh / 2); q.fill();
    q.fillStyle = '#eafff8'; q.fillText(looks[i].label, lx + 12 * K, ly + bh / 2 + K);
  });
  return c.toDataURL('image/png').split(',')[1];
}
