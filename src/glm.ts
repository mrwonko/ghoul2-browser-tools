import { MAX_QPATH, fourCC, readString } from './ghoul2.js';

export const MDXM_IDENT   = fourCC('2LGM');
export const MDXM_VERSION = 6;
// ident(4) version(4) name[64] animName[64] animIndex(4) numBones(4) numLODs(4) ofsLODs(4) numSurfaces(4) ofsSurfHierarchy(4) ofsEnd(4)
const HEADER_SIZE = 2 * 4 + MAX_QPATH * 2 + 7 * 4; // = 164

// mdxmHeader_t field offsets
// ident(4) version(4) name[64] animName[64] animIndex(4) numBones(4)
// numLODs(4) ofsLODs(4) numSurfaces(4) ofsSurfHierarchy(4) ofsEnd(4)
export const HDR_NUM_BONES   = 140;
const HDR_NUM_LODS           = 144;
const HDR_OFS_LODS           = 148;
const HDR_NUM_SURFACES       = 152;
const HDR_OFS_SURF_HIERARCHY = 156;

// mdxmSurface_t field offsets (relative to surface start)
// ident(4) thisSurfaceIndex(4) ofsHeader(4) numVerts(4) ofsVerts(4)
// numTriangles(4) ofsTriangles(4) numBoneReferences(4) ofsBoneReferences(4) ofsEnd(4)
const SURF_THIS_INDEX     =  4;
const SURF_NUM_BONE_REFS  = 28;
const SURF_OFS_BONE_REFS  = 32;

export interface GlmHeader {
  name: string;
  animName: string;
  numBones: number;
  numLODs: number;
  numSurfaces: number;
  ofsLODs: number;
  ofsSurfHierarchy: number;
}

export interface SurfaceView {
  lodIndex: number;
  surfaceIndex: number;
  name: string;
  numBoneRefs: number;
  /** Raw bytes of the boneReferences array (numBoneRefs × 4 bytes, little-endian int32s).
   *  Use a DataView for typed access: dv.getInt32(i * 4, true) / dv.setInt32(i * 4, v, true). */
  boneReferences: Uint8Array;
}

export function parseHeader(data: Uint8Array): GlmHeader {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const ident   = v.getInt32(0, true);
  const version = v.getInt32(4, true);
  if (ident !== MDXM_IDENT)   throw new Error(`not a GLM file (ident=${ident})`);
  if (version !== MDXM_VERSION) throw new Error(`unsupported GLM version ${version}`);
  return {
    name:             readString(data, 8),
    animName:         readString(data, 72),
    numBones:         v.getInt32(HDR_NUM_BONES,          true),
    numLODs:          v.getInt32(HDR_NUM_LODS,           true),
    ofsLODs:          v.getInt32(HDR_OFS_LODS,           true),
    numSurfaces:      v.getInt32(HDR_NUM_SURFACES,       true),
    ofsSurfHierarchy: v.getInt32(HDR_OFS_SURF_HIERARCHY, true),
  };
}

export function* iterSurfaces(data: Uint8Array): Generator<SurfaceView> {
  const v   = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const hdr = parseHeader(data);

  // Surface name table. mdxmHierarchyOffsets_t sits immediately after the header
  // (at HEADER_SIZE = 164), regardless of ofsSurfHierarchy (which points to
  // the first mdxmSurfHierarchy_t entry, past the table). Each int32 offset
  // in the table is relative to HEADER_SIZE and points to a mdxmSurfHierarchy_t
  // whose first 64 bytes are the name.
  const hierBase = HEADER_SIZE;
  const surfNames = new Array<string>(hdr.numSurfaces);
  for (let i = 0; i < hdr.numSurfaces; i++) {
    const rel = v.getInt32(hierBase + i * 4, true);
    surfNames[i] = readString(data, hierBase + rel);
  }

  // Walk LODs. mdxmLOD_t { ofsEnd(4) } is followed immediately by
  // mdxmLODSurfOffset_t { offsets[numSurfaces] }. Each offset is relative to
  // the mdxmLODSurfOffset_t base (= lodBase + 4), so surfBase = lodBase + 4 + offset.
  let lodBase = hdr.ofsLODs;
  for (let lod = 0; lod < hdr.numLODs; lod++) {
    const lodOfsEnd = v.getInt32(lodBase, true);

    for (let s = 0; s < hdr.numSurfaces; s++) {
      const surfRel  = v.getInt32(lodBase + 4 + s * 4, true);
      const surfBase = lodBase + 4 + surfRel;

      const surfIdx     = v.getInt32(surfBase + SURF_THIS_INDEX,    true);
      const numBoneRefs = v.getInt32(surfBase + SURF_NUM_BONE_REFS, true);
      const ofsBoneRefs = v.getInt32(surfBase + SURF_OFS_BONE_REFS, true);

      yield {
        lodIndex:       lod,
        surfaceIndex:   s,
        name:           surfNames[surfIdx] ?? `surface_${surfIdx}`,
        numBoneRefs,
        boneReferences: data.subarray(surfBase + ofsBoneRefs, surfBase + ofsBoneRefs + numBoneRefs * 4),
      };
    }

    lodBase += lodOfsEnd;
  }
}
