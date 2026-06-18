import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { iterSurfaces } from './glm.js';
import { readBoneMap } from './gla.js';

const testdata = (name: string) =>
  new Uint8Array(readFileSync(join(import.meta.dirname, 'testdata', name)));

describe('iterSurfaces', () => {
  it('yields correct surfaces and bone names for testmodel.glm', () => {
    const boneNames = new Map(
      [...readBoneMap(testdata('simpleskel.gla'))].map(([name, idx]) => [idx, name])
    );

    const resolve = (refs: Uint8Array, count: number): string[] => {
      const dv = new DataView(refs.buffer, refs.byteOffset, refs.byteLength);
      return Array.from({ length: count }, (_, i) => boneNames.get(dv.getInt32(i * 4, true))!);
    };

    const surfaces = [...iterSurfaces(testdata('testmodel.glm'))];

    expect(surfaces.map(s => ({ lod: s.lodIndex, name: s.name, bones: resolve(s.boneReferences, s.numBoneRefs) }))).toEqual([
      { lod: 0, name: 'root',  bones: ['root', 'foo'] },
      { lod: 0, name: 'child', bones: ['foo',  'bar'] },
      { lod: 1, name: 'root',  bones: ['root', 'foo'] },
      { lod: 1, name: 'child', bones: ['foo',  'bar'] },
    ]);
  });
});
