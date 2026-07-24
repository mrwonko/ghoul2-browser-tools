import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CommonToken, CommonTokenKind, EofReason, tokenValue, tokenize } from './commonTokenizer.js';
import {
  AnimEntry,
  AnimEntryKind,
  AnimEntryWarning,
  AnimFieldToken,
  parseAnimInteger,
  parseAnimNumber,
  parseAnimationCfg,
} from './animationCfg.js';

/** The real (non-Eof) token kinds a `token` production can be — used to
 *  pick out an entry's field token for assertions below. */
function isFieldToken(token: CommonToken): token is AnimFieldToken {
  return token.kind === CommonTokenKind.BareToken || token.kind === CommonTokenKind.QuotedToken;
}

/** Every AnimFieldToken's text, via `tokenValue` (dequoted for quoted
 *  tokens) — what a test cares about, not the raw span. */
function fieldText(source: string, token: AnimFieldToken): string {
  return tokenValue(source, token);
}

/**
 * Structural invariant every case below relies on instead of hand-computing
 * token slices: concatenating every yielded entry's own `tokens` must
 * exactly reconstruct `tokenize(source)`'s output up to (and, only for a
 * trailing `IncompleteAnimEntry`, including) the terminal `Eof` token —
 * because a clean end-of-generator never consumes/yields the trailing `Eof`
 * it peeked at, while an `IncompleteAnimEntry` always does. This checks
 * `tokens` covers exactly what was consumed, with nothing missing and
 * nothing double-counted, without re-deriving parseAnimationCfg's own
 * per-field grouping logic.
 */
function expectTokensReconstructSource(source: string, entries: readonly AnimEntry[]): void {
  const allTokens = [...tokenize(source)];
  const lastEntry = entries[entries.length - 1];
  const endsWithIncompleteEntry = lastEntry?.kind === AnimEntryKind.IncompleteAnimEntry;
  const wantTokens = endsWithIncompleteEntry ? allTokens : allTokens.slice(0, -1);
  expect(entries.flatMap((e) => e.tokens)).toEqual(wantTokens);
}

