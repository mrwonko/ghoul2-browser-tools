---
name: updating-decisions
summary: When a recorded decision changes, edit the entry in place to describe the current design — don't layer on "superseded by" annotations or keep the old rationale around; git history already preserves it.
---

## Edit decisions in place, don't annotate them as superseded

When a change (a course change, a rewrite, a new constraint) invalidates something a `decisions/*.md` file recorded, update that file to describe the *current* design directly — rewrite the affected section(s), don't leave the old content in place wrapped in a "**Superseded by** `decisions/whatever.md`" blockquote or similar historical marker.

This came up concretely on the Hugo→Eleventy course change (#15/PR #23): the first pass at `decisions/eleventy-build.md` left `decisions/deploy-pipeline.md`'s original "`index.html` lives in `src/`" entry in place with a superseded-notice grafted on top, and framed the new file as "supersedes point 1 of `decisions/deploy-pipeline.md`" rather than just stating the current design. Both files grew a layer of historical narration that only made sense if you also went and read the thing it was superseding.

**Why edit in place instead:** `decisions/` exists to answer "why does the code look like this today," for someone reading it *now* — not to be a changelog. Keeping every past rationale visible, cross-referenced, and flagged as superseded makes each file grow indefinitely and forces a reader to mentally diff old-vs-new to find out what's actually still true. Git history already is the changelog: `git log -p -- decisions/<file>.md` (or `git blame`) recovers exactly what changed and when, for anyone who genuinely needs the "why did we used to do it differently" context. The checked-in file only needs to carry the reasoning that's still load-bearing.

**How to apply:** when a plan or PR reworks something a decision recorded, edit that decision's content directly to match the new reality — rewrite the section, update the front-matter `summary`, and drop stale cross-references to the old approach — rather than appending a superseded/deprecated marker. If the *old* rationale itself is genuinely still worth explaining (e.g. "why did we ever do X" matters for understanding a migration in progress), that belongs in the PR description or the commit message, not permanently embedded in the decision file.
