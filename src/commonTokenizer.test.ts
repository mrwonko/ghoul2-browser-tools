import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Position } from './token.js';
import {
  CommonToken,
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

function ws(source: string, start: number, end: number): CommonToken {
  return { kind: CommonTokenKind.Whitespace, start: positionAt(source, start), end: positionAt(source, end) };
}

function bareTok(source: string, start: number, end: number, warning?: CommonTokenWarning): CommonToken {
  return { kind: CommonTokenKind.BareToken, start: positionAt(source, start), end: positionAt(source, end), warning };
}

function lineComment(source: string, start: number, end: number): CommonToken {
  return { kind: CommonTokenKind.LineComment, start: positionAt(source, start), end: positionAt(source, end) };
}

function blockComment(source: string, start: number, end: number, warning?: CommonTokenWarning): CommonToken {
  return {
    kind: CommonTokenKind.BlockComment,
    start: positionAt(source, start),
    end: positionAt(source, end),
    warning,
  };
}

function quotedTok(
  source: string,
  start: number,
  end: number,
  contentStart: number,
  contentEnd: number,
  warning?: CommonTokenWarning,
): CommonToken {
  return {
    kind: CommonTokenKind.QuotedToken,
    start: positionAt(source, start),
    end: positionAt(source, end),
    contentStart: positionAt(source, contentStart),
    contentEnd: positionAt(source, contentEnd),
    warning,
  };
}

// The trailing end-of-input Eof token every non-NUL source ends with, at
// `source.length` with whatever line/column that offset implies.
function eofEndOfInput(source: string): CommonToken {
  return {
    kind: CommonTokenKind.Eof,
    start: positionAt(source, source.length),
    end: positionAt(source, source.length),
    reason: EofReason.EndOfInput,
  };
}

// Runs tokenize() to completion, asserts the stream ends with the expected
// end-of-input Eof token (once, here, so table rows below don't repeat it),
// and returns the tokens preceding it.
function tokenizeBody(source: string): CommonToken[] {
  const tokens = [...tokenize(source)];
  const last = tokens.pop();
  expect(last).toEqual(eofEndOfInput(source));
  return tokens;
}

describe('tokenize', () => {
  const bareA = 'foo';
  const spaceA = ' ';
  const bareA2 = 'bar';
  const sourceA = bareA + spaceA + bareA2;

  const bareB = 'foo';
  const mixedWsB = '\t\v\f\r\n'; // tab, vertical tab, form feed, CR, LF
  const bareB2 = 'bar';
  const sourceB = bareB + mixedWsB + bareB2;

  const lineCommentC = '// a comment';
  const nlC = '\n';
  const bareC2 = 'next';
  const sourceC = lineCommentC + nlC + bareC2;

  const bareD = 'foo';
  const spaceD = ' ';
  const lineCommentD = '// runs to true EOF, no trailing newline';
  const sourceD = bareD + spaceD + lineCommentD;

  const bareE = 'foo';
  const spaceE1 = ' ';
  const blockE = '/* a block comment */';
  const spaceE2 = ' ';
  const bareE2 = 'bar';
  const sourceE = bareE + spaceE1 + blockE + spaceE2 + bareE2;

  const bareF = 'foo';
  const spaceF = ' ';
  const blockF = '/* unterminated, runs to EOF';
  const sourceF = bareF + spaceF + blockF;

  const quotedG1 = '"hello"';
  const spaceG = ' ';
  const quotedG2 = '""'; // empty quoted token
  const sourceG = quotedG1 + spaceG + quotedG2;

  const quotedH = '"unterminated, runs to EOF';
  const sourceH = quotedH;

  const bareI1 = 'foo//bar';
  const spaceI = ' ';
  const bareI2 = 'foo/*bar';
  const bareI3 = 'foo"bar"';
  const sourceI = bareI1 + spaceI + bareI2 + spaceI + bareI3;

  // Comments are 'sep', same as whitespace: right after a block comment ends
  // (no separating whitespace at all), a '"' still starts a *fresh*
  // quoted-token — contrast with sourceI above, where the same character
  // appearing mid-run of an already-started bare-token is just absorbed.
  const blockK = '/* c */';
  const quotedK = '"q"';
  const sourceK = blockK + quotedK;

  const cases: { name: string; source: string; want: CommonToken[] }[] = [
    {
      name: 'bare tokens separated by a single space',
      source: sourceA,
      want: [
        bareTok(sourceA, 0, bareA.length),
        ws(sourceA, bareA.length, bareA.length + spaceA.length),
        bareTok(sourceA, bareA.length + spaceA.length, sourceA.length),
      ],
    },
    {
      name: 'mixed whitespace chars coalesce into one whitespace token; LF increments line and resets column, CR does not',
      source: sourceB,
      want: [
        bareTok(sourceB, 0, bareB.length),
        ws(sourceB, bareB.length, bareB.length + mixedWsB.length),
        bareTok(sourceB, bareB.length + mixedWsB.length, sourceB.length),
      ],
    },
    {
      name: 'line comment mid-line ends before the newline; the newline itself is part of the following whitespace token',
      source: sourceC,
      want: [
        lineComment(sourceC, 0, lineCommentC.length),
        ws(sourceC, lineCommentC.length, lineCommentC.length + nlC.length),
        bareTok(sourceC, lineCommentC.length + nlC.length, sourceC.length),
      ],
    },
    {
      name: 'line comment running to true EOF with no trailing newline carries no warning',
      source: sourceD,
      want: [
        bareTok(sourceD, 0, bareD.length),
        ws(sourceD, bareD.length, bareD.length + spaceD.length),
        lineComment(sourceD, bareD.length + spaceD.length, sourceD.length),
      ],
    },
    {
      name: 'normal block comment',
      source: sourceE,
      want: [
        bareTok(sourceE, 0, bareE.length),
        ws(sourceE, bareE.length, bareE.length + spaceE1.length),
        blockComment(sourceE, bareE.length + spaceE1.length, bareE.length + spaceE1.length + blockE.length),
        ws(
          sourceE,
          bareE.length + spaceE1.length + blockE.length,
          bareE.length + spaceE1.length + blockE.length + spaceE2.length,
        ),
        bareTok(sourceE, bareE.length + spaceE1.length + blockE.length + spaceE2.length, sourceE.length),
      ],
    },
    {
      name: 'unterminated block comment running to EOF gets warning and spans to the end',
      source: sourceF,
      want: [
        bareTok(sourceF, 0, bareF.length),
        ws(sourceF, bareF.length, bareF.length + spaceF.length),
        blockComment(
          sourceF,
          bareF.length + spaceF.length,
          sourceF.length,
          CommonTokenWarning.UnterminatedBlockComment,
        ),
      ],
    },
    {
      name: 'quoted tokens, including an empty one',
      source: sourceG,
      want: [
        quotedTok(sourceG, 0, quotedG1.length, 1, quotedG1.length - 1),
        ws(sourceG, quotedG1.length, quotedG1.length + spaceG.length),
        quotedTok(
          sourceG,
          quotedG1.length + spaceG.length,
          sourceG.length,
          quotedG1.length + spaceG.length + 1,
          quotedG1.length + spaceG.length + 1,
        ),
      ],
    },
    {
      name: 'unterminated quoted token running to EOF: contentEnd equals end, plus an UnterminatedQuotedToken warning',
      source: sourceH,
      want: [
        quotedTok(sourceH, 0, sourceH.length, 1, sourceH.length, CommonTokenWarning.UnterminatedQuotedToken),
      ],
    },
    {
      name: 'bare tokens containing "//", "/*", or a quote after their first character stay a single bare-token',
      source: sourceI,
      want: [
        bareTok(sourceI, 0, bareI1.length),
        ws(sourceI, bareI1.length, bareI1.length + spaceI.length),
        bareTok(sourceI, bareI1.length + spaceI.length, bareI1.length + spaceI.length + bareI2.length),
        ws(
          sourceI,
          bareI1.length + spaceI.length + bareI2.length,
          bareI1.length + spaceI.length + bareI2.length + spaceI.length,
        ),
        bareTok(sourceI, bareI1.length + spaceI.length + bareI2.length + spaceI.length, sourceI.length),
      ],
    },
    {
      name: 'a comment ending immediately (no whitespace) before a quote still starts a fresh quoted-token',
      source: sourceK,
      want: [
        blockComment(sourceK, 0, blockK.length),
        quotedTok(sourceK, blockK.length, sourceK.length, blockK.length + 1, sourceK.length - 1),
      ],
    },
  ];

  it.each(cases)('$name', ({ source, want }) => {
    expect(tokenizeBody(source)).toEqual(want);
  });

  it('stops at an embedded NUL: the Eof token carries reason EmbeddedNull and a warning, nothing after the NUL is yielded', () => {
    const before = 'foo';
    const source = before + '\0' + 'bar';
    const tokens = [...tokenize(source)];
    expect(tokens).toEqual([
      bareTok(source, 0, before.length),
      {
        kind: CommonTokenKind.Eof,
        start: positionAt(source, before.length),
        end: positionAt(source, before.length + 1),
        reason: EofReason.EmbeddedNull,
        warning: CommonTokenWarning.EmbeddedNull,
      },
    ]);
  });

  it('round-trips a source string exercising several token kinds at once', () => {
    const source = 'foo "bar baz" // trailing comment\n/* block\ncomment */ next"unterminated';
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
      { length: 1023, wantWarning: undefined },
      { length: 1024, wantWarning: CommonTokenWarning.TokenTooLong },
      { length: 2000, wantWarning: CommonTokenWarning.TokenTooLong },
    ])('bare token of length $length', ({ length, wantWarning }) => {
      const source = 'a'.repeat(length);
      const [token] = [...tokenize(source)];
      expect(token).toMatchObject({ kind: CommonTokenKind.BareToken, warning: wantWarning });
    });

    it.each([
      { length: 1023, wantWarning: undefined },
      { length: 1024, wantWarning: CommonTokenWarning.TokenTooLong },
      { length: 2000, wantWarning: CommonTokenWarning.TokenTooLong },
    ])('quoted token with content length $length', ({ length, wantWarning }) => {
      const source = `"${'a'.repeat(length)}"`;
      const [token] = [...tokenize(source)];
      expect(token).toMatchObject({ kind: CommonTokenKind.QuotedToken, warning: wantWarning });
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