describe('parseAnimationCfg', () => {
  it('two clean entries, bare tokens, single-space-separated', () => {
    const source = 'foo 1 2 0 30 bar 5 10 -1 20';
    const entries = [...parseAnimationCfg(source)];

    expect(entries).toHaveLength(2);
    expect(entries[0].kind).toBe(AnimEntryKind.AnimEntry);
    expect(entries[1].kind).toBe(AnimEntryKind.AnimEntry);

    const first = entries[0] as Extract<AnimEntry, { kind: AnimEntryKind.AnimEntry }>;
    expect(fieldText(source, first.name)).toBe('foo');
    expect(fieldText(source, first.firstFrame)).toBe('1');
    expect(fieldText(source, first.numFrames)).toBe('2');
    expect(fieldText(source, first.loopFrames)).toBe('0');
    expect(fieldText(source, first.fps)).toBe('30');
    expect(first.start).toEqual(first.name.start);
    expect(first.end).toEqual(first.fps.end);
    expect(first.warnings).toEqual([]);

    const second = entries[1] as Extract<AnimEntry, { kind: AnimEntryKind.AnimEntry }>;
    expect(fieldText(source, second.name)).toBe('bar');
    expect(fieldText(source, second.firstFrame)).toBe('5');
    expect(fieldText(source, second.numFrames)).toBe('10');
    expect(fieldText(source, second.loopFrames)).toBe('-1');
    expect(fieldText(source, second.fps)).toBe('20');

    expectTokensReconstructSource(source, entries);
  });

  it('duplicate anim-name: two independent entries, unmerged, in file order', () => {
    const source = 'ANIM_WALK 0 5 0 20\nANIM_WALK 10 5 0 25';
    const entries = [...parseAnimationCfg(source)] as Extract<AnimEntry, { kind: AnimEntryKind.AnimEntry }>[];

    expect(entries).toHaveLength(2);
    expect(fieldText(source, entries[0].name)).toBe('ANIM_WALK');
    expect(fieldText(source, entries[0].firstFrame)).toBe('0');
    expect(fieldText(source, entries[1].name)).toBe('ANIM_WALK');
    expect(fieldText(source, entries[1].firstFrame)).toBe('10');
  });

  it('quoted anim-name and a quoted numeric field parse identically to the bare-token equivalent', () => {
    const source = '"foo bar" 1 "2" 0 30';
    const entries = [...parseAnimationCfg(source)] as Extract<AnimEntry, { kind: AnimEntryKind.AnimEntry }>[];

    expect(entries).toHaveLength(1);
    expect(entries[0].name.kind).toBe(CommonTokenKind.QuotedToken);
    expect(fieldText(source, entries[0].name)).toBe('foo bar');
    expect(entries[0].numFrames.kind).toBe(CommonTokenKind.QuotedToken);
    expect(fieldText(source, entries[0].numFrames)).toBe('2');
    expect(parseAnimInteger(source, entries[0].numFrames)).toBe(2);
  });

  it.each([
    { name: '1 field (name only) present', source: 'foo' },
    { name: '2 fields present', source: 'foo 1' },
    { name: '3 fields present', source: 'foo 1 2' },
    { name: '4 fields present', source: 'foo 1 2 0' },
  ])('incomplete trailing record: $name', ({ source }) => {
    const entries = [...parseAnimationCfg(source)];
    expect(entries).toHaveLength(1);
    const entry = entries[0] as Extract<AnimEntry, { kind: AnimEntryKind.IncompleteAnimEntry }>;
    expect(entry.kind).toBe(AnimEntryKind.IncompleteAnimEntry);
    expect(entry.warnings).toEqual([AnimEntryWarning.IncompleteEntry]);
    expect(entry.eofReason).toBe(EofReason.EndOfInput);

    const fields = source.split(' ');
    expect(fieldText(source, entry.name)).toBe(fields[0]);
    expect(entry.firstFrame && fieldText(source, entry.firstFrame)).toBe(fields[1]);
    expect(entry.numFrames && fieldText(source, entry.numFrames)).toBe(fields[2]);
    expect(entry.loopFrames && fieldText(source, entry.loopFrames)).toBe(fields[3]);

    expectTokensReconstructSource(source, entries);
  });

  it('empty quoted anim-name ("") followed by further valid entries: treated as an ordinary (empty) name, parsing continues', () => {
    const source = '"" 1 2 0 30 foo 5 10 -1 20';
    const entries = [...parseAnimationCfg(source)] as Extract<AnimEntry, { kind: AnimEntryKind.AnimEntry }>[];

    expect(entries).toHaveLength(2);
    expect(entries[0].name.kind).toBe(CommonTokenKind.QuotedToken);
    expect(fieldText(source, entries[0].name)).toBe('');
    expect(fieldText(source, entries[1].name)).toBe('foo');
  });

  it.each([
    { name: 'empty file', source: '' },
    { name: 'whitespace and comments only', source: '  // just a comment\n/* block */  ' },
  ])('yields nothing for $name', ({ source }) => {
    expect([...parseAnimationCfg(source)]).toEqual([]);
  });

  it('an unterminated block comment mid-record swallowing the rest of the file yields an IncompleteAnimEntry without throwing', () => {
    const source = 'foo 1 2 /* unterminated, runs to EOF';
    let entries: AnimEntry[] = [];
    expect(() => {
      entries = [...parseAnimationCfg(source)];
    }).not.toThrow();

    expect(entries).toHaveLength(1);
    const entry = entries[0] as Extract<AnimEntry, { kind: AnimEntryKind.IncompleteAnimEntry }>;
    expect(entry.kind).toBe(AnimEntryKind.IncompleteAnimEntry);
    expect(fieldText(source, entry.name)).toBe('foo');
    expect(entry.firstFrame && fieldText(source, entry.firstFrame)).toBe('1');
    expect(entry.numFrames && fieldText(source, entry.numFrames)).toBe('2');
    expect(entry.loopFrames).toBeUndefined();
    expect(entry.eofReason).toBe(EofReason.EndOfInput);

    // The swallowed comment's own warning is recoverable via `tokens`,
    // without re-running tokenize() separately.
    const commentToken = entry.tokens.find((t) => t.kind === CommonTokenKind.BlockComment);
    expect(commentToken?.warnings).toContain('unterminated-block-comment');
  });

  it('embedded NUL mid-record: eofReason is EmbeddedNull', () => {
    const source = 'foo 1 2 0 \0garbage';
    const entries = [...parseAnimationCfg(source)];
    expect(entries).toHaveLength(1);
    const entry = entries[0] as Extract<AnimEntry, { kind: AnimEntryKind.IncompleteAnimEntry }>;
    expect(entry.kind).toBe(AnimEntryKind.IncompleteAnimEntry);
    expect(entry.eofReason).toBe(EofReason.EmbeddedNull);
  });

  it('round-trips the simple-animation.cfg fixture', () => {
    const fixturePath = fileURLToPath(new URL('./testdata/simple-animation.cfg', import.meta.url));
    const source = readFileSync(fixturePath, 'utf8');
    const entries = [...parseAnimationCfg(source)] as Extract<AnimEntry, { kind: AnimEntryKind.AnimEntry }>[];

    expect(entries).toHaveLength(2);
    expect(fieldText(source, entries[0].name)).toBe('ANIM_WALK');
    expect(parseAnimInteger(source, entries[0].firstFrame)).toBe(0);
    expect(parseAnimInteger(source, entries[0].numFrames)).toBe(5);
    expect(parseAnimInteger(source, entries[0].loopFrames)).toBe(0);
    expect(parseAnimNumber(source, entries[0].fps)).toBe(20);

    expect(fieldText(source, entries[1].name)).toBe('ANOTHER_ANIM');
    expect(parseAnimInteger(source, entries[1].firstFrame)).toBe(5);
    expect(parseAnimInteger(source, entries[1].numFrames)).toBe(10);
    expect(parseAnimInteger(source, entries[1].loopFrames)).toBe(-1);
    expect(parseAnimNumber(source, entries[1].fps)).toBe(30);
  });

  it('parses the animation-duplicate-and-truncated.cfg fixture: duplicate names unmerged, truncated trailing record flagged', () => {
    const fixturePath = fileURLToPath(new URL('./testdata/animation-duplicate-and-truncated.cfg', import.meta.url));
    const source = readFileSync(fixturePath, 'utf8');
    const entries = [...parseAnimationCfg(source)];

    expect(entries).toHaveLength(4);
    expect(entries[0].kind).toBe(AnimEntryKind.AnimEntry);
    expect(entries[1].kind).toBe(AnimEntryKind.AnimEntry);
    expect(entries[2].kind).toBe(AnimEntryKind.AnimEntry);
    expect(entries[3].kind).toBe(AnimEntryKind.IncompleteAnimEntry);

    const [walk1, walk2, run] = entries as Extract<AnimEntry, { kind: AnimEntryKind.AnimEntry }>[];
    expect(fieldText(source, walk1.name)).toBe('ANIM_WALK');
    expect(parseAnimInteger(source, walk1.firstFrame)).toBe(0);
    expect(fieldText(source, walk2.name)).toBe('ANIM_WALK');
    expect(parseAnimInteger(source, walk2.firstFrame)).toBe(10);
    expect(fieldText(source, run.name)).toBe('ANIM_RUN');

    const jump = entries[3] as Extract<AnimEntry, { kind: AnimEntryKind.IncompleteAnimEntry }>;
    expect(fieldText(source, jump.name)).toBe('ANIM_JUMP');
    expect(jump.firstFrame && fieldText(source, jump.firstFrame)).toBe('30');
    expect(jump.numFrames && fieldText(source, jump.numFrames)).toBe('6');
    expect(jump.loopFrames).toBeUndefined();
    expect(jump.eofReason).toBe(EofReason.EndOfInput);
    expect(jump.warnings).toEqual([AnimEntryWarning.IncompleteEntry]);

    expectTokensReconstructSource(source, entries);
  });
});

