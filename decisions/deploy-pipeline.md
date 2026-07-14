---
name: deploy-pipeline
summary: How the site gets deployed: self-contained dist/ via index.html living in src/ next to app.ts, single-workflow needs:test gating instead of a second workflow, and a write-only rrsync-restricted deploy key.
---

Deploying the static site (built `dist/` output) to a real server involved three non-obvious calls that later contributors could easily second-guess or redo differently:

## 1. `index.html` lives in `src/`, edited by hand, not generated at build time

`index.html` needs a different `<script src>` depending on where it sits relative to the compiled `app.js`: the repo previously kept it at the repo root, referencing `dist/app.js`, which only worked for the "build then open the root file" local-dev flow — it wasn't deployable as-is, since a server serving `dist/` wouldn't have a sibling `dist/` inside itself.

Rather than generating a rewritten copy at build time (a `postbuild` script that patches the `src` attribute), `index.html` was moved into `src/`, sitting directly next to `app.ts`, and its script tag was edited once, directly, to `src="app.js"` (same-directory reference). This mirrors how `tsc` already maps `rootDir: src` to `outDir: dist` for every `.ts` file — a plain, verbatim copy step (`postbuild`: `cp src/index.html dist/index.html`) is enough to place it correctly in `dist/`, no content rewriting required. This was chosen over a copy-and-rewrite script because there's nothing left to rewrite once the checked-in source file already has the right relative path; a transform script would only exist to fix a self-inflicted mismatch.

Local dev now means: `npm run build`, then open `dist/index.html` (which now exactly mirrors what gets deployed), rather than opening a root-level file.

## 2. Deploy is a second job in the existing `ci.yml`, gated by `needs`, not a separate workflow

A `deploy` job was added to the same `ci.yml` workflow rather than a second `workflow_run`-triggered workflow file. `needs:` directly expresses "only after [these jobs] pass" via the job dependency graph, reuses the `test` job's checkout/setup-node steps as a pattern, and avoids the extra complexity of a separate workflow needing its own checkout-of-the-right-SHA and secrets wiring. `if: github.ref == 'refs/heads/main'` on the `deploy` job (not just the trigger's `branches: [main]` filter) exists specifically to stop `workflow_dispatch` from being able to deploy an arbitrary manually-selected branch/tag.

`deploy` originally gated on `needs: test` alone; once the `visual` job (Playwright screenshot-snapshot regression suite — see `decisions/visual-regression-testing.md`) was added, `deploy` was changed to `needs: [test, visual]`, on the same reasoning: deploying a build that fails either check is exactly the failure mode `needs:` exists to prevent, and `visual`'s own container needs `needs: test` too so a broken unit-test run doesn't burn a full container pull/build/browser-launch on a PR that's already going to be rejected.

`deploy.sh` calls `ci.sh --skip-tests` rather than duplicating `npm ci` itself: the `deploy` job's tests already passed in the `test` job it `needs`, so `ci.sh` grew a `--skip-tests` flag (install dependencies, skip `npm test`) instead of `deploy.sh` reimplementing dependency setup on its own.

A `concurrency: { group: production-deploy, cancel-in-progress: true }` on the `deploy` job prevents two rapid pushes to `main` from racing — without it, two overlapping `test`→`deploy` chains could finish out of order and leave the live site mirroring an older commit than the newest push.

## 3. The server-side deploy key is scoped via `rrsync -wo DIR`, not a broader grant

The `authorized_keys` entry for the CI-held private key restricts it (via `command="rrsync -wo <dir>"` plus `restrict`) to write-only rsync into one dedicated directory, rather than an unrestricted shell command or a read-write grant. `-wo` means a leaked key can overwrite the deployed site but can never read anything back over that connection; the client can never escape above that directory, so the boundary can't be widened from the CI side even if `deploy.sh`/secrets were compromised. This is why `deploy.md` calls out that the target directory must be used for nothing else — `rsync --delete` treats anything else placed there as drift to be removed.

`rrsync` doesn't ignore the client-sent destination path within that boundary, though — it `chdir`s into `DIR`, then resolves the client's path *relative to* `DIR` (stripping a leading `/`). `DEPLOY_TARGET_PATH` therefore has to be set relative to `DIR` (`.` to land directly in it), not repeated as the same absolute path as `DIR` — that mismatch was hit in practice: it made rsync try to create `DIR/<DEPLOY_TARGET_PATH>` as a nested subdirectory that didn't exist, failing with `mkdir "..." failed: No such file or directory`.
