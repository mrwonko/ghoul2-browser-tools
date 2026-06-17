import { readFileSync } from 'fs';
import { parseHeader, iterSurfaces } from './glm.js';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node dist/cli.js <file.glm>');
  process.exit(1);
}

const buf  = readFileSync(path);
// Copy into a fresh ArrayBuffer so byteOffset is always 0, guaranteeing
// 4-byte alignment for the Int32Array views in iterSurfaces.
const data = new Uint8Array(buf);

const hdr = parseHeader(data);
console.log(`model: ${hdr.name}  anim: ${hdr.animName}  bones: ${hdr.numBones}  LODs: ${hdr.numLODs}  surfaces: ${hdr.numSurfaces}`);

let currentLod = -1;
for (const surf of iterSurfaces(data)) {
  if (surf.lodIndex !== currentLod) {
    currentLod = surf.lodIndex;
    console.log(`\nLOD ${currentLod}:`);
  }
  const { boneReferences: refs, numBoneRefs } = surf;
  const dv      = new DataView(refs.buffer, refs.byteOffset, refs.byteLength);
  const bones   = Array.from({ length: numBoneRefs }, (_, i) => dv.getInt32(i * 4, true));
  const invalid = bones.filter(b => b < 0 || b >= hdr.numBones);
  console.log(`  ${surf.name}: [${bones.join(', ')}]`);
  if (invalid.length > 0)
    console.warn(`    WARNING: out-of-range bone indices (valid: 0..${hdr.numBones - 1}): ${invalid.join(', ')}`);
}
