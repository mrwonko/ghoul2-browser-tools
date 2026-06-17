#!/usr/bin/env python3
"""Extract a bone-name-to-index mapping from a Ghoul2 .gla skeleton file."""

import json
import struct
import sys

MAX_QPATH = 64
MDXA_IDENT = (ord('A') << 24) | (ord('G') << 16) | (ord('L') << 8) | ord('2')
MDXA_VERSION = 6


def read_bone_map(path: str) -> dict[str, int]:
    with open(path, 'rb') as f:
        data = f.read()

    # mdxaHeader_t
    ident, version = struct.unpack_from('<ii', data, 0)
    if ident != MDXA_IDENT:
        raise ValueError(f"not a GLA file (ident={ident:#010x})")
    if version != MDXA_VERSION:
        raise ValueError(f"unexpected GLA version {version}, expected {MDXA_VERSION}")

    # name[64], fScale, numFrames, ofsFrames, numBones, ofsCompBonePool, ofsSkel, ofsEnd
    _fscale, _num_frames, _ofs_frames, num_bones, _ofs_comp, ofs_skel, _ofs_end = \
        struct.unpack_from('<fiiiiii', data, 8 + MAX_QPATH)

    # ofsSkel is the absolute file offset of the first mdxaSkel_t.
    # Walk bones sequentially: each record is name(64) + flags(4) + parent(4) +
    # BasePoseMat(48) + BasePoseMatInv(48) + numChildren(4) + children(4*n).
    BONE_FIXED = MAX_QPATH + 4 + 4 + 48 + 48 + 4  # 172 bytes
    bone_map = {}
    offset = ofs_skel
    for i in range(num_bones):
        name = data[offset:offset + MAX_QPATH].split(b'\x00')[0].decode('ascii')
        num_children, = struct.unpack_from('<i', data, offset + BONE_FIXED - 4)
        bone_map[name] = i
        offset += BONE_FIXED + num_children * 4

    return bone_map


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <file.gla>", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(read_bone_map(sys.argv[1]), indent=2))
