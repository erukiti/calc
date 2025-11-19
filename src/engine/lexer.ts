/**
 * Lexer: turns a normalized input string into a stream of tokens.
 */

import type { Token, TokNum, TokOp, TokL, TokR, TokEOF } from './ast';
import { syntaxError } from './errors';
import { decimalFrom } from './decimal';

/** Tokenizes the given source string into a token array. */
export function tokenize(src: string): Token[] {
  const s = src;
  const tokens: Token[] = [];
  let i = 0;
  const len = s.length;

  const push = (t: Token) => tokens.push(t);

  while (i < len) {
    const ch = s[i]!;
    if (/\s/.test(ch)) { i++; continue; }

    // Number literal: digits, underscores or commas as separators, and at most one dot.
    if (/[0-9.]/.test(ch)) {
      const start = i;
      let dotCount = ch === '.' ? 1 : 0;
      i++;
      while (i < len) {
        const c = s[i]!;
        if (c === '.') {
          dotCount++;
          if (dotCount > 1) break;
          i++;
        } else if (/[0-9_,]/.test(c)) {
          i++;
        } else {
          break;
        }
      }
      const raw = s.slice(start, i);
      const cleaned = raw.replace(/[_,]/g, '');
      if (cleaned === '.' || cleaned === '') {
        throw syntaxError('不正な数値', s, { start, end: i });
      }
      let value;
      try {
        value = decimalFrom(cleaned);
      } catch {
        throw syntaxError('不正な数値', s, { start, end: i });
      }
      const tok: TokNum = { type: 'num', value, raw, range: { start, end: i } };
      push(tok);
      continue;
    }

    // Power operator ** must be recognized as a single token.
    if (s.slice(i, i + 2) === '**') {
      const tok: TokOp = { type: 'op', op: '**', range: { start: i, end: i + 2 } };
      push(tok);
      i += 2; continue;
    }

    const singleOps = '+-*/%^()';
    if (singleOps.includes(ch)) {
      if (ch === '(' || ch === ')') {
        const tok = { type: ch === '(' ? 'lparen' : 'rparen', range: { start: i, end: i + 1 } } as TokL | TokR;
        push(tok);
      } else {
        const tok: TokOp = { type: 'op', op: ch as TokOp['op'], range: { start: i, end: i + 1 } };
        push(tok);
      }
      i++; continue;
    }

    throw syntaxError(`未対応の文字 '${ch}'`, s, { start: i, end: i + 1 });
  }

  const eof: TokEOF = { type: 'eof', range: { start: i, end: i } };
  push(eof);
  return tokens;
}
