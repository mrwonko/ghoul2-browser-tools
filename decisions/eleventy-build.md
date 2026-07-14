---
name: eleventy-build
summary: The site is built with Eleventy (@11ty/eleventy), an ordinary npm devDependency, not a separately-provisioned system tool; site/ is a project tree kept separate from src/; supersedes point 1 of decisions/deploy-pipeline.md.
---

## Eleventy is an ordinary npm devDependency, not a system tool

`@11ty/eleventy` is installed like every other devDependency (`typescript`, `vitest`, `@playwright/test`) — a `package.json` version range plus a `package-lock.json` resolved integrity hash, provisioned by the existing `npm ci` step. There is no separate install script, no pinned/checksum-verified binary download, no repo-local staging directory, and no per-environment provisioning concern to reason about: local dev, the bare `deploy` runner, and the pinned Playwright container (`visual-test-podman.sh`, `.github/workflows/ci.yml`) all get Eleventy the exact same way they already get every other build tool. As a direct consequence, `deploy.sh`, `visual-test.sh`, `visual-test-podman.sh`, and `.github/workflows/ci.yml` needed **zero changes** to pick up the Eleventy-based build — `npm ci` already covers it.

This is why `decisions/shell-script-parsing.md` doesn't apply here either: there's no new install script for Eleventy to write in the first place, so there was never a choice between `jq`/`yq`-based shell logic and reaching for Python.

## `site/` is a separate project tree from `src/`

Eleventy's input directory is `site/` (`site/_includes/base.njk`, `site/index.njk`, `site/css/main.css`), configured via `eleventy.config.js` at the repo root — Eleventy's default config discovery location, kept outside `site/` the same way `tsconfig.json` sits at the repo root rather than inside `src/`. `site/` is disjoint from `tsconfig.json`'s `rootDir: src`, so there's no file-discovery overlap between the two build tools: tsc only ever sees `.ts` files under `src/`, and Eleventy only ever sees templates/assets under `site/`. Both tools write into the same `dist/` (tsc's `outDir`, Eleventy's `dir.output`), since `package.json`'s `build`/`postbuild` scripts run `tsc` then `npx eleventy` in sequence — their output filenames are disjoint (`app.js`/`*.js` from tsc vs. `index.html`/`css/main.css` from Eleventy), so combining them into one `dist/` this way doesn't clobber either tool's output, provided neither step is given a destination-clearing option.

Eleventy's Nunjucks environment autoescapes by default, unlike a plain string-interpolation copy: `site/_includes/base.njk`'s `{{ content }}` needs the `safe` filter (`{{ content | safe }}`) to render `site/index.njk`'s raw HTML body unescaped, rather than as HTML-entity-escaped text. `.njk` templates were chosen for page content over Eleventy's Markdown-with-front-matter path specifically because today's page is hand-built markup, not prose — Markdown-with-front-matter would introduce an unsafe-rendering opt-in this content doesn't need, where `.njk` passes raw HTML straight through untouched.

## Supersedes point 1 of `decisions/deploy-pipeline.md`

Point 1 of `decisions/deploy-pipeline.md` recorded why `index.html` used to live in `src/`, edited by hand next to `app.ts`, with a `postbuild` step that was a plain verbatim copy (`cp src/index.html dist/index.html`) rather than a generating/rewriting script — because there was nothing left to rewrite once the checked-in file already had the right relative `src=` path. That reasoning predates any templating system and doesn't transfer here: generating `dist/index.html` from a shared base layout (`site/_includes/base.njk` + `site/index.njk`) is the templating system's actual job, not a workaround for a self-inflicted path mismatch. `src/index.html` has been deleted; the page content now lives in `site/index.njk`, and the `<head>` shell lives in `site/_includes/base.njk`, with `postbuild` running `npx eleventy` instead of `cp`.
