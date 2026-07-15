---
name: animname-check
summary: Why the browser UI warns-and-confirms (rather than silently converting or hard-failing) when a GLM's animName isn't the standard humanoid skeleton.
---

The GLM header's `animName` field names the `.gla` skeleton the model was built against. The converter's bone remapping (`src/boneMapping.ts`) is only correct for the standard player skeleton, `models/players/_humanoid/_humanoid` (`EXPECTED_ANIM` in `src/jk3-to-jk2/app.ts`).

Non-humanoid `animName` values aren't rejected outright, because some legitimate player models still reference other skeletons (e.g. custom/vehicle-derived ones) where conversion may still work well enough to be useful. Instead, `src/jk3-to-jk2/app.ts` warns via `confirm()` and lets the user decide whether to proceed, rather than either silently converting (risking a broken result the user doesn't expect) or hard-failing (blocking cases that would have worked fine).

This check lives in the browser UI (`app.ts`), not in `converter.ts` — the converter itself stays a pure bone-remapping function with no user-interaction concerns.
