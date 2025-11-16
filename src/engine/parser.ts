/**
 * Pratt parser that builds an AST from tokens.
 */

import type { Token, TokNum, TokOp, TokL, TokR, Node, NumNode, GroupNode, UnaryNode, BinNode } from './ast';
import { OP_INFO } from './opinfo';
import { syntaxError } from './errors';

/** Parses a token array into an AST. `srcForError` is used to report positions. */
export function parse(tokens: Token[], srcForError: string = ''): Node {
  let i = 0;
  const peek = () => tokens[i]!;
  const next = () => tokens[i++]!;

  function parsePrimary(): Node {
    const t = peek();
    if (t.type === 'op' && (t.op === '+' || t.op === '-')) {
      const opTok = next() as TokOp;
      const expr = parsePrimary();
      const node: UnaryNode = { type: 'unary', op: opTok.op, expr, range: { start: opTok.range.start, end: expr.range.end } };
      return node;
    }
    if (t.type === 'num') {
      const n = next() as TokNum;
      const node: NumNode = { type: 'num', value: n.value, raw: String(n.value), range: { ...n.range } };
      return node;
    }
    if (t.type === 'lparen') {
      const l = next() as TokL;
      const expr = parseExpression(0);
      if (peek().type !== 'rparen') throw syntaxError('対応する ) がありません', srcForError, l.range);
      const r = next() as TokR;
      const node: GroupNode = { type: 'group', expr, range: { start: l.range.start, end: r.range.end } };
      return node;
    }
    throw syntaxError('項が必要です', srcForError, t.range);
  }

  function parseExpression(minPrec: number): Node {
    let left = parsePrimary();
    while (true) {
      const t = peek();
      if (t.type !== 'op') break;
      const info = OP_INFO[(t as TokOp).op as keyof typeof OP_INFO];
      if (!info || info.prec < minPrec) break;
      const opTok = next() as TokOp;
      const nextMin = info.prec + (info.assoc === 'right' ? 0 : 1);
      const right = parseExpression(nextMin);
      const node: BinNode = {
        type: 'bin',
        op: opTok.op as any,
        left,
        right,
        range: { start: left.range.start, end: right.range.end },
      };
      left = node;
    }
    return left;
  }

  const ast = parseExpression(0);
  if (peek().type !== 'eof') {
    const t = peek();
    throw syntaxError('式の末尾に余分なトークンがあります', srcForError, t.range);
  }
  return ast;
}

