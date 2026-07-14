---
name: eleventy-build
summary: The site is built with Eleventy (@11ty/eleventy), an ordinary npm devDependency, not a separately-provisioned system tool; site/ is a project tree kept separate from src/; how dist/index.html itself is generated.
---

## Eleventy is an ordinary npm devDependency, not a system tool

`@11ty/eleventy` is installed like every other devDependency (`typescript`, `vitest`, `@playwright/test`) — a `package.json` version range plus a `package-lock.json` resolved integrity hash, provisioned by the existing `npm ci` step. There is no separate install script, no pinned/checksum-verified binary download, no repo-local staging directory, and no per-environment provisioning concern to reason about: local dev, the bare `deploy` runner, and the pinned Playwright container (`visual-test-podman.sh`, `.github/workflows/ci.yml`) all get Eleventy the exact same way they already get every other build tool. As a direct consequence, `deploy.sh`, `visual-test.sh`, `visual-test-podman.sh`, and `.github/workflows/ci.yml` needed **zero changes** to pick up the Eleventy-based build — `npm ci` already covers it.

This is why `decisions/shell-script-parsing.md` doesn't apply here either: there's no new install script for Eleventy to write in the first place, so there was never a choice between `jq`/`yq`-based shell logic and reaching for Python.

## `site/` is a separate project tree from `src/`

Eleventy's input directory is `site/` (`site/_includes/base.njk`, `site/index.njk`, `site/css/main.css`), configured via `eleventy.config.js` at the repo root — Eleventy's default config discovery location, kept outside `site/` the same way `tsconfig.json` sits at the repo root rather than inside `src/`. `site/` is disjoint from `tsconfig.json`'s `rootDir: src`, so there's no file-discovery overlap between the two build tools: tsc only ever sees `.ts` files under `src/`, and Eleventy only ever sees templates/assets under `site/`. Both tools write into the same `dist/` (tsc's `outDir`, Eleventy's `dir.output`), since `package.json`'s `build`/`postbuild` scripts run `tsc` then `npx eleventy` in sequence — their output filenames are disjoint (`app.js`/`*.js` from tsc vs. `index.html`/`css/main.css` from Eleventy), so combining them into one `dist/` this way doesn't clobber either tool's output, provided neither step is given a destination-clearing option.

Eleventy's Nunjucks environment autoescapes by default, unlike a plain string-interpolation copy: `site/_includes/base.njk`'s `{{ content }}` needs the `safe` filter (`{{ content | safe }}`) to render `site/index.njk`'s raw HTML body unescaped, rather than as HTML-entity-escaped text. `.njk` templates were chosen for page content over Eleventy's Markdown-with-front-matter path specifically because today's page is hand-built markup, not prose — Markdown-with-front-matter would introduce an unsafe-rendering opt-in this content doesn't need, where `.njk` passes raw HTML straight through untouched.

## `dist/index.html` is generated from a shared base layout, not hand-copied

`dist/index.html` is produced by Eleventy from `site/_includes/base.njk` (the shared `<html>`/`<head>` shell, common to every page using that layout) plus `site/index.njk` (today's one page's front matter + body), with `postbuild` running `npx eleventy`. There's no checked-in HTML file that already has the right output-relative paths baked in to just copy verbatim; generating the page from a shared layout is the templating system's actual job, and it's what lets more pages reuse `base.njk` (and anything else added to it, like the site-wide footer) without duplicating markup per page.
