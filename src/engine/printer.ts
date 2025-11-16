/**
 * Pure presentation helpers to convert AST and evaluation steps to strings.
 */

import type { Node } from './ast';
import { OP_INFO, RIGHT_ASSOC } from './opinfo';
import { formatNumber as fmt } from './format';
import type { Step } from './evaluator';

/** Returns a string for an expression, inserting parentheses as needed. */
export function exprToString(node: Node): string {
  switch (node.type) {
    case 'num':
      return fmt(node.value);
    case 'group':
      return `(${exprToString(node.expr)})`;
    case 'unary': {
      const inner = needsParenUnary(node.expr) ? `(${exprToString(node.expr)})` : exprToString(node.expr);
      return `${node.op}${inner}`;
    }
    case 'bin': {
      const lp = OP_INFO[node.op].prec;
      const l = node.left;
      const r = node.right;
      const ls = (l.type === 'bin' && OP_INFO[l.op].prec < lp) ? `(${exprToString(l)})` : exprToString(l);
      const rs = (r.type === 'bin' && (OP_INFO[r.op].prec < lp || (OP_INFO[r.op].prec === lp && !RIGHT_ASSOC.has(node.op)))) ? `(${exprToString(r)})` : exprToString(r);
      return `${ls} ${node.op} ${rs}`;
    }
  }
}

/** True if a unary operand must be wrapped in parentheses for printing. */
export function needsParenUnary(n: Node): boolean {
  return n.type === 'bin' || n.type === 'unary';
}

/** Formats a node, wrapping with parentheses when not a simple number. */
export function formatMaybeParen(n: Node): string {
  if (n.type === 'num') return fmt(n.value);
  return `(${exprToString(n)})`;
}

/**
 * Formats a structured evaluation step into a human-readable string.
 * Keeps the original UI behavior while allowing evaluator to stay pure.
 */
export function formatStep(step: Step): string {
  if (step.kind === 'unary') {
    return `${step.op}${formatMaybeParen(step.node.expr)} = ${fmt(step.result)}`;
  }
  return `${fmt(step.left)} ${step.op} ${fmt(step.right)} = ${fmt(step.result)}`;
}

