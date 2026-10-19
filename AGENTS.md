# Project guidance

This is CRT Image Studio, a standalone static image-effects website.

- Read `README.md` before changing behavior. Keep all work inside this repository; do not change TitoDex App or Launcher checkouts.
- Preserve browser-local processing. Do not add image uploads, analytics, external fonts, remote assets, or accounts without explicit user approval.
- Preserve the site's `Cache-Control: no-transform` header: it keeps Cloudflare from automatically injecting analytics scripts without altering settings for other tito.cafe sites.
- Keep preview and PNG export on the same shader and settings model in `engine.js`. Comparison must never affect exported pixels.
- Keep all application resource URLs relative so GitHub Pages project paths work.
- Preserve aspect ratio, avoid upscaling, bound GPU output size, and release temporary object URLs and export contexts.
- Keep the interface in Simplified Chinese and commit messages in English.
- Validate effect/import/export changes with `npm test` using installed Chrome. Inspect desktop and mobile screenshots for visual changes. Do not claim physical-device coverage from viewport tests.
- Production is Cloudflare Workers Static Assets at `https://crt.tito.cafe/`. Run `npm run deploy` only when the user has authorized publication. Keep the exact custom-domain binding; never add apex or wildcard routes or change other tito.cafe services.
- `tool/build-site.mjs` copies an explicit allowlist to `dist/`. Do not publish the repository root. GitHub Pages serves only the redirect in `docs/`.
- The static runtime has no npm dependencies. Playwright and Wrangler are development-only dependencies.
