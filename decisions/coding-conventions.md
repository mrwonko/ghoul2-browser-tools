---
name: coding-conventions
summary: GLM conversion mutates buffers in-place via DataView; GLA splicing (planned) instead treats source files as immutable and layers a view over them, realized only on save/export. Both use generators for structure iteration and offsets relative to the containing struct.
---

This codebase parses large binary buffers in the browser, so conventions favor avoiding unnecessary allocations/copies and mirroring the original C struct layout closely — but the mutation strategy differs by file type and use case:

- **Offsets are relative to the struct that contains them**, not the file start (matches `reference/mdx_format.h`'s C struct layout, where offset fields are struct members). New parsing code must resolve offsets the same way — don't assume file-relative offsets exist elsewhere in the codebase.
- **GLM conversion (`src/converter.ts`, `src/glm.ts`) mutates in-place via `DataView`** over subarray views into the original buffer (e.g. `SurfaceView.boneReferences`), rather than allocating new arrays/objects and copying data across. This is a straight one-file-in, one-file-out conversion, so mutating the single buffer directly is the simplest correct approach.
- **GLA splicing (multiple source skeletons merged into one, planned) is different**: source `.gla` files are treated as immutable inputs. Instead of mutating any one of them, a view/overlay layer represents the merged result logically (which bones come from which source, renumbered indices, etc.), and only gets realized into actual output bytes at save/export time. Don't retrofit in-place mutation onto splicing code — there's no single source buffer to mutate in-place once multiple inputs are involved.
- **Iteration over variable-length/nested structures uses generators** (e.g. `iterSurfaces()` in `src/glm.ts`), so callers can process one surface/frame at a time without materializing the whole file's structures into memory at once. This applies regardless of mutate-in-place vs. view-then-realize.

New code should follow whichever of these two strategies matches its situation (single-file in-place conversion vs. multi-source merge) unless a story's plan explicitly calls for something else.
