export const MAX_QPATH = 64;

export const fourCC = (s: string): number =>
  s.split('').reduce((acc, c, i) => acc | (c.charCodeAt(0) << (i * 8)), 0);

const textDecoder = new TextDecoder('ascii');

export function readString(data: Uint8Array, offset: number): string {
  const slice = data.subarray(offset, offset + MAX_QPATH);
  const end   = slice.indexOf(0);
  return textDecoder.decode(end === -1 ? slice : slice.subarray(0, end));
}