describe('parseAnimInteger', () => {
  function fieldTokenFor(text: string): AnimFieldToken {
    const [token] = [...tokenize(text)];
    if (!isFieldToken(token)) {
      throw new Error(`expected a field token for ${JSON.stringify(text)}, got ${token.kind}`);
    }
    return token;
  }

  it.each([
    { text: '5', want: 5 },
    { text: '-5', want: -5 },
    { text: '007', want: 7 },
    { text: '5foo', want: 5 }, // trailing junk ignored
    { text: 'walk', want: 0 }, // no leading digit at all
    { text: '0x1F', want: 0 }, // hex-looking: not auto-detected, unlike parseInt
    { text: '+5', want: 0 }, // leading '+' not in the grammar's `integer` rule: documented divergence from atoi
    { text: '""', want: 0 }, // empty (quoted) field: no leading digit run at all
    { text: '-', want: 0 },
  ])('parses $text as $want', ({ text, want }) => {
    expect(parseAnimInteger(text, fieldTokenFor(text))).toBe(want);
  });
});

describe('parseAnimNumber', () => {
  function fieldTokenFor(text: string): AnimFieldToken {
    const [token] = [...tokenize(text)];
    if (!isFieldToken(token)) {
      throw new Error(`expected a field token for ${JSON.stringify(text)}, got ${token.kind}`);
    }
    return token;
  }

  it.each([
    { text: '5', want: 5 },
    { text: '-5', want: -5 },
    { text: '1.5', want: 1.5 },
    { text: '.5', want: 0.5 },
    { text: '5.', want: 5 },
    { text: '-.5', want: -0.5 },
    { text: '5e10', want: 5 }, // scientific notation not recognized, unlike parseFloat
    { text: 'walk', want: 0 },
    { text: '+5', want: 0 }, // leading '+' not in the grammar's `number` rule: documented divergence from atof
    { text: '""', want: 0 }, // empty (quoted) field: no leading digit run at all
  ])('parses $text as $want', ({ text, want }) => {
    expect(parseAnimNumber(text, fieldTokenFor(text))).toBe(want);
  });
});
