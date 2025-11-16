import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer';

/** Unit tests for lexer.ts */
describe('tokenize', () => {
  it('parses numeric separators , and _ within numbers', () => {
    const [n] = tokenize('1_234,567');
    expect(n.type).toBe('num');
    if (n.type === 'num') expect(n.value).toBe(1234567);
  });
  it('recognizes exponent operator ** as a single token', () => {
    const tokens = tokenize('2**3');
    expect(tokens.map(t => t.type === 'op' ? (t as any).op : t.type)).toContain('**');
  });
});

