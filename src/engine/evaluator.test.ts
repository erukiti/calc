import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer';
import { parse } from './parser';
import { evaluateRaw } from './evaluator';
import { fmt } from './format';

/** Unit tests for evaluator.ts */
describe('evaluateRaw', () => {
  it('evaluates simple binary ops', () => {
    const ast = parse(tokenize('2+3'), '2+3');
    const { value } = evaluateRaw(ast);
    expect(fmt(value)).toBe('5');
  });
  it('evaluates unary minus', () => {
    const ast = parse(tokenize('-5'), '-5');
    const { value } = evaluateRaw(ast);
    expect(fmt(value)).toBe('-5');
  });
  it('evaluates power operators ^ and **', () => {
    const ast1 = parse(tokenize('2^3'), '2^3');
    const ast2 = parse(tokenize('2**3'), '2**3');
    const v1 = evaluateRaw(ast1).value;
    const v2 = evaluateRaw(ast2).value;
    expect(fmt(v1)).toBe('8');
    expect(fmt(v2)).toBe('8');
  });
  it('handles decimal addition without binary float error', () => {
    const src = '0.1 + 0.2';
    const ast = parse(tokenize(src), src);
    const { value } = evaluateRaw(ast);
    expect(fmt(value)).toBe('0.3');
  });
});
