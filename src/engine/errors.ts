/**
 * Error utilities and constructors for the calculator engine.
 *
 * Each error includes a stable `name`, a short `code`, and a `range` so the UI
 * can highlight the exact source span. Functions here avoid UI concerns and do
 * not depend on DOM or formatting libraries.
 */

import type { Range } from './ast';

/** Common shape carried by all calculator-related errors. */
export type CalcError = Error & { code: string; range: Range };

/**
 * Renders a single-line caret visualization for an error range.
 * Example:
 *   1 + 2 * 3
 *       ^
 */
export function formatCaret(src: string, range: Range): string {
  const before = src.slice(0, range.start);
  const lineBreaks = [...before.matchAll(/\n/g)].length;
  const lines = src.split(/\n/);
  const line = lines[lineBreaks] ?? '';
  const prefixLength = lines.slice(0, lineBreaks).join('\n').length;
  const col = Math.max(0, range.start - prefixLength);
  return `${line}\n${' '.repeat(col)}^`;
}

/** Creates a SyntaxError with range information. */
export function syntaxError(msg: string, src: string, range: Range): CalcError {
  const caret = formatCaret(src, range);
  const e = new Error(`${msg} @${range.start}\n${caret}`) as CalcError;
  e.name = 'SyntaxError';
  e.code = 'PARSE_ERROR';
  e.range = range;
  // Keep historical compatibility: attach single-position field.
  (e as any).pos = range.start;
  return e;
}

/** Creates a TemplateError for missing variables or invalid definitions. */
export function templateError(msg: string): CalcError {
  const e = new Error(msg) as CalcError;
  e.name = 'TemplateError';
  e.code = 'TEMPLATE_ERROR';
  // Template errors are not tied to a specific expression range; use 0..0.
  e.range = { start: 0, end: 0 };
  return e;
}

