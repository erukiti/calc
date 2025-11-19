/**
 * Pure evaluator for AST expressions. Produces a Decimal result and a list of
 * structured steps that the UI can format as needed.
 */

import type { Node } from './ast';
import type { Decimal } from './decimal';
import { decimalAdd, decimalDiv, decimalMod, decimalMul, decimalNeg, decimalSub, decimalPow } from './decimal';
import { evalError } from './errors';

/** One evaluation step, either unary or binary. */
export type Step =
  | { kind: 'unary'; op: '+' | '-'; operand: Decimal; result: Decimal; node: Extract<Node, { type: 'unary' }> }
  | {
      kind: 'binary';
      op: '+' | '-' | '*' | '/' | '%' | '^' | '**';
      left: Decimal;
      right: Decimal;
      result: Decimal;
      node: Extract<Node, { type: 'bin' }>;
    };

/** Evaluates an AST and returns the final value along with structured steps. */
export function evaluateRaw(ast: Node): { value: Decimal; steps: Step[] } {
  const steps: Step[] = [];

  function evalNode(node: Node): Decimal {
    switch (node.type) {
      case 'num':
        return node.value;
      case 'group':
        return evalNode(node.expr);
      case 'unary': {
        const v = evalNode(node.expr);
        const out = node.op === '-' ? decimalNeg(v) : v;
        steps.push({ kind: 'unary', op: node.op, operand: v, result: out, node });
        return out;
      }
      case 'bin': {
        const a = evalNode(node.left);
        const b = evalNode(node.right);
        const op = node.op;
        let res: Decimal;
        try {
          if (op === '+') res = decimalAdd(a, b);
          else if (op === '-') res = decimalSub(a, b);
          else if (op === '*') res = decimalMul(a, b);
          else if (op === '/') res = decimalDiv(a, b);
          else if (op === '%') res = decimalMod(a, b);
          else if (op === '^' || op === '**') res = decimalPow(a, b);
          else throw evalError('未対応の演算子です。', { start: node.range.start, end: node.range.end }, 'UNSUPPORTED_OPERATOR');
        } catch (e: any) {
          if (e && e.name === 'EvalError') {
            throw e;
          }
          // Big.js 由来などの例外は EvalError にラップする
          throw evalError(e && typeof e.message === 'string' ? e.message : '計算中にエラーが発生しました。', node.range, 'EVAL_INTERNAL');
        }
        steps.push({ kind: 'binary', op, left: a, right: b, result: res, node });
        return res;
      }
    }
  }

  const value = evalNode(ast);
  return { value, steps };
}
