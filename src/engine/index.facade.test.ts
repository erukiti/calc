import { describe, it, expect } from 'vitest';
import { normalizeExpr, tokenize, parse, evaluate, fmt, exprToString, type Node } from './index';
import { decimalFrom } from './decimal';

/** Integration test for the engine barrel to ensure stable public API. */
describe('engine index facade', () => {
  it('parses and evaluates expression via facade', () => {
    const src = '2**3 + 1';
    const n = normalizeExpr(src);
    const ast: Node = parse(tokenize(n), n);
    const { value, steps } = evaluate(ast);
    expect(fmt(value)).toBe('9');
    expect(steps.some(s => s.includes('2 ** 3 = 8'))).toBe(true);
  });
  it('exposes fmt and exprToString', () => {
    const src = '(1 + 2) * 3';
    const ast: Node = parse(tokenize(src), src);
    expect(exprToString(ast)).toBe('(1 + 2) * 3');
    expect(fmt(decimalFrom(10))).toBe('10');
  });
});
