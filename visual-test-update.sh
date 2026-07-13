#!/usr/bin/env bash
set -euo pipefail

# Regenerates the committed baselines under e2e/visual.spec.ts-snapshots/.
#
# Runs inside Podman (not Docker — that's what's on the dev machine:
# daemonless, rootless by default, no separate desktop app), using the exact
# same tagged image CI's `visual` job uses, so local and CI renders match
# byte-for-byte (same Chromium build, same OS font set). See
# decisions/visual-regression-testing.md and keep PLAYWRIGHT_IMAGE below in
# lockstep with @playwright/test's version in package.json and the image tag
# in .github/workflows/ci.yml whenever Playwright is upgraded.
#
# --userns=keep-id maps the invoking host user's UID/GID into the container
# 1:1 (and runs the container as that user by default) instead of root —
# needed for two reasons: Chromium's sandbox refuses to run as root inside
# the container, and without keep-id a baseline PNG written back through the
# bind mount would come back owned by a UID that doesn't match the host user
# (Podman's rootless UID remapping otherwise applies).

PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.61.1-noble"

podman run --rm --userns=keep-id \
  -v "$PWD:/work" -w /work \
  "$PLAYWRIGHT_IMAGE" \
  bash -c "npm ci && npm run build && npm run test:visual:update"
