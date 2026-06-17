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
    _fscale, _num_frames, _ofs_frames, num_bones, _ofs_comp, _ofs_skel, _ofs_end = \
        struct.unpack_from('<fiiiiii', data, 8 + MAX_QPATH)

    # The bone offset table starts immediately after the header (offset 100).
    # Each entry is relative to that base. ofsSkel in the header is a historic
    # leftover equal to base + boneOffsets[0], not the table start.
    SKEL_BASE = 2 * 4 + MAX_QPATH + 7 * 4  # sizeof(mdxaHeader_t) = 100
    skel_offsets = struct.unpack_from(f'<{num_bones}i', data, SKEL_BASE)

    bone_map = {}
    for i, rel_offset in enumerate(skel_offsets):
        bone_offset = SKEL_BASE + rel_offset
        name = data[bone_offset:bone_offset + MAX_QPATH].split(b'\x00')[0].decode('ascii')
        bone_map[name] = i

    return bone_map


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <file.gla>", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(read_bone_map(sys.argv[1]), indent=2))
