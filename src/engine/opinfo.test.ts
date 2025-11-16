import { describe, it, expect } from 'vitest';
import { OP_INFO, RIGHT_ASSOC } from './opinfo';

/** Unit tests for opinfo.ts */
describe('OP_INFO', () => {
  it('has higher precedence for * than +', () => {
    expect(OP_INFO['*'].prec).toBeGreaterThan(OP_INFO['+'].prec);
  });
  it('marks ** as right-associative', () => {
    expect(RIGHT_ASSOC.has('**' as any)).toBe(true);
  });
});

