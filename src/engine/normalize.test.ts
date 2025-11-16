import { describe, it, expect } from 'vitest';
import { normalizeExpr } from './normalize';

/** Unit tests for normalize.ts */
describe('normalizeExpr', () => {
  it('replaces multiplication/division glyphs and minus', () => {
    expect(normalizeExpr('2×3÷6−1')).toBe('2*3/6-1');
  });
  it('NFKC normalizes full-width digits/symbols', () => {
    expect(normalizeExpr('１２３＋４')).toBe('123+4');
  });
});

