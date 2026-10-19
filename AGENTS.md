# Project guidance

This is CRT Image Studio, a standalone static image-effects website.

- Read `README.md` before changing behavior. Keep all work inside this repository; do not change TitoDex App or Launcher checkouts.
- Preserve browser-local processing. Do not add image uploads, analytics, external fonts, remote assets, or accounts without explicit user approval.
- Keep preview and PNG export on the same shader and settings model in `engine.js`. Comparison must never affect exported pixels.
- Keep all application resource URLs relative so GitHub Pages project paths work.
- Preserve aspect ratio, avoid upscaling, bound GPU output size, and release temporary object URLs and export contexts.
- Keep the interface in Simplified Chinese and commit messages in English.
- Validate effect/import/export changes with `npm test` using installed Chrome. Inspect desktop and mobile screenshots for visual changes. Do not claim physical-device coverage from viewport tests.
- GitHub Pages publishes `main` at the root. Only publish when the user has authorized it; keep unrelated work intact.
- The static runtime has no npm dependencies. Playwright is a development-only dependency.
