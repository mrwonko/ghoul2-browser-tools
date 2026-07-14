#!/usr/bin/env bash
set -euo pipefail

# Regenerates the committed baselines under e2e/visual.spec.ts-snapshots/.
# See visual-test-podman.sh (the shared Podman wrapper) and
# decisions/visual-regression-testing.md for the rationale.

exec "$(dirname "$0")/visual-test-podman.sh" test:visual:update
