#!/usr/bin/env bash
set -euo pipefail

# CI's `visual` job runs this inside the pinned mcr.microsoft.com/playwright
# Docker image (see .github/workflows/ci.yml), so the Chromium build and OS
# font set match whatever generated the committed baselines under
# e2e/visual.spec.ts-snapshots/. See decisions/visual-regression-testing.md.
#
# A separate script from ci.sh, mirroring deploy.sh: ci.sh's fast unit-test
# inner loop stays untouched for a contributor who's only running `npm test`
# and doesn't have a browser/container toolchain set up.

npm ci
npm run build
npm run test:visual
