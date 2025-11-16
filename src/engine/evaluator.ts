/**
 * Pure evaluator for AST expressions. Produces a numeric result and a list of
 * structured steps that the UI can format as needed.
 */

import type { Node } from './ast';

/** One evaluation step, either unary or binary. */
export type Step =
  | { kind: 'unary'; op: '+' | '-'; operand: number; result: number; node: Extract<Node, { type: 'unary' }> }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '%' | '^' | '**'; left: number; right: number; result: number; node: Extract<Node, { type: 'bin' }> };

/** Evaluates an AST and returns the final value along with structured steps. */
export function evaluateRaw(ast: Node): { value: number; steps: Step[] } {
  const steps: Step[] = [];

  function evalNode(node: Node): number {
    switch (node.type) {
      case 'num':
        return node.value;
      case 'group':
        return evalNode(node.expr);
      case 'unary': {
        const v = evalNode(node.expr);
        const out = node.op === '-' ? -v : +v;
        steps.push({ kind: 'unary', op: node.op, operand: v, result: out, node });
        return out;
      }
      case 'bin': {
        const a = evalNode(node.left);
        const b = evalNode(node.right);
        const op = node.op;
        let res: number;
        if (op === '+') res = a + b;
        else if (op === '-') res = a - b;
        else if (op === '*') res = a * b;
        else if (op === '/') res = a / b;
        else if (op === '%') res = a % b;
        else if (op === '^' || op === '**') res = Math.pow(a, b);
        else throw new Error('未対応の演算子: ' + op);
        steps.push({ kind: 'binary', op, left: a, right: b, result: res, node });
        return res;
      }
    }
  }

  const value = evalNode(ast);
  return { value, steps };
}

