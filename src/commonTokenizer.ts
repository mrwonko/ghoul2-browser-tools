import type { Position, Token } from './token.js';

// Shared whitespace/comment/token scanner for the `sep`/`token`/`bare-token`/
// `quoted-token`/`line-comment`/`block-comment` rules in
// reference/animation_cfg_grammar.abnf, which are common to animation.cfg
// and the future animevents.cfg parser (see reference/ja_animation_parse.c's
// COM_Parse/COM_ParseExt/SkipWhitespace). Higher-level record parsing
// (anim-entry, animevents.cfg's blocks/directives) is out of scope here.

export enum CommonTokenKind {
  Whitespace = 'whitespace',
  LineComment = 'line-comment',
  BlockComment = 'block-comment',
  BareToken = 'bare-token',
  QuotedToken = 'quoted-token',
  Eof = 'eof',
}

export enum CommonTokenWarning {
  UnterminatedBlockComment = 'unterminated-block-comment',
  UnterminatedQuotedToken = 'unterminated-quoted-token',
  EmbeddedNull = 'embedded-null',
  TokenTooLong = 'token-too-long',
}

/** Distinguishes "ran out of input" from "stopped at an embedded NUL." JA's
 *  own parser treats the two identically (NUL doubles as its C string
 *  terminator), but a real animation.cfg/animevents.cfg can't legitimately
 *  contain a literal NUL — so unlike the original engine, we surface this as
 *  a diagnosable anomaly rather than silently folding it into ordinary
 *  end-of-file. */
export enum EofReason {
  EndOfInput = 'end-of-input',
  EmbeddedNull = 'embedded-null',
}

export interface CommonTokenExtra {
  [CommonTokenKind.QuotedToken]: {
    /**
     * Span of the string's content, excluding the surrounding quotes. If
     * `contentEnd` equals the token's own `end`, there was no closing quote
     * before EOF/NUL; that case additionally adds
     * `CommonTokenWarning.UnterminatedQuotedToken` to `warnings`, mirroring
     * `CommonTokenWarning.UnterminatedBlockComment` for block comments (and
     * can coexist with `CommonTokenWarning.TokenTooLong` in the same array,
     * if the unterminated content also reaches `MAX_TOKEN_CHARS`).
     */
    readonly contentStart: Position;
    readonly contentEnd: Position;
  };
  [CommonTokenKind.Eof]: {
    readonly reason: EofReason;
  };
}

export type CommonToken = Token<CommonTokenKind, CommonTokenWarning, CommonTokenExtra>;

/** Matches JA's `COM_ParseExt`: `com_token[MAX_TOKEN_CHARS]`'s storage guard
 *  is `if (len < MAX_TOKEN_CHARS) { store; len++ }`, so a *bare* token whose
 *  real content length is `>= MAX_TOKEN_CHARS` gets silently discarded to
 *  `""` by the original engine (`if (len == MAX_TOKEN_CHARS) len = 0`) —
 *  there is no "truncate to the first MAX_TOKEN_CHARS characters" middle
 *  ground for bare tokens. A *quoted* token instead gets its content capped
 *  at `MAX_TOKEN_CHARS` characters (not counting the opening quote) rather
 *  than discarded. Neither original-engine outcome is one we want to
 *  reproduce, so both cases are flagged identically here as
 *  `CommonTokenWarning.TokenTooLong`, with the token's full, uncapped span
 *  still yielded. The boundary is `>=`, not `>`, either way. */
const MAX_TOKEN_CHARS = 1024;

const NUL = 0;
const LF = '\n'.charCodeAt(0);
const SLASH = '/'.charCodeAt(0);
const STAR = '*'.charCodeAt(0);
const DQUOTE = '"'.charCodeAt(0);
const WS_MIN = 0x01;
const WS_MAX = 0x20;

/**
 * Tokenizes `source` in a single pass over its characters (no `indexOf`-style
 * delimiter search — every code unit is visited exactly once, whichever
 * token it ends up belonging to). Always yields exactly one trailing `Eof`
 * token before returning — callers get an explicit, position-carrying token
 * to inspect rather than inferring "no more tokens" from the generator
 * simply stopping.
 *
 * Every byte of `source` up to (and, for the embedded-NUL case, including)
 * the trailing `Eof` token's span is covered by some yielded token, so
 * `tokens.map(t => source.slice(t.start.offset, t.end.offset)).join('')`
 * reconstructs `source` exactly (or its prefix through the NUL, in the
 * embedded-NUL case — see `EofReason.EmbeddedNull`).
 */
