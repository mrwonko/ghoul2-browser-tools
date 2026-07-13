---
name: epic-to-stories
description: Breaks a roadmap epic (or any epic-scale feature request) down into concrete, independently shippable stories by interactively clarifying scope and desired behavior with the user, then files them as GitHub issues in this repo. Use whenever the user names an epic, a big feature, or a vague chunk of roadmap work and wants it split into stories before any implementation planning begins — even if they don't say the word "epic". Use proactively before starting work on a new epic from the roadmap, and before invoking the story-to-plan or plan-to-pr steps of this project's factory workflow.
---

You turn one epic into a numbered list of concrete stories and file them as GitHub issues. You define **what** should exist, never **how** to build it — implementation planning is a separate downstream step (the `story-to-plan` subagent) and code is written later still, by `plan-to-pr`. Do not read or reason about implementation approach beyond what's needed to tell stories apart.

This work runs as a skill, not a subagent, specifically so `AskUserQuestion` works directly in this conversation — the scoping conversation with the user is the point, not a side effect.

Requires `gh` ≥ 2.96 for `gh issue create --parent` (the Ubuntu apt package can lag well behind this — run `gh --version` first; if it's older, that's a separate problem to fix before filing anything, not something to work around here).

## Process

1. Read `CLAUDE.md` at the repo root first — it has the project's domain (Ghoul2/JK2/JK3 file formats), source layout, and conventions.
2. Skim `decisions/` (one file per past design decision) — just the one-line `summary` in each file's front matter is enough at this stage. Some are scope-relevant (e.g. "player models assumed not to use ltail/rtail") and should shape how you scope stories; open the full file if a summary looks relevant.
3. Run `gh issue list --state all` to see what epics/stories already exist so you don't refile scoped or completed work (the default table output includes labels, so epics — labeled `epic` — are visible in the same listing).
4. Identify what's genuinely ambiguous about the epic — scope boundaries, which edge cases matter, priority/ordering, what "done" looks like for the epic as a whole — and ask the user via `AskUserQuestion`. Ask real questions, not rhetorical ones; if you can infer an answer confidently from CLAUDE.md or existing code, don't ask it. Batch independent questions into as few calls as possible (`AskUserQuestion` takes several questions per call) — only split into a further round when a later question genuinely depends on an earlier answer.
5. Once scope is clear, split the epic into stories. Each story must be:
   - **Independently shippable** — a coherent unit a reviewer could merge on its own, even if it depends on an earlier story landing first.
   - **Behavior-defined, not solution-defined** — describe the observable outcome (what a user/CLI/API can now do, what would prove it's done), not which functions or files to touch.
   - If scoping surfaces a small necessary adjustment to something that already exists (e.g. reorganizing a build output so a later step can consume it), fold it into the relevant story's description rather than treating it as a separate story of its own, unless it's independently shippable and worth reviewing on its own.
6. Present the finalized story list to the user as plain text first (title + one-paragraph description + dependencies per story) and get their go-ahead before filing anything on GitHub. If the user corrects the scope, revise and re-present rather than filing on a stale understanding.
7. File the issues. Never build `--title`/`--body` by inlining user-authored text into a double-quoted shell string — pass body text via `--body-file -` fed from a single-quoted heredoc so it's never shell-interpolated, and keep titles single-quoted, escaping any embedded `'` as `'\''`. For example:

   ```sh
   gh issue create --title '<name>' --label epic --body-file - <<'EOF'
   <epic summary>
   EOF
   ```

   - **More than one story:** create the epic issue first (as above), note the returned issue number, then create each story as a sub-issue of it the same way, adding `--parent <epic-issue-number>`:
     ```sh
     gh issue create --title '<story title>' --parent <epic-issue-number> --body-file - <<'EOF'
     <paragraph + dependencies>
     EOF
     ```
   - **Exactly one story:** just file a single issue, no epic/parent wrapper — don't force a one-item epic.
8. Report back the issue numbers/URLs you created.

## Boundaries

Unlike a subagent, nothing here technically stops you from reaching for `Edit`, `Write`, or `git checkout -b` mid-conversation — these boundaries are self-imposed, not tool restrictions, so hold them deliberately:

- Never propose file names, function signatures, data structures, or algorithms — that's `story-to-plan`'s job.
- Never write code.
- Never open branches or PRs.
- If the user's answers reveal the "epic" is really just one story, say so plainly instead of padding it into a multi-story list.
- Don't let this skill's research (reading `decisions/`, `gh issue list`, etc.) balloon past what's needed to scope stories — that's implementation research, which belongs in `story-to-plan` instead.
