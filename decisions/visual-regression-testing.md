---
name: visual-regression-testing
summary: Why CI and local baseline regeneration both pin the exact same mcr.microsoft.com/playwright:vX.Y.Z-noble image (Podman locally, Docker container in CI); Chromium-only scoping; a separate `visual` CI job/container instead of folding into `test`; explicit viewport/deviceScaleFactor pinning instead of devices['Desktop Chrome'].
---

`e2e/visual.spec.ts` screenshots the built `dist/` site and compares it against a committed baseline PNG, plus a committed accessibility-tree (`.aria.yml`) snapshot. Several of the setup choices here are easy to second-guess or quietly undo, so they're recorded here.

## 1. CI and local baseline regeneration both run inside the exact same pinned `mcr.microsoft.com/playwright:vX.Y.Z-noble` image

The page's CSS uses `font: 15px/1.6 system-ui, sans-serif` (`src/index.html`) — there's no `@font-face`, so the rendered glyphs depend entirely on whatever font packages happen to be installed on the machine taking the screenshot. `ubuntu-latest` and the Playwright image are *not* guaranteed to have the same font set, even both being Ubuntu-based, since `ubuntu-latest`'s image is maintained independently of Playwright's. If CI screenshotted on bare `ubuntu-latest` (via `playwright install --with-deps`) while a contributor regenerated a baseline locally in some other environment, the two could render `system-ui` differently and produce a spurious full-page diff with no code change behind it — the exact failure mode this tooling exists to prevent.

Pinning both sides to the *same tagged* image removes that variable: whoever generates the baseline and whatever regenerates it in CI are byte-for-byte the same OS/font/Mesa/browser build. This also happens to be exactly the environment a future WebGL regression test would want (the image already bundles Mesa/SwiftShader software rendering), so it's not a decision that forecloses that reuse — it's a prerequisite for it.

Playwright's own docs are explicit that the image tag's Playwright version must match the installed `@playwright/test` version exactly, or the container's bundled browser executables won't be found — so the tag reference in `.github/workflows/ci.yml` and `visual-test-podman.sh`'s `PLAYWRIGHT_IMAGE` have to be kept in lockstep with `package.json` by hand whenever Playwright is upgraded. Both locations carry an inline comment saying so.

### Podman, not Docker, for local runs

`visual-test-podman.sh` shells out to `podman run`, not `docker run`: Podman is what's on the dev machine — daemonless, rootless by default, no separate desktop app or licensing terms. Since CI and local runs are already pinned to the same tagged OCI image specifically so both sides render identically, swapping the local *client* from Docker to Podman doesn't weaken that guarantee — same image, same tag, just a different (Docker-API-compatible) tool running it. CI's own `container:` step in `ci.yml` is unaffected either way; GitHub Actions manages that itself, not Podman.

### `visual-test-podman.sh`: one shared Podman wrapper, two thin callers

`visual-test.sh` itself doesn't wrap anything in Docker/Podman — it just runs `npm ci && npm run build && npm run test:visual` directly, because CI's `visual` job already supplies the pinned container via `ci.yml`'s `container:` job option before `visual-test.sh` ever runs. Running that same bare sequence directly on a contributor's host, though, hits the same font/Chromium-build mismatch problem: whatever's just been asked of it (verifying against the committed baselines, or regenerating them) needs the same pinned image and the same `--userns=keep-id` handling. Those two asks — `visual-test-local.sh` (verify, `test:visual`) and `visual-test-update.sh` (regenerate, `test:visual:update`) — differ only in which npm script to run, so that Podman invocation lives once in `visual-test-podman.sh`, taking the npm script name as its one argument; both callers are a one-line `exec` into it. A contributor gets a reliable local pass/fail (or baseline regeneration) without needing a container-savvy `visual-test.sh` invocation, and without CI's own container step ever nesting a second one — none of these three scripts are invoked by CI itself, only by a contributor working on the bare host.

### Non-root inside the container, both locally and in CI

Chromium's sandbox refuses to run as root, and the sandbox is worth keeping rather than routing around it with `--no-sandbox`. In CI, the `visual` job's container `options: --user pwuser` selects the non-root account the Playwright image ships specifically for this. Locally, `visual-test-podman.sh` uses `podman run --userns=keep-id` without an explicit `--user` override — Podman's `keep-id` mode maps the *invoking host user's* UID/GID into the container 1:1 and, absent an explicit `--user`, runs the container process as that mapped (non-root) user by default. That serves two purposes at once: it's non-root (satisfying the sandbox), and — the second, independent reason `--userns=keep-id` is required — a baseline PNG written back through the bind mount comes back owned by the host user instead of an unexpected remapped UID (Podman's rootless UID remapping otherwise applies to anything a container process writes into a bind mount).

## 2. Chromium-only, no Firefox/WebKit projects

Screenshot-snapshot suites multiply baseline count and maintenance burden per browser/platform combination for comparatively little payoff here — the page is plain HTML/CSS with no browser-specific rendering paths being tested. `playwright.config.ts` defines a single `chromium` project; adding a second/third browser project later is a config-only change if it's ever justified, but isn't default behavior.

## 3. A separate `visual` CI job/container, not folded into `test`

`test` (vitest, `src/` only) runs on the bare `ubuntu-latest` runner via `actions/setup-node`, no Docker container needed. `visual` needs the pinned Playwright container specifically. Rather than run the whole `test` job inside that container (slower `npm ci`/Node setup churn for unit tests that don't need it, and a container image pin that unit tests shouldn't depend on), `visual` is its own job, gating `deploy` alongside `test` (`needs: [test, visual]`) — same `needs:`-job-dependency-graph pattern `decisions/deploy-pipeline.md` already established for `deploy` itself, rather than a second workflow file.

## 4. Explicit `viewport`/`deviceScaleFactor` instead of spreading `devices['Desktop Chrome']`

`playwright.config.ts`'s `chromium` project pins `viewport: { width: 1280, height: 800 }` and `deviceScaleFactor: 1` directly, rather than `...devices['Desktop Chrome']`. That descriptor (viewport, UA, deviceScaleFactor) is versioned inside Playwright itself and can shift slightly across `@playwright/test` upgrades — which would silently invalidate every baseline on a routine `npm update` with zero app changes. Pinning the specific properties this project actually cares about avoids that.

## 5. An accessibility-tree snapshot alongside the pixel screenshot

`e2e/visual.spec.ts` asserts `expect(page).toMatchAriaSnapshot(...)` before `toHaveScreenshot(...)`, committing a second baseline (`converter-page.aria.yml`) next to the PNG. The accessibility tree is resilient to font-rendering/anti-aliasing noise that can still produce a handful of differing pixels even inside the pinned image (e.g. subpixel hinting differences across otherwise-identical runs), so it catches structural/semantic regressions — a heading losing its role, a button's accessible name changing — independently of pixel-level drift, and is generally the more stable, more diagnostic of the two signals when both are available.

## 6. `e2e/serve.mjs` sanitizes paths via `resolve()`, not manual `..`-stripping

The dependency-free static file server backing `webServer` in `playwright.config.ts` resolves the requested path against `dist/`'s root with `path.resolve()` and then checks the result is still prefixed by that root, rather than trying to detect/strip `../` segments itself. `resolve()` already collapses `.`/`..` the same way the filesystem would, so there's no encoding or segment-splitting edge case (e.g. `%2e%2e`, backslashes, mixed separators) left to individually account for — the check is "is the final resolved path still inside the root" rather than "does the input look suspicious."
