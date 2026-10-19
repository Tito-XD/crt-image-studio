import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Publish only browser assets, never source tooling or local configuration.
for (const path of ['index.html', 'style.css', 'app.js', 'engine.js', 'assets', '_headers']) {
  await cp(resolve(root, path), resolve(output, path), { recursive: true });
}
console.log('Prepared static site in dist/');
