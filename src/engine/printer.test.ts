import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer';
import { parse } from './parser';
import { exprToString } from './printer';

/** Unit tests for printer.ts */
describe('exprToString', () => {
  it('adds parentheses based on precedence', () => {
    const src = '(1 + 2) * 3';
    const ast = parse(tokenize(src), src);
    expect(exprToString(ast)).toBe('(1 + 2) * 3');
  });
});

