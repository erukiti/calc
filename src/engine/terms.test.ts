import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer';
import { parse } from './parser';
import { extractTopLevelTerms } from './terms';

/** Unit tests for terms.ts */
describe('extractTopLevelTerms', () => {
  it('splits top-level + and - into terms', () => {
    const src = '1 + (2 * 3) - 4';
    const ast = parse(tokenize(src), src);
    const terms = extractTopLevelTerms(ast);
    expect(terms.length).toBe(3);
    // 1, (2*3), and -4 (as unary)
    expect(terms[0]!.type).toBe('num');
    expect(terms[1]!.type === 'bin' || terms[1]!.type === 'group').toBeTruthy();
    expect(terms[2]!.type).toBe('unary');
  });
});

