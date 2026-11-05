// Renders a promo animation and a four-way comparison from one image using the real engine.js.
// Usage: node tool/make-demo.mjs <image> [outDir]
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const input = path.resolve(process.argv[2] || 'demo/src/source.png');
const out = path.resolve(process.argv[3] || 'demo/out');
const framesDir = path.join(out, 'frames');
await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });

const STAGES = [
  { key: null, label: '原图' },
  { key: 'comic', label: '漫画网点' },
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
    r.render(PRESETS[s.key], w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(gl, 0, 0); return c;
  });
  r.dispose();
  window.out = document.createElement('canvas'); out.width = w; out.height = h;
  return { w, h };
}, STAGES);
console.log('source', size);
