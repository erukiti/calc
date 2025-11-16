import { describe, it, expect } from 'vitest';
import { parseVariables, applyTemplate } from './template';

/** Unit tests for template.ts */
describe('parseVariables', () => {
  it('parses name = value pairs with whitespace', () => {
    const m = parseVariables('x = 10\ny=  5');
    expect(m.get('x')).toBe('10');
    expect(m.get('y')).toBe('5');
  });
  it('throws on invalid lines', () => {
    expect(() => parseVariables('1x = 2')).toThrow();
  });
});

describe('applyTemplate', () => {
  it('replaces {{var}} using provided map', () => {
    const vars = parseVariables('n = 7');
    expect(applyTemplate('1 + {{ n }}', vars)).toBe('1 + 7');
  });
  it('throws if variable is missing', () => {
    expect(() => applyTemplate('1 + {{ z }}', new Map())).toThrow();
  });
});

