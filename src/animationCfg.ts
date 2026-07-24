import type { Token } from './token.js';
import { type CommonToken, CommonTokenKind, type EofReason, tokenValue, tokenize } from './commonTokenizer.js';

// Higher-level record parsing for animation.cfg, layered on top of
// src/commonTokenizer.ts's token stream: groups tokens into the
// `anim-entry` records described by reference/animation_cfg_grammar.abnf
// lines 89-97 (see reference/ja_animation_parse.c's BG_ParseAnimationFile).
// See decisions/anim-entry-parser.md for the design rationale.

export enum AnimEntryKind {
  AnimEntry = 'anim-entry',
  IncompleteAnimEntry = 'incomplete-anim-entry',
}

export enum AnimEntryWarning {
  IncompleteEntry = 'incomplete-entry',
}

/** Every one of an `anim-entry`'s 5 fields is lexically a `token`
 *  (bare-token or quoted-token) per the grammar — `integer`/`number` are
 *  numeric *interpretations* of that same token, not separate lexer rules. */
export type AnimFieldToken = Extract<CommonToken, { kind: CommonTokenKind.BareToken | CommonTokenKind.QuotedToken }>;

type EofToken = Extract<CommonToken, { kind: CommonTokenKind.Eof }>;

export interface AnimEntryExtra {
  [AnimEntryKind.AnimEntry]: {
    readonly name: AnimFieldToken;
    readonly firstFrame: AnimFieldToken;
    readonly numFrames: AnimFieldToken;
    readonly loopFrames: AnimFieldToken;
    readonly fps: AnimFieldToken;
    /**
     * Every token consumed while collecting this entry, in order — the 5
     * named fields above plus every `Whitespace`/`LineComment`/
     * `BlockComment` token skipped between them. Lets a caller recover
     * every warning produced while parsing this entry
     * (`entry.tokens.flatMap(t => t.warnings)`) without separately
     * re-running `tokenize()` and re-deriving entry boundaries itself —
     * e.g. an `UnterminatedBlockComment` inside a separator between two
     * fields is otherwise invisible at this layer.
     */
    readonly tokens: readonly CommonToken[];
  };
  [AnimEntryKind.IncompleteAnimEntry]: {
    readonly name: AnimFieldToken;
    readonly firstFrame?: AnimFieldToken;
    readonly numFrames?: AnimFieldToken;
    readonly loopFrames?: AnimFieldToken;
    // fps is deliberately never a key here: if fps were present, all 5
    // fields are present and it's a complete AnimEntry, not incomplete.
    readonly eofReason: EofReason; // re-used from commonTokenizer.ts: why the record cut off
    readonly tokens: readonly CommonToken[];
  };
}

export type AnimEntry = Token<AnimEntryKind, AnimEntryWarning, AnimEntryExtra>;

/**
 * Groups `tokenize(source)`'s token stream into `anim-entry` records, one
 * iterator pulled from repeatedly (tokenization is never restarted).
 * `Whitespace`/`LineComment`/`BlockComment` tokens are skipped when looking
 * for the next field, mirroring `COM_Parse`'s own internal
 * `SkipWhitespace`-with-comments loop, just expressed against the
 * already-tokenized stream instead of re-scanning characters.
 *
 * A record that runs out of real tokens partway through (`tokenize()`'s
 * always-terminal `Eof`) is yielded as an `IncompleteAnimEntry` with
 * whichever fields were actually captured, then the generator returns —
 * `Eof` is terminal for `tokenize()` too, so there's nothing left to try to
 * read another entry from. There is deliberately no synthetic terminal
 * marker at this layer (unlike `commonTokenizer`'s explicit `Eof`) — see
 * decisions/anim-entry-parser.md.
 */