export function* tokenize(source: string): Generator<CommonToken, void, undefined> {
  let pos = 0;
  let line = 1;
  let column = 1;

  function position(): Position {
    return { offset: pos, line, column };
  }

  // -1 means true end of input (past the last code unit), distinct from a
  // NUL code unit (0), which is a genuine character in `source`.
  function peekCharAt(lookahead: number): number {
    const p = pos + lookahead;
    return p < source.length ? source.charCodeAt(p) : -1;
  }

  function peekChar(): number {
    return peekCharAt(0);
  }

  // Advances one code unit, updating line/column the same way
  // SkipWhitespace/COM_ParseExt do: only '\n' increments the line and resets
  // the column; '\r' is an ordinary character with no special handling.
  function stepChar(): void {
    if (source.charCodeAt(pos) === LF) {
      line++;
      column = 1;
    } else {
      column++;
    }
    pos++;
  }

  for (;;) {
    const c = peekChar();

    // true end of input
    if (c === -1) {
      const start = position();
      yield { kind: CommonTokenKind.Eof, start, end: start, reason: EofReason.EndOfInput, warnings: [] };
      return;
    }

    // embedded NUL: a diagnosable anomaly, not ordinary end-of-file (see EofReason)
    if (c === NUL) {
      const start = position();
      stepChar();
      yield {
        kind: CommonTokenKind.Eof,
        start,
        end: position(),
        reason: EofReason.EmbeddedNull,
        warnings: [CommonTokenWarning.EmbeddedNull],
      };
      return;
    }

    // sep: a run of whitespace bytes coalesces into one token
    if (c >= WS_MIN && c <= WS_MAX) {
      const start = position();
      let wc: number;
      do {
        stepChar();
        wc = peekChar();
      } while (wc >= WS_MIN && wc <= WS_MAX);
      yield { kind: CommonTokenKind.Whitespace, start, end: position(), warnings: [] };
      continue;
    }

    // line-comment: '//' to (but excluding) the next '\n', or to EOF/NUL if none
    if (c === SLASH && peekCharAt(1) === SLASH) {
      const start = position();
      stepChar();
      stepChar();
      // Runs to (but excluding) the next '\n', or to EOF/NUL if none — the
      // '\n' itself belongs to the *next* (whitespace) token.
      for (;;) {
        const lc = peekChar();
        if (lc === -1 || lc === NUL || lc === LF) break;
        stepChar();
      }
      yield { kind: CommonTokenKind.LineComment, start, end: position(), warnings: [] };
      continue;
    }

    // block-comment: '/*' up to and including the first '*/', or to EOF/NUL
    if (c === SLASH && peekCharAt(1) === STAR) {
      const start = position();
      stepChar();
      stepChar();
      const warnings: CommonTokenWarning[] = [];
      for (;;) {
        const bc = peekChar();
        if (bc === -1 || bc === NUL) {
          warnings.push(CommonTokenWarning.UnterminatedBlockComment);
          break;
        }
        if (bc === STAR && peekCharAt(1) === SLASH) {
          stepChar();
          stepChar();
          break;
        }
        stepChar();
      }
      yield { kind: CommonTokenKind.BlockComment, start, end: position(), warnings };
      continue;
    }

    // quoted-token: '"' up to and including the closing '"', or to EOF/NUL
    if (c === DQUOTE) {
      const start = position();
      stepChar();
      const contentStart = position();
      let contentEnd: Position;
      const warnings: CommonTokenWarning[] = [];
      for (;;) {
        const qc = peekChar();
        if (qc === -1 || qc === NUL) {
          contentEnd = position();
          warnings.push(CommonTokenWarning.UnterminatedQuotedToken);
          break;
        }
        if (qc === DQUOTE) {
          contentEnd = position();
          stepChar();
          break;
        }
        stepChar();
      }
      const contentLength = contentEnd.offset - contentStart.offset;
      if (contentLength >= MAX_TOKEN_CHARS) {
        warnings.push(CommonTokenWarning.TokenTooLong);
      }
      yield {
        kind: CommonTokenKind.QuotedToken,
        start,
        end: position(),
        contentStart,
        contentEnd,
        warnings,
      };
      continue;
    }

    // bare-token: the maximal run of characters with code > 0x20, never
    // re-checking for '//', '/*', or '"' partway through — comments/quotes
    // are only recognized where a *new* token would start.
    {
      const start = position();
      do {
        stepChar();
      } while (peekChar() > WS_MAX);
      const contentLength = position().offset - start.offset;
      const warnings = contentLength >= MAX_TOKEN_CHARS ? [CommonTokenWarning.TokenTooLong] : [];
      yield { kind: CommonTokenKind.BareToken, start, end: position(), warnings };
    }
  }
}

/** Slices a bare or quoted token's value out of `source` on demand (dequoted,
 *  for quoted tokens — the surrounding `"` characters are excluded). */
export function tokenValue(
  source: string,
  token: Extract<CommonToken, { kind: CommonTokenKind.BareToken | CommonTokenKind.QuotedToken }>,
): string {
  if (token.kind === CommonTokenKind.QuotedToken) {
    return source.slice(token.contentStart.offset, token.contentEnd.offset);
  }
  return source.slice(token.start.offset, token.end.offset);
}
