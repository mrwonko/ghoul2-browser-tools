import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Position, Token, TokenBase } from './token.js';
import {
  CommonToken,
  CommonTokenExtra,
  CommonTokenKind,
  CommonTokenWarning,
  EofReason,
  tokenize,
  tokenValue,
} from './commonTokenizer.js';

// Computes the Position at a given offset into `source` independently of
// tokenize()'s own bookkeeping: 1-based line/column, only '\n' increments
// the line and resets the column (matches SkipWhitespace/COM_ParseExt; '\r'
// is an ordinary character with no special handling).
function positionAt(source: string, offset: number): Position {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset; i++) {
    if (source[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { offset, line, column };
}

// --- Fixture DSL: a token kind's extra data, but with every Position field
// expressed relative to that token's own span, so a test case can put the
// source literal right next to what it parses into instead of a table of
// absolute Positions computed far away from the string they describe. ---

/**
 * A `Position` expressed relative to a fixture's own `[start, end)` span,
 * anchored explicitly to one end or the other — `afterStart(n)`/
 * `beforeEnd(n)` below are the only ways to build one. Unlike a signed
 * number (where `>= 0` meant "from start" and `< 0` meant "from end"), this
 * can represent "0 code units before end" (`beforeEnd(0)`, i.e. exactly at
 * the token's own end) without colliding with "0 code units after start"
 * (`afterStart(0)`, i.e. exactly at the token's own start).
 */
interface RelativeOffset {
  readonly anchor: 'start' | 'end';
  readonly distance: number;
}

/** `distance` code units after this fixture's own start. */
function afterStart(distance: number): RelativeOffset {
  return { anchor: 'start', distance };
}

/** `distance` code units before this fixture's own end. */
function beforeEnd(distance: number): RelativeOffset {
  return { anchor: 'end', distance };
}

function isRelativeOffset(value: unknown): value is RelativeOffset {
  return typeof value === 'object' && value !== null && 'anchor' in value && 'distance' in value;
}

/** Swaps every `Position`-typed property of a token kind's extra-fields
 *  shape for a `RelativeOffset`, leaving every other property (e.g. `Eof`'s
 *  `reason: EofReason`) unchanged. */
type WithRelativeOffsets<T> = {
  [K in keyof T]: T[K] extends Position ? RelativeOffset : T[K];
};

/**
 * The part of a `TokenFixture` shared by every kind, independent of that
 * kind's own extra data. Built on `Token`'s own `TokenBase<Kind, Warning>`
 * (`kind`/`start`/`end`/`warnings`) rather than repeating those fields by
 * hand, dropping the two that don't apply to a fixture (`start`/`end` are
 * implied by where a fixture's `source` falls in the concatenated input,
 * never stated) and loosening `warnings` from `TokenBase`'s required
 * `ReadonlyArray<Warning>` to optional — most fixtures flag nothing, and
 * `buildFixture()` below defaults an omitted `warnings` to `[]`.
 */
type TokenFixtureBase<Kind, Warning> = Omit<TokenBase<Kind, Warning>, 'start' | 'end' | 'warnings'> & {
  readonly source: string;
  readonly warnings?: ReadonlyArray<Warning>;
};

/**
 * Mirrors `Token<Kind, Warning, ExtraByKind>` (`src/token.ts`) exactly —
 * same mapped-type-over-a-union-then-indexed-access trick to build a
 * discriminated union — except it's the recipe for a token rather than the
 * token itself: `TokenFixtureBase` stands in for `Token`'s base fields, and
 * any `Position` field in a kind's extra data becomes a `RelativeOffset`.
 */
type TokenFixture<
  Kind extends string,
  Warning extends string,
  ExtraByKind extends Partial<Record<Kind, object>>,
> = {
  [K in Kind]: TokenFixtureBase<K, Warning> &
    (K extends keyof ExtraByKind ? WithRelativeOffsets<ExtraByKind[K]> : unknown);
}[Kind];

// Resolves a RelativeOffset against one fixture's own [start, end) span
// (both absolute offsets into the fully concatenated source).
function resolveRelativeOffset(source: string, start: number, end: number, offset: RelativeOffset): Position {
  const absolute = offset.anchor === 'start' ? start + offset.distance : end - offset.distance;
  return positionAt(source, absolute);
}

/**
 * Concatenates every fixture's `source` (plus `opts.trailingRawInput`, if
 * given — extra raw text fed to the parser but outside the
 * expected-tokens list, for cases like "NUL followed by garbage that must
 * yield nothing") into the full input a parser would see. Each fixture's
 * span is exactly `[cursor before, cursor after consuming its source)` —
 * there's no override, since "span = source's own length" already covers
 * every case, including the embedded-NUL one. Each `RelativeOffset` field
 * resolves to an absolute `Position` relative to that same span, via
 * `positionAt`'s '\n'-aware advance logic (same rules `tokenize()` itself
 * uses).
 */
function buildFixture<Kind extends string, Warning extends string, ExtraByKind extends Partial<Record<Kind, object>>>(
  fixtures: readonly TokenFixture<Kind, Warning, ExtraByKind>[],
  opts?: { trailingRawInput?: string },
): { source: string; tokens: Token<Kind, Warning, ExtraByKind>[] } {
  const source = fixtures.map((f) => f.source).join('') + (opts?.trailingRawInput ?? '');

  const tokens: Token<Kind, Warning, ExtraByKind>[] = [];
  let cursor = 0;
  for (const fixture of fixtures) {
    const { source: fixtureSource, kind, warnings, ...extra } = fixture;
    const start = cursor;
    const end = cursor + fixtureSource.length;
    cursor = end;

    const resolvedExtra: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(extra)) {
      resolvedExtra[key] = isRelativeOffset(value) ? resolveRelativeOffset(source, start, end, value) : value;
    }

    tokens.push({
      kind,
      start: positionAt(source, start),
      end: positionAt(source, end),
      warnings: warnings ?? [],
      ...resolvedExtra,
    } as Token<Kind, Warning, ExtraByKind>);
  }

  return { source, tokens };
}

type CommonTokenFixture = TokenFixture<CommonTokenKind, CommonTokenWarning, CommonTokenExtra>;

function buildCommonTokenFixture(
  fixtures: readonly CommonTokenFixture[],
  opts?: { trailingRawInput?: string },
): { source: string; tokens: CommonToken[] } {
  return buildFixture<CommonTokenKind, CommonTokenWarning, CommonTokenExtra>(fixtures, opts);
}

describe('tokenize', () => {
  const cases: { name: string; fixtures: CommonTokenFixture[] }[] = [
    {
      name: 'bare tokens separated by a single space',
      fixtures: [
        { source: 'foo', kind: CommonTokenKind.BareToken },
        { source: ' ', kind: CommonTokenKind.Whitespace },
        { source: 'bar', kind: CommonTokenKind.BareToken },
        { source: '', kind: CommonTokenKind.Eof, reason: EofReason.EndOfInput },
      ],
    },
    {
      name: 'mixed whitespace chars coalesce into one whitespace token; LF increments line and resets column, CR does not',
      fixtures: [
        { source: 'foo', kind: CommonTokenKind.BareToken },
        { source: '\t\v\f\r\n', kind: CommonTokenKind.Whitespace }, // tab, vertical tab, form feed, CR, LF
        { source: 'bar', kind: CommonTokenKind.BareToken },
        { source: '', kind: CommonTokenKind.Eof, reason: EofReason.EndOfInput },
      ],
    },
    {
      name: 'line comment mid-line ends before the newline; the newline itself is part of the following whitespace token',
      fixtures: [
        { source: '// a comment', kind: CommonTokenKind.LineComment },
        { source: '\n', kind: CommonTokenKind.Whitespace },
        { source: 'next', kind: CommonTokenKind.BareToken },
        { source: '', kind: CommonTokenKind.Eof, reason: EofReason.EndOfInput },
      ],
    },
    {
      name: 'line comment running to true EOF with no trailing newline carries no warning',
      fixtures: [
        { source: 'foo', kind: CommonTokenKind.BareToken },
        { source: ' ', kind: CommonTokenKind.Whitespace },
        { source: '// runs to true EOF, no trailing newline', kind: CommonTokenKind.LineComment },
        { source: '', kind: CommonTokenKind.Eof, reason: EofReason.EndOfInput },
      ],
    },
    {
      name: 'normal block comment',
      fixtures: [
        { source: 'foo', kind: CommonTokenKind.BareToken },
        { source: ' ', kind: CommonTokenKind.Whitespace },
        { source: '/* a block comment */', kind: CommonTokenKind.BlockComment },
        { source: ' ', kind: CommonTokenKind.Whitespace },
        { source: 'bar', kind: CommonTokenKind.BareToken },
        { source: '', kind: CommonTokenKind.Eof, reason: EofReason.EndOfInput },
      ],
    },
    {
      name: 'unterminated block comment running to EOF gets warning and spans to the end',
      fixtures: [
        { source: 'foo', kind: CommonTokenKind.BareToken },
        { source: ' ', kind: CommonTokenKind.Whitespace },
        {
          source: '/* unterminated, runs to EOF',
          kind: CommonTokenKind.BlockComment,
          warnings: [CommonTokenWarning.UnterminatedBlockComment],
        },
        { source: '', kind: CommonTokenKind.Eof, reason: EofReason.EndOfInput },
      ],
    },
    {
      name: 'quoted tokens, including an empty one',
      fixtures: [
        {
          source: '"hello"',
          kind: CommonTokenKind.QuotedToken,
          contentStart: afterStart(1),
          contentEnd: beforeEnd(1),
        },
        { source: ' ', kind: CommonTokenKind.Whitespace },
        {
          source: '""',
          kind: CommonTokenKind.QuotedToken,
          contentStart: afterStart(1),
          contentEnd: beforeEnd(1),
        }, // empty content
        { source: '', kind: CommonTokenKind.Eof, reason: EofReason.EndOfInput },
      ],
    },
    {
      name: 'unterminated quoted token running to EOF: contentEnd equals end, plus an UnterminatedQuotedToken warning',
      fixtures: [
        {
          source: '"unterminated, runs to EOF',
          kind: CommonTokenKind.QuotedToken,
          contentStart: afterStart(1),
          contentEnd: beforeEnd(0), // exactly at the token's own end: no closing quote was found
          warnings: [CommonTokenWarning.UnterminatedQuotedToken],
        },
        { source: '', kind: CommonTokenKind.Eof, reason: EofReason.EndOfInput },
      ],
    },
    {
      name: 'bare tokens containing "//", "/*", or a quote after their first character stay a single bare-token',
      fixtures: [
        { source: 'foo//bar', kind: CommonTokenKind.BareToken },
        { source: ' ', kind: CommonTokenKind.Whitespace },
        { source: 'foo/*bar', kind: CommonTokenKind.BareToken },
        { source: ' ', kind: CommonTokenKind.Whitespace },
        { source: 'foo"bar"', kind: CommonTokenKind.BareToken },
        { source: '', kind: CommonTokenKind.Eof, reason: EofReason.EndOfInput },
      ],
    },
    {
      // Comments are 'sep', same as whitespace: right after a block comment
      // ends (no separating whitespace at all), a '"' still starts a
      // *fresh* quoted-token — contrast with the "stay a single
      // bare-token" case above, where the same character appearing
      // mid-run of an already-started bare-token is just absorbed.
      name: 'a comment ending immediately (no whitespace) before a quote still starts a fresh quoted-token',
      fixtures: [
        { source: '/* c */', kind: CommonTokenKind.BlockComment },
        {
          source: '"q"',
          kind: CommonTokenKind.QuotedToken,
          contentStart: afterStart(1),
          contentEnd: beforeEnd(1),
        },
        { source: '', kind: CommonTokenKind.Eof, reason: EofReason.EndOfInput },
      ],
    },
  ];

  it.each(cases)('$name', ({ fixtures }) => {
    const { source, tokens: want } = buildCommonTokenFixture(fixtures);
    expect([...tokenize(source)]).toEqual(want);
  });

  it('stops at an embedded NUL: the Eof token carries reason EmbeddedNull and a warning, nothing after the NUL is yielded', () => {
    const { source, tokens: want } = buildCommonTokenFixture(
      [
        { source: 'foo', kind: CommonTokenKind.BareToken },
        {
          source: '\0',
          kind: CommonTokenKind.Eof,
          reason: EofReason.EmbeddedNull,
          warnings: [CommonTokenWarning.EmbeddedNull],
        },
      ],
      { trailingRawInput: 'bar' },
    );
    expect([...tokenize(source)]).toEqual(want);
  });

  it('round-trips a source string exercising several token kinds at once', () => {
    const source = `foo "bar baz" // trailing comment
/* block
comment */ next"unterminated`;
    const tokens = [...tokenize(source)];
    const reconstructed = tokens.map((t) => source.slice(t.start.offset, t.end.offset)).join('');
    expect(reconstructed).toBe(source);
  });

  it('round-trips the simple-animation.cfg fixture', () => {
    const fixturePath = fileURLToPath(new URL('./testdata/simple-animation.cfg', import.meta.url));
    const source = readFileSync(fixturePath, 'utf8');
    const tokens = [...tokenize(source)];
    const reconstructed = tokens.map((t) => source.slice(t.start.offset, t.end.offset)).join('');
    expect(reconstructed).toBe(source);
  });

  describe('MAX_TOKEN_CHARS boundary (>= 1024, not > 1024 — the original engine discards the whole token at that length, not just truncates)', () => {
    it.each([
      { length: 1023, wantWarnings: [] },
      { length: 1024, wantWarnings: [CommonTokenWarning.TokenTooLong] },
      { length: 2000, wantWarnings: [CommonTokenWarning.TokenTooLong] },
    ])('bare token of length $length', ({ length, wantWarnings }) => {
      const source = 'a'.repeat(length);
      const [token] = [...tokenize(source)];
      expect(token).toMatchObject({ kind: CommonTokenKind.BareToken, warnings: wantWarnings });
    });

    it.each([
      { length: 1023, wantWarnings: [] },
      { length: 1024, wantWarnings: [CommonTokenWarning.TokenTooLong] },
      { length: 2000, wantWarnings: [CommonTokenWarning.TokenTooLong] },
    ])('quoted token with content length $length', ({ length, wantWarnings }) => {
      const source = `"${'a'.repeat(length)}"`;
      const [token] = [...tokenize(source)];
      expect(token).toMatchObject({ kind: CommonTokenKind.QuotedToken, warnings: wantWarnings });
    });

    it('unterminated quoted token whose content also reaches MAX_TOKEN_CHARS carries both warnings', () => {
      // No closing quote, so it's simultaneously UnterminatedQuotedToken
      // (content ran to EOF) and TokenTooLong (content length >= 1024).
      const source = `"${'a'.repeat(1024)}`;
      const [token] = [...tokenize(source)];
      expect(token).toMatchObject({
        kind: CommonTokenKind.QuotedToken,
        warnings: [CommonTokenWarning.UnterminatedQuotedToken, CommonTokenWarning.TokenTooLong],
      });
    });
  });
});

describe('tokenValue', () => {
  it('dequotes a normal quoted token', () => {
    const source = '"hello"';
    const [token] = [...tokenize(source)];
    expect(token.kind).toBe(CommonTokenKind.QuotedToken);
    expect(tokenValue(source, token as Extract<CommonToken, { kind: CommonTokenKind.QuotedToken }>)).toBe('hello');
  });

  it('passes a bare token through unchanged', () => {
    const source = 'foobar';
    const [token] = [...tokenize(source)];
    expect(token.kind).toBe(CommonTokenKind.BareToken);
    expect(tokenValue(source, token as Extract<CommonToken, { kind: CommonTokenKind.BareToken }>)).toBe('foobar');
  });

  it('returns the text minus only the leading quote for an unterminated quoted token (no trailing quote to strip)', () => {
    const source = '"unterminated';
    const [token] = [...tokenize(source)];
    expect(token.kind).toBe(CommonTokenKind.QuotedToken);
    expect(tokenValue(source, token as Extract<CommonToken, { kind: CommonTokenKind.QuotedToken }>)).toBe(
      'unterminated',
    );
  });
});
