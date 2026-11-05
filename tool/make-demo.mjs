// Renders a looping promo clip and a four-way comparison from one image with the real engine.js.
// The animation itself lives in tool/demo-page.js. Usage: node tool/make-demo.mjs <image> [outDir]
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = path.resolve(process.argv[2] || 'demo/src/source.png');
const out = path.resolve(process.argv[3] || 'demo/out');
const framesDir = path.join(out, 'frames');
const FPS = 30;
await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.error('[page error]', e.message));
  await page.route('http://demo.local/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1);
    if (!name) return route.fulfill({ body: '<!doctype html><meta charset="utf-8">', contentType: 'text/html' });
    const file = name === 'source' ? input : path.join(root, name);
    return route.fulfill({ body: await readFile(file), contentType: file.endsWith('.js') ? 'text/javascript' : 'image/png' });
  });
  await page.goto('http://demo.local/');
  const info = await page.evaluate(async () => { window.demo = await import('/tool/demo-page.js'); return demo.setup('/source'); });
  const count = Math.round(info.duration * FPS);
  console.log(`source ${info.width}x${info.height}, ${count} frames, ${info.duration.toFixed(2)}s`);
  for (let i = 0; i < count; i++) {
    const b64 = await page.evaluate(t => demo.frame(t), i / FPS);
    await writeFile(path.join(framesDir, `f${String(i).padStart(4, '0')}.png`), Buffer.from(b64, 'base64'));
  }
  await writeFile(path.join(out, 'crt-demo-quad.png'), Buffer.from(await page.evaluate(() => demo.quad()), 'base64'));
} finally {
  await browser.close();
}

const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const seq = path.join(framesDir, 'f%04d.png');
ff(['-framerate', String(FPS), '-i', seq, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', path.join(out, 'crt-demo.mp4')]);
ff(['-framerate', String(FPS), '-i', seq, '-vf', 'fps=20,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle', '-loop', '0', path.join(out, 'crt-demo.gif')]);
await rm(framesDir, { recursive: true, force: true });
console.log('wrote', out);
