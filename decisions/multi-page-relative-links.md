---
name: multi-page-relative-links
summary: Why asset/nav links use a page-depth-computing Eleventy filter (fromRoot) instead of root-absolute paths or hand-set front matter, and why e2e/serve.mjs's directory-index fallback was generalized to any trailing-slash request.
---

## `fromRoot`: a depth-aware relative-link filter, not root-absolute paths

Commit `377e5cb` ("Make stylesheet link relative in base.njk") deliberately made `site/_includes/base.njk`'s stylesheet link relative (`css/main.css`), not root-absolute (`/css/main.css`), because `deploy.sh`'s `DEPLOY_TARGET_PATH` isn't guaranteed to be the server's document root (see `deploy.md`) — a root-absolute link would 404 under a subpath deploy. That constraint held trivially while there was exactly one page at the site root.

Adding a landing page at `/` plus a converter page at `/jk3-to-jk2/` broke that: a single hardcoded relative string (`css/main.css`) can't resolve correctly from both depths at once. `eleventy.config.js` registers a `fromRoot` filter backed by the plain function in `site/_lib/fromRoot.js`:

```js
export function fromRoot(target, pageUrl) {
  const depth = pageUrl.split("/").filter(Boolean).length;
  return depth === 0 ? target : "../".repeat(depth) + target;
}
```

It lives under `site/_lib/` (underscore-prefixed, so Eleventy ignores it as a page source, the same as `_includes`/`_data`) rather than inline in `eleventy.config.js`, specifically so it has a plain colocated unit test (`site/_lib/fromRoot.test.ts`) instead of only being covered indirectly through the visual-regression suite. The test file is `.ts` (a table-driven `it.each` over a typed `testCases` array) even though `fromRoot.js` itself stays plain JS — vitest runs `.ts` test files directly without needing `tsconfig.json`'s `rootDir: src` to include them, the same way `src/**/*.test.ts` is excluded from `tsc`'s build but still runs under vitest. `npm test`'s `vitest run src site` was widened from `src`-only to pick this up — `site/` still isn't part of `tsconfig.json`'s `rootDir` (see `decisions/eleventy-build.md`), this only concerns which directories vitest scans for test files, not tsc/Eleventy's file discovery.

`base.njk` uses the filter for both the stylesheet link (`{{ 'css/main.css' | fromRoot(page.url) }}`) and the shared nav's home link (`{{ '.' | fromRoot(page.url) }}`), so both resolve correctly regardless of a page's directory depth, without ever going root-absolute — preserving subpath-deploy safety while supporting more than one page depth.

`src/jk3-to-jk2/app.ts` doesn't need this treatment: it was moved into its own `src/jk3-to-jk2/` subfolder to mirror `dist/jk3-to-jk2/`, so `tsc` emits `dist/jk3-to-jk2/app.js` right alongside `dist/jk3-to-jk2/index.html`, and the page's `<script src="app.js">` stays a plain same-directory relative reference — no filter needed. Only assets whose location doesn't already mirror the referencing page's directory (the shared stylesheet, the shared nav) need `fromRoot`.

An alternative considered: an explicit `root: ".."` front-matter field set by hand on each page. Rejected because it's a value a page author has to remember to set correctly per page depth, where nothing catches a wrong value except a broken link at runtime — the filter derives it automatically from `page.url`, which Eleventy already guarantees is correct. (Verified empirically against the installed Eleventy 3.1.6: `page.url` is available inside `_includes/base.njk`, not just the page template itself, and returns the expected relative prefix at both `/` and `/jk3-to-jk2/`.)

## `e2e/serve.mjs`: directory-index fallback generalized to any trailing slash

The dev server backing the Playwright suite resolves any trailing-slash request path to that directory's `index.html` (`requestPath.endsWith('/')`), rather than special-casing the literal root, so `/jk3-to-jk2/` resolves the same way `/` does — matching how a real production static-file server (nginx/Apache/Caddy default config) serves subdirectories. This keeps `resolve()` + prefix-check as the only path-safety mechanism (`decisions/visual-regression-testing.md` point 6) — no new traversal surface introduced.
