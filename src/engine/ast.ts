/**
 * Core AST and token type definitions for the calculator engine.
 *
 * This file is intentionally framework-agnostic: it contains only types and
 * documentation, so it can be read in isolation without any project context.
 */

import type { Decimal } from './decimal';

/** A half-open character range [start, end) within a source string. */
export type Range = { start: number; end: number };

/** Binary operator tokens supported by the language. */
export type BinOp = '+' | '-' | '*' | '/' | '%' | '^' | '**';

/**
 * Token kinds produced by the lexer. Every token carries a `range` so callers
 * can report precise error locations.
 */
export type TokNum = { type: 'num'; value: Decimal; raw: string; range: Range };
export type TokOp = { type: 'op'; op: BinOp | '+' | '-'; range: Range };
export type TokL = { type: 'lparen'; range: Range };
export type TokR = { type: 'rparen'; range: Range };
export type TokEOF = { type: 'eof'; range: Range };
export type Token = TokNum | TokOp | TokL | TokR | TokEOF;

/** AST node for a numeric literal. */
export type NumNode = { type: 'num'; value: Decimal; raw?: string; range: Range };
/** AST node for a parenthesized sub-expression. */
export type GroupNode = { type: 'group'; expr: Node; range: Range };
/** AST node for a unary prefix operator (+ or -). */
export type UnaryNode = { type: 'unary'; op: '+' | '-'; expr: Node; range: Range };
/** AST node for a binary operator expression. */
export type BinNode = { type: 'bin'; op: BinOp; left: Node; right: Node; range: Range };

/** Union type for all AST nodes. */
export type Node = NumNode | GroupNode | UnaryNode | BinNode;

/** Utility type guard for exhaustive switches. */
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${String(x)}`);
}
