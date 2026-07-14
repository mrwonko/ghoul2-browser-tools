---
name: shell-script-parsing
summary: Shell scripts and CI/agent tooling parse JSON/YAML with jq/yq rather than reaching for Python.
---

CI logic, agent tasks, and one-off tooling in this repo are shell scripts (see `decisions/deploy-pipeline.md` and `decisions/visual-regression-testing.md` for examples), not Python. When one of those scripts needs to pull a field out of structured data — a `package.json` version, a `gh api`/`gh pr view --json` response, a GitHub Actions YAML file — reach for `jq` (JSON) or `yq` (YAML) rather than shelling out to Python.

Python drags in an interpreter and its own quoting/escaping rules for what's usually a single field extraction; `jq`/`yq` are purpose-built for exactly this, compose naturally with the rest of a `bash` pipeline, and don't add a second language to a script that's otherwise pure shell. This mirrors the existing preference for `gh` subcommands with `--json` over raw `gh api` calls (see project memory) — favor the smallest tool that directly does the job over a general-purpose scripting language.

Only fall back to Python (or another language) if the transformation genuinely doesn't fit `jq`/`yq` reasonably — e.g. something requiring real control flow or a library `jq`/`yq` don't have an equivalent for.