export function* parseAnimationCfg(source: string): Generator<AnimEntry, void, undefined> {
  const it = tokenize(source);
  let consumed: CommonToken[] = [];

  // Pulls the next "real" (non-separator) token, appending every token it
  // passes over — skipped separators and the real token it returns — to
  // `consumed`, so the caller can attach the full list as `tokens` when an
  // entry (complete or incomplete) is yielded.
  function pull(): AnimFieldToken | EofToken {
    for (;;) {
      const { value: token, done } = it.next();
      if (done) {
        // tokenize() always yields a terminal Eof before returning, so this
        // is unreachable in practice — a defensive assertion, not a real path.
        throw new Error('tokenize() ended without yielding a terminal Eof token');
      }
      consumed.push(token);
      switch (token.kind) {
        case CommonTokenKind.Whitespace:
        case CommonTokenKind.LineComment:
        case CommonTokenKind.BlockComment:
          continue;
        default:
          return token;
      }
    }
  }

  for (;;) {
    consumed = [];

    const name = pull();
    if (name.kind === CommonTokenKind.Eof) {
      return; // clean end, no dangling record
    }

    const firstFrame = pull();
    if (firstFrame.kind === CommonTokenKind.Eof) {
      yield {
        kind: AnimEntryKind.IncompleteAnimEntry,
        start: name.start,
        end: name.end,
        warnings: [AnimEntryWarning.IncompleteEntry],
        name,
        eofReason: firstFrame.reason,
        tokens: consumed,
      };
      return;
    }

    const numFrames = pull();
    if (numFrames.kind === CommonTokenKind.Eof) {
      yield {
        kind: AnimEntryKind.IncompleteAnimEntry,
        start: name.start,
        end: firstFrame.end,
        warnings: [AnimEntryWarning.IncompleteEntry],
        name,
        firstFrame,
        eofReason: numFrames.reason,
        tokens: consumed,
      };
      return;
    }

    const loopFrames = pull();
    if (loopFrames.kind === CommonTokenKind.Eof) {
      yield {
        kind: AnimEntryKind.IncompleteAnimEntry,
        start: name.start,
        end: numFrames.end,
        warnings: [AnimEntryWarning.IncompleteEntry],
        name,
        firstFrame,
        numFrames,
        eofReason: loopFrames.reason,
        tokens: consumed,
      };
      return;
    }

    const fps = pull();
    if (fps.kind === CommonTokenKind.Eof) {
      yield {
        kind: AnimEntryKind.IncompleteAnimEntry,
        start: name.start,
        end: loopFrames.end,
        warnings: [AnimEntryWarning.IncompleteEntry],
        name,
        firstFrame,
        numFrames,
        loopFrames,
        eofReason: fps.reason,
        tokens: consumed,
      };
      return;
    }

    yield {
      kind: AnimEntryKind.AnimEntry,
      start: name.start,
      end: fps.end,
      warnings: [],
      name,
      firstFrame,
      numFrames,
      loopFrames,
      fps,
      tokens: consumed,
    };
  }
}

// `integer`/`number`'s leading-run regexes, mirroring
// reference/animation_cfg_grammar.abnf exactly:
//   integer = ["-"] 1*DIGIT
//   number  = ["-"] (1*DIGIT ["." *DIGIT] / "." 1*DIGIT)
// A leading "+" is deliberately not accepted (a real divergence from strict
// atoi/atof, which do accept one) — the grammar's own rules don't provide
// for it, and matching the grammar is the more relevant contract here. See
// decisions/anim-entry-parser.md.
const INTEGER_RE = /^-?[0-9]+/;
const NUMBER_RE = /^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)/;

const ZERO_CHAR_CODE = '0'.charCodeAt(0);

/**
 * Parses `first-frame`/`num-frames`/`loop-frames` per the grammar's
 * `integer` rule (atoi semantics: the leading run of digits wins, trailing
 * junk is ignored rather than rejected; no leading digit run at all yields
 * `0`). Deliberately hand-rolled rather than delegating to `parseInt`,
 * which auto-detects hex/octal prefixes the grammar has no rule for (e.g.
 * `parseInt("0x1F")` is `31`, but this yields `0`. See
 * decisions/anim-entry-parser.md.
 */
export function parseAnimInteger(source: string, token: AnimFieldToken): number {
  const match = INTEGER_RE.exec(tokenValue(source, token));
  if (!match) {
    return 0;
  }
  let digits = match[0];
  const negative = digits.startsWith('-');
  if (negative) {
    digits = digits.slice(1);
  }
  let value = 0;
  for (let i = 0; i < digits.length; i++) {
    value = value * 10 + (digits.charCodeAt(i) - ZERO_CHAR_CODE);
  }
  return negative ? -value : value;
}

/**
 * Parses `fps` per the grammar's `number` rule (atof semantics: same
 * leading-run/trailing-junk tolerance as `parseAnimInteger`; no leading
 * digit run at all yields `0`). Deliberately hand-rolled rather than
 * delegating to `parseFloat`, which recognizes scientific notation and the
 * `Infinity`/`NaN` literals the grammar has no rule for (e.g.
 * `parseFloat("5e10")` is `5e10`, but this yields `5`). See
 * decisions/anim-entry-parser.md.
 */
export function parseAnimNumber(source: string, token: AnimFieldToken): number {
  const match = NUMBER_RE.exec(tokenValue(source, token));
  if (!match) {
    return 0;
  }
  let text = match[0];
  const negative = text.startsWith('-');
  if (negative) {
    text = text.slice(1);
  }
  const dotIndex = text.indexOf('.');
  const intPart = dotIndex === -1 ? text : text.slice(0, dotIndex);
  const fracPart = dotIndex === -1 ? '' : text.slice(dotIndex + 1);

  let value = 0;
  for (let i = 0; i < intPart.length; i++) {
    value = value * 10 + (intPart.charCodeAt(i) - ZERO_CHAR_CODE);
  }
  let scale = 1;
  for (let i = 0; i < fracPart.length; i++) {
    scale /= 10;
    value += (fracPart.charCodeAt(i) - ZERO_CHAR_CODE) * scale;
  }
  return negative ? -value : value;
}
