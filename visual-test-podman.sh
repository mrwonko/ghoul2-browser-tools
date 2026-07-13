#!/usr/bin/env bash
set -euo pipefail

# Shared Podman wrapper for visual-test-local.sh and visual-test-update.sh.
# Both need the exact same pinned image CI's `visual` job uses (Chromium
# build/OS font set must match the committed baselines — see
# decisions/visual-regression-testing.md), and both need --userns=keep-id so
# anything written back through the bind mount (e.g. a regenerated baseline
# PNG) comes back owned by the host user instead of a remapped UID. The only
# difference between the two callers is which npm script to run, passed as
# $1. Keep PLAYWRIGHT_IMAGE below in lockstep with @playwright/test's version
# in package.json and the image tag in .github/workflows/ci.yml whenever
# Playwright is upgraded.
#
# Not used by CI: CI's `visual` job already runs inside this same pinned
# image via ci.yml's `container:` job option, so wrapping visual-test.sh in
# Podman too would double the container nesting. This script (and its two
# callers) is for a contributor working on the bare host.

PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.61.1-noble"

npm_script="$1"

podman run --rm --userns=keep-id \
  -v "$PWD:/work" -w /work \
  "$PLAYWRIGHT_IMAGE" \
  bash -c 'npm ci && npm run build && npm run "$1"' bash "$npm_script"
