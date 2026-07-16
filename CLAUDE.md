# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A web-based converter that automatically ports Jedi Knight: Jedi Academy (JK3) player models to Jedi Knight 2: Jedi Outcast (JK2). Runs in-browser with no server. Also includes Node CLI tools for development/verification.

The project is based on JK3 source code and is licensed under **GPLv2**.

## Build and CLI

```sh
npm run build                                         # compile TypeScript → dist/, then Eleventy builds site/ → dist/ (npx eleventy)
npm test                                              # run vitest unit tests (src/ and site/)
node dist/print-cli.js <file.glm>                     # inspect surfaces and bone references
node dist/convert-cli.js <input.glm> <output.glm>    # convert JK3 → JK2
./ci.sh [--skip-tests]                                # npm ci, then npm test unless --skip-tests
./deploy.sh                                            # ci.sh --skip-tests, build, rsync dist/ to the deploy target (CI-only; see deploy.md)
./visual-test.sh                                       # npm ci, build, npm run test:visual (CI-only; runs in the pinned Playwright container — see e2e/)
./visual-test-local.sh                                 # run the visual suite locally against committed baselines via Podman, same pinned image as CI (does not update baselines)
./visual-test-update.sh                                # regenerate e2e/ baseline PNGs/aria snapshots locally via Podman, same pinned image as CI
```

No runtime npm packages — TypeScript, vitest, Playwright (`@playwright/test`), and Eleventy (`@11ty/eleventy`) are the only devDependencies.

`.github/workflows/ci.yml` runs `ci.sh` on every push/PR, then (on `main` only, once `ci.sh` and the `visual` job both succeed) a `deploy` job runs `deploy.sh` to rsync `dist/` to the production server. The `visual` job runs `visual-test.sh` inside the pinned `mcr.microsoft.com/playwright:vX.Y.Z-noble` container image (see `e2e/`) and uploads `playwright-report/` as an artifact on failure. `deploy.md` is the one-time, copy-pasteable server-side setup (SSH keypair, `authorized_keys` `rrsync` restriction, GitHub secrets) that this workflow depends on — it's a manual step outside of CI's control.

## Source structure

