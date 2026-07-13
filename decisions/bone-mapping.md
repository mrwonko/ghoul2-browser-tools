---
name: bone-mapping
summary: How JK3→JK2 bone index remapping handles bones with no equivalent (ltail, rtail, lhang_tag_bone).
---

Three JK3 bones have no JK2 equivalent: `ltail`, `rtail`, and `lhang_tag_bone`. Player models are assumed not to use `ltail`/`rtail` (the converter throws at runtime if they appear). `lhang_tag_bone` is mapped to `lhand` as the nearest equivalent. The type-checked mapping lives in `src/boneMapping.ts` using `satisfies Record<MappedJk3BoneName, Jk2BoneName>`.
