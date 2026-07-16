/** 1-based line/column, 0-based UTF-16 code unit offset into the source string. */
export interface Position {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

/**
 * One uniform token type for all results of a single parser: `Kind` is that
 * parser's closed enum of token kinds, `Warning` is its closed enum of
 * possible per-token anomalies, and `ExtraByKind` is a *partial* map from
 * only the kinds that need extra data to their extra-fields shape. `start`/
 * `end` alone imply the token's text (as a slice of the original source),
 * so there is deliberately no separate `text` field to keep in sync.
 *
 * Neither `Kind` nor `Warning` has a default — like `ExtraByKind`, every
 * instantiation states its own closed set explicitly rather than silently
 * inheriting a shared one. This keeps each parser's possible warnings (and
 * kinds) narrow and closed to what it actually produces: a `commonTokenizer`
 * consumer never sees a warning value that could only come from some other
 * parser, and vice versa.
 */
export type Token<
  Kind extends string,
  Warning extends string,
  ExtraByKind extends Partial<Record<Kind, object>> = Record<never, never>,
> = {
  [K in Kind]: {
    readonly kind: K;
    readonly start: Position;
    readonly end: Position; // exclusive: one past the last code unit spanned
    readonly warning?: Warning;
  } & (K extends keyof ExtraByKind ? ExtraByKind[K] : unknown);
}[Kind];
