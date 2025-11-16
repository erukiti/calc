/**
 * Text normalization utilities used prior to lexing/parsing.
 *
 * Converts common math glyphs and full-width forms into ASCII operators and
 * digits so the lexer has a predictable input.
 */

/** Normalizes an expression string into ASCII-friendly form. */
export function normalizeExpr(str: string): string {
  let s = (str || '').normalize('NFKC');
  s = s
    .replace(/[×✕✖]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/[·・]/g, '*')
    .replace(/／/g, '/')
    .replace(/％/g, '%')
    .replace(/＾/g, '^')
    .replace(/￥/g, '\\')
    .replace(/[，]/g, ',');
  return s;
}

