#!/usr/bin/env bash
set -euo pipefail

for f in decisions/*.md; do
  summary=$(awk '/^---$/{c++; next} c==1 && /^summary:/{sub(/^summary:[ ]*/, ""); print; exit}' "$f")
  printf '%s: %s\n' "$f" "$summary"
done
