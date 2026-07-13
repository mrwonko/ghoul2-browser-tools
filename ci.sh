#!/usr/bin/env bash
set -euo pipefail

# Usage: ./ci.sh [--skip-tests]
#
# --skip-tests: install dependencies only, don't run the test suite. Used by
# deploy.sh, which only runs after the `test` job (which already ran this
# script without the flag) has succeeded — re-running the tests there would
# just be duplicated work.

npm ci

if [[ "${1:-}" != "--skip-tests" ]]; then
  npm test
fi
