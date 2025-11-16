import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer';
import { parse } from './parser';
import { evaluateRaw } from './evaluator';

/** Unit tests for evaluator.ts */
describe('evaluateRaw', () => {
  it('evaluates simple binary ops', () => {
    const ast = parse(tokenize('2+3'), '2+3');
    expect(evaluateRaw(ast).value).toBe(5);
  });
  it('evaluates unary minus', () => {
    const ast = parse(tokenize('-5'), '-5');
    expect(evaluateRaw(ast).value).toBe(-5);
  });
  it('evaluates power operators ^ and **', () => {
    const ast1 = parse(tokenize('2^3'), '2^3');
    const ast2 = parse(tokenize('2**3'), '2**3');
    expect(evaluateRaw(ast1).value).toBe(8);
    expect(evaluateRaw(ast2).value).toBe(8);
  });
});

