#!/usr/bin/env bash
set -euo pipefail

# Runs the visual regression suite locally against the committed baselines
# under e2e/visual.spec.ts-snapshots/, without changing them. See
# visual-test-podman.sh (the shared Podman wrapper) and
# decisions/visual-regression-testing.md for the rationale.

exec "$(dirname "$0")/visual-test-podman.sh" test:visual
