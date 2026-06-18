import { readFileSync } from 'fs';

const fourCC = (s: string): number =>
  s.split('').reduce((acc, c, i) => acc | (c.charCodeAt(0) << (i * 8)), 0);

export const MDXA_IDENT   = fourCC('2LGA');
export const MDXA_VERSION = 6;

const MAX_QPATH  = 64;
// name(64) + flags(4) + parent(4) + BasePoseMat(48) + BasePoseMatInv(48) + numChildren(4)
const BONE_FIXED = MAX_QPATH + 4 + 4 + 48 + 48 + 4; // 172

const textDecoder = new TextDecoder('ascii');

function readString(data: Uint8Array, offset: number): string {
  const slice = data.subarray(offset, offset + MAX_QPATH);
  const end   = slice.indexOf(0);
  return textDecoder.decode(end === -1 ? slice : slice.subarray(0, end));
}

// Returns a map of bone name → global bone index, in skeleton order.
export function readBoneMap(data: Uint8Array): Map<string, number> {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const ident   = v.getInt32(0, true);
  const version = v.getInt32(4, true);
  if (ident !== MDXA_IDENT)    throw new Error(`not a GLA file (ident=${ident})`);
  if (version !== MDXA_VERSION) throw new Error(`unsupported GLA version ${version}`);

  // After ident(4)+version(4)+name[64]: fScale(4) numFrames(4) ofsFrames(4)
  //   numBones(4) ofsCompBonePool(4) ofsSkel(4) ofsEnd(4)
  const headerBase = 8 + MAX_QPATH;
  const numBones = v.getInt32(headerBase + 12, true);
  const ofsSkel  = v.getInt32(headerBase + 20, true);

  const map = new Map<string, number>();
  let offset = ofsSkel;
  for (let i = 0; i < numBones; i++) {
    const name        = readString(data, offset);
    const numChildren = v.getInt32(offset + BONE_FIXED - 4, true);
    map.set(name, i);
    offset += BONE_FIXED + numChildren * 4;
  }
  return map;
}

export function readBoneMapFromFile(path: string): Map<string, number> {
  return readBoneMap(new Uint8Array(readFileSync(path)));
}
