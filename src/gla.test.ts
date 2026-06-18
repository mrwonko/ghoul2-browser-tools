import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { readBoneMap } from './gla.js';

const testdata = (name: string) =>
  new Uint8Array(readFileSync(join(import.meta.dirname, 'testdata', name)));

describe('readBoneMap', () => {
  it('reads simpleskel.gla', () => {
    const map = readBoneMap(testdata('simpleskel.gla'));
    expect(Object.fromEntries(map)).toEqual({ root: 0, foo: 1, bar: 2 });
  });
});
