/**
 * Utilities for extracting additive terms from an expression tree.
 */

import type { Node } from './ast';

/**
 * Splits an expression into top-level terms separated by + and -.
 * Negative terms are represented as a unary-minus node for clarity.
 */
export function extractTopLevelTerms(ast: Node): Node[] {
  const list: Node[] = [];
  function pushTerm(node: Node) { list.push(node); }
  function walk(n: Node, sign = 1) {
    if (n.type === 'bin' && (n.op === '+' || n.op === '-')) {
      walk(n.left, sign);
      if (n.op === '+') walk(n.right, sign); else walk(n.right, -sign);
    } else if (sign === -1) {
      pushTerm({ type: 'unary', op: '-', expr: n, range: n.range });
    } else {
      pushTerm(n);
    }
  }
  walk(ast, 1);
  return list;
}

