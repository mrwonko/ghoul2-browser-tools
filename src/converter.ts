import { HDR_NUM_BONES, iterSurfaces } from './glm.js';
import { JK3_TO_JK2 } from './boneMapping.js';

const JK2_NUM_BONES = 72;

// Remaps all bone references in `data` from JK3 to JK2 indices in-place.
// Throws if a surface references a bone with no JK2 equivalent (ltail / rtail).
export function convertGlm(data: Uint8Array): void {
  const hdrView = new DataView(data.buffer, data.byteOffset, data.byteLength);

  for (const surf of iterSurfaces(data)) {
    const refs = new DataView(surf.boneReferences.buffer, surf.boneReferences.byteOffset, surf.boneReferences.byteLength);
    for (let i = 0; i < surf.numBoneRefs; i++) {
      const jk3 = refs.getInt32(i * 4, true);
      const jk2 = JK3_TO_JK2[jk3];
      if (jk2 === undefined) throw new Error(`Surface "${surf.name}": unknown JK3 bone index ${jk3}`);
      if (jk2 === -1)        throw new Error(`Surface "${surf.name}": JK3 bone index ${jk3} (ltail/rtail) has no JK2 equivalent`);
      refs.setInt32(i * 4, jk2, true);
    }
  }

  hdrView.setInt32(HDR_NUM_BONES, JK2_NUM_BONES, true);
}
