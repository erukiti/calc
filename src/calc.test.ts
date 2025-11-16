import {
  normalizeExpr,
  tokenize,
  parse,
  evaluate,
  parseVariables,
  applyTemplate,
  extractTopLevelTerms,
  fmt,
  exprToString,
  type Node,
} from './calc';

// normalizeExpr
describe('normalizeExpr', () => {
  it('replaces multiplication/division glyphs and minus', () => {
    expect(normalizeExpr('2×3÷6−1')).toBe('2*3/6-1');
  });
  it('NFKC normalizes full-width digits/symbols', () => {
    expect(normalizeExpr('１２３＋４')).toBe('123+4');
  });
});

// tokenize
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

// parse
describe('parse', () => {
  it('builds AST with correct precedence', () => {
    const src = '1 + 2 * 3';
    const ast = parse(tokenize(src), src);
    expect(ast).toMatchObject({ type: 'bin', op: '+', left: { type: 'num' }, right: { type: 'bin', op: '*'} });
  });
  it('respects parentheses', () => {
    const src = '(1 + 2) * 3';
    const ast = parse(tokenize(src), src);
    expect(ast).toMatchObject({ type: 'bin', op: '*', left: { type: 'group' } });
  });
});

// evaluate
describe('evaluate', () => {
  const num = (v: number): Node => ({ type: 'num', value: v });
  it('evaluates simple binary ops', () => {
    const ast: Node = { type: 'bin', op: '+', left: num(2), right: num(3) } as const;
    expect(evaluate(ast).value).toBe(5);
  });
  it('evaluates unary minus', () => {
    const ast: Node = { type: 'unary', op: '-', expr: num(5) } as const;
    expect(evaluate(ast).value).toBe(-5);
  });
  it('evaluates power operators ^ and **', () => {
    const ast1: Node = parse(tokenize('2^3'), '2^3');
    const ast2: Node = parse(tokenize('2**3'), '2**3');
    expect(evaluate(ast1).value).toBe(8);
    expect(evaluate(ast2).value).toBe(8);
  });
});

// parseVariables
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

// applyTemplate
describe('applyTemplate', () => {
  it('replaces {{var}} using provided map', () => {
    const vars = parseVariables('n = 7');
    expect(applyTemplate('1 + {{ n }}', vars)).toBe('1 + 7');
  });
  it('throws if variable is missing', () => {
    expect(() => applyTemplate('1 + {{ z }}', new Map())).toThrow();
  });
});

// extractTopLevelTerms
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

// fmt
describe('fmt', () => {
  it('trims trailing zeros and keeps integers', () => {
    expect(fmt(10)).toBe('10');
    expect(fmt(1.2300)).toBe('1.23');
  });
  it('normalizes -0 to 0', () => {
    expect(fmt(-0)).toBe('0');
  });
});

// exprToString
describe('exprToString', () => {
  it('adds parentheses based on precedence', () => {
    const src = '(1 + 2) * 3';
    const ast = parse(tokenize(src), src);
    expect(exprToString(ast)).toBe('(1 + 2) * 3');
  });
});

