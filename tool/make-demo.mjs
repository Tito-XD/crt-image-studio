// Renders a promo animation and a four-way comparison from one image using the real engine.js.
// Usage: node tool/make-demo.mjs <image> [outDir]
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = path.resolve(process.argv[2] || 'demo/src/source.png');
const out = path.resolve(process.argv[3] || 'demo/out');
const framesDir = path.join(out, 'frames');
await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });

const STAGES = [
  { key: null, label: '原图' },
  { key: 'comic', label: '漫画网点', tweak: { lines: 320, halftone: 80, saturation: 120 } },
  { key: 'vhs', label: '录像带' },
  { key: 'arcade', label: '街机时刻' },
  { key: null, label: '原图' },
];
const FPS = 30;

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png' };
await page.route('http://demo.local/**', async route => {
  const name = new URL(route.request().url()).pathname.slice(1);
  const file = name === 'source' ? input : path.join(root, name);
  route.fulfill({ body: await readFile(file), contentType: types[path.extname(file)] || 'image/png' });
});
await page.route('http://demo.local/', route => route.fulfill({ body: '<!doctype html><meta charset="utf-8">', contentType: 'text/html' }));
await page.goto('http://demo.local/');
page.on('console', m => console.log('[page]', m.text()));

// Render every stage once at the image's own size; frames are composited from these.
const size = await page.evaluate(async (stages) => {
  const { CRTRenderer, PRESETS } = await import('/engine.js');
  const img = new Image(); img.src = '/source'; await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const base = document.createElement('canvas'); base.width = w; base.height = h;
  const bctx = base.getContext('2d'); bctx.fillStyle = '#060b0f'; bctx.fillRect(0, 0, w, h); bctx.drawImage(img, 0, 0);
  const gl = document.createElement('canvas'); const r = new CRTRenderer(gl); r.setSource(base);
  window.layers = stages.map(s => {
    if (!s.key) return base;
    r.render({ ...PRESETS[s.key], ...s.tweak }, w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(gl, 0, 0); return c;
  });
  r.dispose();
  window.out = document.createElement('canvas'); out.width = w; out.height = h;
  return { w, h };
}, STAGES);
console.log('source', size);

// Timeline: hold each layer, then sweep the next one down over it like a refreshing tube.
const steps = [];
const hold = (stage, sec, brand = false) => { for (let i = 0; i < sec * FPS; i++) steps.push({ from: stage, to: stage, t: 1, brand }); };
const wipe = (from, to, sec) => { const n = Math.round(sec * FPS); for (let i = 1; i <= n; i++) steps.push({ from, to, t: i / n }); };
hold(0, 1.2, true); wipe(0, 1, 0.7); hold(1, 1.1); wipe(1, 2, 0.7); hold(2, 1.1);
wipe(2, 3, 0.7); hold(3, 1.3); wipe(3, 4, 0.8); hold(4, 1.0, true);

await page.evaluate((stages) => {
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const font = '"Microsoft YaHei UI", "PingFang SC", "Noto Sans SC", sans-serif';
  window.drawFrame = ({ from, to, t, brand }) => {
    const ctx = out.getContext('2d'), w = out.width, h = out.height, L = window.layers;
    const y = Math.round(ease(t) * h);
    ctx.drawImage(L[from], 0, 0);
    if (to !== from && y > 0) {
      ctx.drawImage(L[to], 0, 0, w, y, 0, 0, w, y);
      if (t < 1) {
        const g = ctx.createLinearGradient(0, y - 46, 0, y);
        g.addColorStop(0, 'rgba(120,255,220,0)'); g.addColorStop(1, 'rgba(120,255,220,.35)');
        ctx.fillStyle = g; ctx.fillRect(0, y - 46, w, 46);
        ctx.fillStyle = 'rgba(235,255,250,.95)'; ctx.fillRect(0, y - 2, w, 3);
      }
    }
    const shown = t >= .5 ? to : from, idx = shown === 0 || shown === stages.length - 1 ? 0 : shown;
    const text = idx ? `0${idx} ${stages[shown].label}` : '原图';
    ctx.font = `600 22px ${font}`;
    const tw = ctx.measureText(text).width, px = 18, py = h - 26;
    ctx.fillStyle = 'rgba(6,11,15,.72)'; ctx.beginPath(); ctx.roundRect(px - 2, py - 30, tw + 28, 42, 21); ctx.fill();
    ctx.fillStyle = '#eafff8'; ctx.fillText(text, px + 12, py - 1);
    for (let i = 1; i < stages.length - 1; i++) {
      ctx.fillStyle = i <= idx ? '#7dffd9' : 'rgba(255,255,255,.4)';
      ctx.beginPath(); ctx.roundRect(w - 18 - (stages.length - 1 - i) * 26, 22, 20, 6, 3); ctx.fill();
    }
    if (brand) {
      const g = ctx.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, 'rgba(6,11,15,.9)'); g.addColorStop(.6, 'rgba(6,11,15,.7)'); g.addColorStop(1, 'rgba(6,11,15,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, 150);
      ctx.fillStyle = '#ffffff'; ctx.font = `700 30px ${font}`; ctx.fillText('CRT 显像工坊', 18, 48);
      ctx.fillStyle = '#7dffd9'; ctx.font = `500 17px ${font}`; ctx.fillText('crt.tito.cafe · 图片只在浏览器里处理', 18, 76);
    }
    return out.toDataURL('image/png').split(',')[1];
  };
}, STAGES);

for (let i = 0; i < steps.length; i++) {
  const b64 = await page.evaluate(s => drawFrame(s), steps[i]);
  await writeFile(path.join(framesDir, `f${String(i).padStart(4, '0')}.png`), Buffer.from(b64, 'base64'));
}
console.log('frames', steps.length, `${(steps.length / FPS).toFixed(1)}s`);

// Static comparison: one picture split into four quarters, each quarter a different layer.
const quad = await page.evaluate((stages) => {
  const L = window.layers, w = out.width, h = out.height, cx = Math.round(w / 2), cy = Math.round(h / 2);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  const cells = [[0, 0, 0, cx, cy], [1, cx, 0, w - cx, cy], [2, 0, cy, cx, h - cy], [3, cx, cy, w - cx, h - cy]];
  for (const [i, x, y, cw, ch] of cells) ctx.drawImage(L[i], x, y, cw, ch, x, y, cw, ch);
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(cx - 1, 0, 3, h); ctx.fillRect(0, cy - 1, w, 3);
  ctx.font = '600 20px "Microsoft YaHei UI", "PingFang SC", sans-serif';
  for (const [i, x, y, cw, ch] of cells) {
    const text = stages[i].label, tw = ctx.measureText(text).width;
    const lx = x === 0 ? x + 14 : x + cw - tw - 38, ly = y === 0 ? y + 14 : y + ch - 52;
    ctx.fillStyle = 'rgba(6,11,15,.74)'; ctx.beginPath(); ctx.roundRect(lx, ly, tw + 24, 38, 19); ctx.fill();
    ctx.fillStyle = '#eafff8'; ctx.fillText(text, lx + 12, ly + 26);
  }
  return c.toDataURL('image/png').split(',')[1];
}, STAGES);
await writeFile(path.join(out, 'crt-demo-quad.png'), Buffer.from(quad, 'base64'));
await browser.close();

const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const seq = path.join(framesDir, 'f%04d.png');
ff(['-framerate', String(FPS), '-i', seq, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', path.join(out, 'crt-demo.mp4')]);
ff(['-framerate', String(FPS), '-i', seq, '-vf', 'fps=20,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle', '-loop', '0', path.join(out, 'crt-demo.gif')]);
await rm(framesDir, { recursive: true, force: true });
console.log('wrote', out);
