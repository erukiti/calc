import { describe, it, expect } from 'vitest';
import { fmt, formatNumber } from './format';

/** Unit tests for format.ts */
describe('formatNumber / fmt', () => {
  it('trims trailing zeros and keeps integers', () => {
    expect(fmt(10)).toBe('10');
    expect(formatNumber(1.2300)).toBe('1.23');
  });
  it('normalizes -0 to 0', () => {
    expect(fmt(-0)).toBe('0');
  });
});

