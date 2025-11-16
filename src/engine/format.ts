/**
 * Numeric formatting utilities. These are UI-agnostic helpers.
 */

/**
 * Formats a number with trimmed trailing zeros while preserving integer form.
 * - Non-finite numbers (NaN, Infinity) are returned via `String(n)`.
 * - Integers are returned without a decimal point.
 * - `-0` is normalized to `0`.
 */
export function formatNumber(n: number): string {
  if (!isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  let s = n.toFixed(12);
  s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  if (s === '-0') s = '0';
  return s;
}

/** Backward-compatible alias used by existing code/tests. */
export const fmt = formatNumber;

