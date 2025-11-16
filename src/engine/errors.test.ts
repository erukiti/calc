import { describe, it, expect } from 'vitest';
import { formatCaret, syntaxError } from './errors';

/** Unit tests for errors.ts */
describe('errors', () => {
  it('formatCaret points at the range start', () => {
    const caret = formatCaret('1 + 2 * 3', { start: 4, end: 5 });
    expect(caret.split('\n')[1]!.trim().startsWith('^')).toBe(true);
  });
  it('syntaxError carries range and name', () => {
    const e = syntaxError('msg', '1+1', { start: 1, end: 2 });
    expect(e.name).toBe('SyntaxError');
    expect(e.range.start).toBe(1);
  });
});

