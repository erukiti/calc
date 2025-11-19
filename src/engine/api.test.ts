import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer';
import { parse } from './parser';
import { evaluate } from './api';
import { fmt } from './format';

/** Unit tests for api.ts (wrapper behavior) */
describe('evaluate (wrapper)', () => {
  it('returns text steps formatted from structured steps', () => {
    const src = '2+3';
    const ast = parse(tokenize(src), src);
    const { value, steps } = evaluate(ast);
    expect(fmt(value)).toBe('5');
    expect(steps.some(s => s.includes('2 + 3 = 5'))).toBe(true);
  });
});
