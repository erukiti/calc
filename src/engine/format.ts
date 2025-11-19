/**
 * Numeric formatting utilities. These are UI-agnostic helpers.
 */

import type { Decimal } from './decimal';

/**
 * Decimal 値を文字列に整形する。
 * - 小数は最大 12 桁までに丸める。
 * - 末尾の 0 と小数点は可能な限り削除する。
 * - `-0` は `0` に正規化する。
 */
export function formatNumber(n: Decimal): string {
  let s = n.toFixed(12);
  s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  if (s === '-0') s = '0';
  return s;
}

/** Backward-compatible alias used by existing code/tests. */
export const fmt = formatNumber;
