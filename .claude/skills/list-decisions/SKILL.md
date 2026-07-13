---
name: list-decisions
description: Skims decisions/ (this repo's log of non-obvious past design choices) and reports which entries are relevant to the task at hand. Use before scoping an epic into stories, planning a story's implementation, or implementing a plan — anywhere a recorded rationale could otherwise get silently contradicted.
---

Each file under `decisions/` records the rationale behind one non-obvious past design decision. Front matter has a one-line `summary` — that's cheap to read; the full body is only worth opening for files that look relevant to the current task.

## Process

1. Run `.claude/skills/list-decisions/list-decisions.sh` from the repo root. It lists every file under `decisions/` alongside its front-matter `summary` — don't assume the file set matches what's cited in `CLAUDE.md` or elsewhere; files get added over time, and the script always reflects what's actually there.
2. Against the task at hand (the epic/story/plan text passed as args, or the surrounding conversation if no args given), judge each summary as relevant or not.
3. For every relevant file, read it in full. Don't proceed to contradict a recorded rationale without calling that out explicitly to whoever you're reporting to.

## Output

A short list: for each relevant decision, its filename and the key rationale that bears on the current task. Say explicitly if none are relevant — that's a valid outcome, not a failure to find something.
