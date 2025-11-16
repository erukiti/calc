import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer';
import { parse } from './parser';

/** Unit tests for parser.ts */
describe('parse', () => {
  it('builds AST with correct precedence', () => {
    const src = '1 + 2 * 3';
    const ast = parse(tokenize(src), src);
    expect(ast).toMatchObject({ type: 'bin', op: '+', left: { type: 'num' }, right: { type: 'bin', op: '*'} });
  });
  it('respects parentheses', () => {
    const src = '(1 + 2) * 3';
    const ast = parse(tokenize(src), src);
    expect(ast).toMatchObject({ type: 'bin', op: '*', left: { type: 'group' } });
  });
});

