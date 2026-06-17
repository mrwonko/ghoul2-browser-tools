# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A web-based converter that automatically ports Jedi Knight: Jedi Academy (JK3) player models to Jedi Knight 2: Jedi Outcast (JK2). The implementation is planned as a web tool (no server required — runs in-browser).

The project is based on JK3 source code and is licensed under **GPLv2**.

## Domain: Ghoul2 Binary Formats

JK3 and JK2 both use the Ghoul2 (GL2) format for player models. A player model consists of two files:

- **`.glm`** — mesh file (magic: `"2LGM"`, `MDXM_IDENT`). Contains geometry, surface hierarchy, LODs, bone weights, and UV data.
- **`.gla`** — animation/skeleton file (magic: `"2LGA"`, `MDXA_IDENT`). Contains bone hierarchy, base pose matrices, and compressed animation frames.

The format specification is in `reference/mdx_format.h` (copied from OpenJK). All offset fields in file structs are **relative to the struct that contains them**, not the file start.

### Key conversion challenge

JK3 and JK2 use **different skeletons** with different bone indices. The conversion must remap the `boneReferences` array in each `mdxmSurface_t` from JK3 global bone indices to JK2 global bone indices, by matching bones by name via `mdxaSkel_t.name`. The per-vertex bone index bits in `uiNmWeightsAndBoneIndexes` are indices into the surface's own `boneReferences` array (not the global skeleton), so they do not need to change.

### File traversal

GLM surfaces are accessed via two parallel arrays per LOD:
1. `mdxmLODSurfOffset_t.offsets[]` — offsets to each `mdxmSurface_t` within that LOD block
2. `mdxmHierarchyOffsets_t.offsets[]` — offsets to `mdxmSurfHierarchy_t` entries (shader name, flags, parent/child indices) — **stored once at the file level**, not per LOD

GLA bone data: frame/bone index is at `ofsFrames + (frameNum * numBones * 3) + (boneNum * 3)` — a 3-byte little-endian index into the compressed bone pool (`ofsCompBonePool`). Each pool entry is an `mdxaCompQuatBone_t` (14 bytes, quaternion-compressed).