- **`src/glm.ts`** — GLM parser. `parseHeader()` + `iterSurfaces()` generator. Yields `SurfaceView` with a `boneReferences: Uint8Array` subarray view into the original buffer — modify in-place with a `DataView` to remap bones.
- **`src/gla.ts`** — GLA skeleton reader. `readBoneMap(Uint8Array)` walks `mdxaSkel_t` entries sequentially from `ofsSkel` and returns a `Map<boneName, index>`.
- **`src/boneMapping.ts`** — Exports `JK3_TO_JK2: ReadonlyArray<number>` mapping JK3 bone index → JK2 bone index (-1 for `ltail`/`rtail`).
- **`src/converter.ts`** — `convertGlm(data: Uint8Array)` remaps all bone references in-place and patches `numBones` in the header (53 → 72). Shared between CLI and browser.
- **`src/token.ts`** — Generic `Token<Kind, Warning, ExtraByKind>` and `Position` shared by every text-format parser (currently just `commonTokenizer.ts`; the future `animation.cfg` record parser and `animevents.cfg` parser instantiate their own `Kind`/`Warning`/`ExtraByKind`). See `decisions/common-tokenizer.md`.
- **`src/commonTokenizer.ts`** — `tokenize(source: string)` generator implementing the whitespace/comment/token rules shared by `animation.cfg` and the future `animevents.cfg` (`sep`/`token`/`bare-token`/`quoted-token`/`line-comment`/`block-comment` in `reference/animation_cfg_grammar.abnf`), single-pass with no `indexOf`-based delimiter search. Always ends with a terminal `Eof` token; `tokenValue()` slices a bare/quoted token's value out of the source on demand. See `decisions/common-tokenizer.md`.
- **`src/jk3-to-jk2/app.ts`** — Browser UI entry point for the converter tool. Loaded by `site/jk3-to-jk2/index.njk` as `<script type="module" src="app.js">`. Lives in its own subfolder (mirroring `dist/jk3-to-jk2/` and `site/jk3-to-jk2/`) because it's specific to this one tool, unlike the shared/reusable parsing modules (`glm.ts`, `gla.ts`, `converter.ts`, `boneMapping.ts`), which stay directly under `src/` and are imported with a `../` prefix.
- **`src/testdata/`** — `simpleskel.gla` (3-bone skeleton: root/foo/bar), `testmodel.glm` (2 surfaces, 2 LODs), and `simple-animation.cfg` (a handful of plain anim-entry records, no comments/quotes) used by unit tests.
- **`src/convert-cli.ts`** — CLI wrapper around `convertGlm`.
- **`src/print-cli.ts`** — CLI that prints each surface's name and bone reference list per LOD; warns on out-of-range indices.
- **`site/`** — Eleventy project for the browser UI, covering both the landing page and each tool's own page: `site/_includes/base.njk` (the shared `<html>`/`<head>` shell plus the site-wide nav), `site/index.njk` (the landing page, looping over `site/_data/tools.json` to render one card per tool), `site/jk3-to-jk2/index.njk` (the converter tool's page, front matter + page body, loads `app.js` as an ES module — Eleventy mirrors `site/`'s directory structure into `dist/`, so this lands at `dist/jk3-to-jk2/index.html` alongside `dist/jk3-to-jk2/app.js`), `site/css/main.css` (plain stylesheet, copied unprocessed). `eleventy.config.js` registers a `fromRoot` filter (implementation in `site/_lib/fromRoot.js`, plain JS since Eleventy loads it directly with no build step, with a colocated `fromRoot.test.ts` unit test — both excluded from Eleventy's own page discovery by their `_` prefix) used by `base.njk` for the stylesheet link and nav home link, so they resolve correctly regardless of a page's nesting depth (see `decisions/multi-page-relative-links.md`). `npm run build`'s `postbuild` step runs `npx eleventy`, which builds `site/` into `dist/` (config in `eleventy.config.js` at the repo root, per Eleventy's default config discovery location), landing alongside tsc's output so `dist/` is self-contained and deployable as-is. See `decisions/eleventy-build.md`.
- **`ci.sh`** — `npm ci`, then `npm test` unless called with `--skip-tests`.
- **`deploy.sh`** — CI-only: `ci.sh --skip-tests`, `npm run build`, then `rsync --delete` of `dist/` to the production server over SSH. See `deploy.md` for the required env vars and one-time server-side setup.
- **`deploy.md`** — one-time, manual server-side deploy setup spec (deploy keypair, `authorized_keys` `rrsync` restriction, GitHub Actions secrets). Not run by CI; a human runs this once.
- **`e2e/`** — Playwright screenshot-snapshot tests (`playwright.config.ts` at repo root). `visual.spec.ts` screenshots each page of the built `dist/` site (`/` for the landing page, `/jk3-to-jk2/` for the converter), served locally by the dependency-free `e2e/serve.mjs`, and compares against committed baselines in `e2e/visual.spec.ts-snapshots/` (`landing-page-chromium-linux.png`/`converter-page-chromium-linux.png` plus an accessibility-tree `*.aria.yml` per page, which is resilient to font-rendering noise that would otherwise show up as a spurious pixel diff). Run via `./visual-test.sh` (builds, then runs Playwright — mirrors `ci.sh`; this is what CI's `visual` job runs, already inside the pinned container) or `npm run test:visual` if `dist/` is already fresh **and** you're already running inside that same pinned image — running it bare on an arbitrary host is unreliable, since `system-ui` font rendering (and the Chromium build) differs across OSes and would produce false diffs against the committed baselines. To just run the suite locally on a bare host without changing the baselines, use `./visual-test-local.sh` (Podman, same pinned image as CI). **Baselines must be regenerated inside that exact pinned `mcr.microsoft.com/playwright:vX.Y.Z-noble` image, too** — run `./visual-test-update.sh` (uses Podman locally with `--userns=keep-id` so the committed PNG comes back owned by your host user, not root) rather than on a bare host.

## Domain: Ghoul2 Binary Formats

JK3 and JK2 both use the Ghoul2 (GL2) format for player models. A player model consists of two files:

- **`.glm`** — mesh file (magic: `"2LGM"`, `MDXM_IDENT`). Contains geometry, surface hierarchy, LODs, bone weights, and UV data.
- **`.gla`** — animation/skeleton file (magic: `"2LGA"`, `MDXA_IDENT`). Contains bone hierarchy, base pose matrices, and compressed animation frames.

The format specification is in `reference/mdx_format.h` (copied from OpenJK). All offset fields in file structs are **relative to the struct that contains them**, not the file start.

Each player model also has an `animation.cfg` (per-anim frame ranges/fps) and an optional `animevents.cfg` (per-frame sound/effect/footstep/etc. triggers) — plain-text, not Ghoul2 binary. `reference/ja_animation_parse.c` is a GPLv2 excerpt of JA's parser for both (`BG_ParseAnimationFile`/`BG_ParseAnimationEvtFile`/`ParseAnimationEvtBlock` plus the shared `COM_Parse` tokenizer); `reference/animation_cfg_grammar.abnf` is the ABNF grammar derived from it, ahead of the future animation.cfg and animevents.cfg parser stories.

### Key conversion challenge

JK3 and JK2 use **different skeletons** with different bone indices. The conversion must remap the `boneReferences` array in each `mdxmSurface_t` from JK3 global bone indices to JK2 global bone indices, by matching bones by name via `mdxaSkel_t.name`. The per-vertex bone index bits in `uiNmWeightsAndBoneIndexes` are indices into the surface's own `boneReferences` array (not the global skeleton), so they do not need to change.

### File traversal

GLM surfaces are accessed via two parallel arrays per LOD:
1. `mdxmLODSurfOffset_t.offsets[]` — offsets to each `mdxmSurface_t` within that LOD block. Offsets are **relative to `mdxmLODSurfOffset_t`** (i.e. `lodBase + 4`), not to `mdxmLOD_t` (`lodBase`).
2. `mdxmHierarchyOffsets_t.offsets[]` — offsets to `mdxmSurfHierarchy_t` entries (shader name, flags, parent/child indices) — **stored once at the file level**, not per LOD. This table sits immediately after the header at byte 164 (`sizeof(mdxmHeader_t)`). `ofsSurfHierarchy` in the header points to the first *entry* (past the table) and should **not** be used as the table base.

GLA bone data: frame/bone index is at `ofsFrames + (frameNum * numBones * 3) + (boneNum * 3)` — a 3-byte little-endian index into the compressed bone pool (`ofsCompBonePool`). Each pool entry is an `mdxaCompQuatBone_t` (14 bytes, quaternion-compressed).

### GLA skeleton layout

The bone offset table starts immediately after the header at offset 100 (`sizeof(mdxaHeader_t)`), **not** at `ofsSkel`. `ofsSkel` in the header equals `100 + boneOffsets[0]` (the absolute offset of the first bone); the converter reads bones sequentially from `ofsSkel` instead.

Pre-extracted bone-name→index mappings are in `lut/jk2_bones.json` and `lut/jk3_bones.json`, generated by `extract_bone_map.py`.

### Design decisions

Rationale for non-obvious implementation choices lives in `decisions/`, one file per decision. Each file has a one-line `summary` in its front matter — check that before deciding whether to read the full file.

- `decisions/bone-mapping.md` — how JK3→JK2 bone remapping handles bones with no equivalent.
- `decisions/animname-check.md` — why a non-humanoid `animName` warns-and-confirms instead of failing or converting silently.
- `decisions/coding-conventions.md` — in-place `DataView` mutation for GLM conversion vs. immutable-source-plus-view for planned GLA splicing; offsets relative to containing struct; generator-based iteration.
- `decisions/common-tokenizer.md` — the generic `Token<Kind, Warning, ExtraByKind>` shape shared by all text-format parsers (no `text` field); the explicit terminal `Eof` token distinguishing true end-of-input from an embedded NUL; `MAX_TOKEN_CHARS` diagnosed as a `>= 1024` warning; `Token` generic over `Warning` so each parser's warning set stays closed.
- `decisions/deploy-pipeline.md` — why deploy is a `needs: test` job in `ci.yml` rather than a separate workflow; why the deploy SSH key is `rrsync -wo`-restricted. How `dist/index.html` itself is produced is covered in `decisions/eleventy-build.md`.
- `decisions/eleventy-build.md` — why the site is built with Eleventy (`@11ty/eleventy`, an ordinary npm devDependency) rather than a separately-provisioned system tool; `site/` as a project tree separate from `src/`; how `dist/index.html` is generated from a shared base layout.
- `decisions/multi-page-relative-links.md` — why asset/nav links use a page-depth-computing Eleventy filter (`fromRoot`) instead of root-absolute paths or hand-set front matter; why `e2e/serve.mjs`'s directory-index fallback was generalized to any trailing-slash request.
- `decisions/shell-script-parsing.md` — why shell scripts and CI/agent tooling parse JSON/YAML with `jq`/`yq` instead of reaching for Python.
- `decisions/updating-decisions.md` — when a decision changes, edit its entry in place to describe the current design; don't layer on "superseded by" annotations, git history already preserves the old rationale.
- `decisions/visual-regression-testing.md` — why CI and local baseline regeneration both pin the exact same `mcr.microsoft.com/playwright:vX.Y.Z-noble` image (Podman locally, Docker container in CI); Chromium-only scoping; a separate `visual` CI job/container instead of folding into `test`; explicit `viewport`/`deviceScaleFactor` pinning instead of `devices['Desktop Chrome']`.
