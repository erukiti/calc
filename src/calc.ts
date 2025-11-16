// Pure calculation/parse helpers extracted from the UI layer

export type TokNum = { type: 'num'; value: number; text: string; pos: number };
export type TokOp = { type: 'op'; op: BinOp | '+' | '-'; pos: number };
export type TokL = { type: 'lparen'; pos: number };
export type TokR = { type: 'rparen'; pos: number };
export type TokEOF = { type: 'eof'; pos: number };
export type Token = TokNum | TokOp | TokL | TokR | TokEOF;

export type BinOp = '+' | '-' | '*' | '/' | '%' | '^' | '**';

export type NumNode = { type: 'num'; value: number; text?: string; pos?: number };
export type GroupNode = { type: 'group'; expr: Node; pos?: number };
export type UnaryNode = { type: 'unary'; op: '+' | '-'; expr: Node; pos?: number };
export type BinNode = { type: 'bin'; op: BinOp; left: Node; right: Node; pos?: number };
export type Node = NumNode | GroupNode | UnaryNode | BinNode;

export function normalizeExpr(str: string) {
  let s = (str || '').normalize('NFKC');
  s = s
    .replace(/[×✕✖]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/[·・]/g, '*')
    .replace(/／/g, '/')
    .replace(/％/g, '%')
    .replace(/＾/g, '^')
    .replace(/￥/g, '\\')
    .replace(/[，]/g, ',');
  return s;
}

export function templateError(msg: string) {
  const e = new Error(msg);
  (e as any).name = 'TemplateError';
  return e as Error & { name: 'TemplateError' };
}

export function parseVariables(text: string) {
  const vars = new Map<string, string>();
  if (!text) return vars;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const m = trimmed.match(/^([A-Za-z_][\w]*)\s*=\s*(.+)$/);
    if (!m) {
      throw templateError(`変数定義 (行${idx + 1}) は name = value 形式にしてください`);
    }
    const [, key, valueRaw] = m;
    vars.set(key, valueRaw.trim());
  });
  return vars;
}

export function applyTemplate(src: string, vars: Map<string, string>) {
  return src.replace(/\{\{\s*([A-Za-z_][\w]*)\s*\}\}/g, (_, name: string) => {
    if (!vars.has(name)) {
      throw templateError(`テンプレート変数 "${name}" が定義されていません`);
    }
    return vars.get(name) as string;
  });
}

// ===== トークナイザ =====
export function tokenize(src: string): Token[] {
  const s = src;
  const tokens: Token[] = [];
  let i = 0;
  const len = s.length;
  const push = (t: Token) => tokens.push(t);

  while (i < len) {
    const ch = s[i]!;
    if (/\s/.test(ch)) { i++; continue; }

    if (/[0-9.]/.test(ch)) {
      const start = i;
      let dotCount = ch === '.' ? 1 : 0;
      i++;
      while (i < len) {
        const c = s[i]!;
        if (c === '.') {
          dotCount++;
          if (dotCount > 1) break;
          i++;
        } else if (/[0-9_,]/.test(c)) {
          i++;
        } else {
          break;
        }
      }
      const text = s.slice(start, i).replace(/[_,]/g, '');
      if (text === '.' || text === '') {
        throw syntaxError('不正な数値', s, start);
      }
      push({ type: 'num', value: parseFloat(text), text, pos: start });
      continue;
    }

    if (s.slice(i, i + 2) === '**') {
      push({ type: 'op', op: '**', pos: i });
      i += 2; continue;
    }

    const singleOps = '+-*/%^()';
    if (singleOps.includes(ch)) {
      if (ch === '(' || ch === ')') {
        push({ type: ch === '(' ? 'lparen' : 'rparen', pos: i } as TokL | TokR);
      } else {
        push({ type: 'op', op: ch as TokOp['op'], pos: i });
      }
      i++; continue;
    }

    throw syntaxError(`未対応の文字 '${ch}'`, s, i);
  }

  push({ type: 'eof', pos: i });
  return tokens;
}

export function syntaxError(msg: string, src: string, pos: number) {
  const caret = makeCaret(src, pos);
  const e = new Error(`${msg} @${pos}\n${caret}`);
  (e as any).name = 'SyntaxError';
  (e as any).pos = pos;
  return e as Error & { name: 'SyntaxError'; pos: number };
}

export function makeCaret(src: string, pos: number) {
  const before = src.slice(0, pos);
  const lineBreaks = [...before.matchAll(/\n/g)].length;
  const lines = src.split(/\n/);
  const line = lines[lineBreaks] || '';
  const prefix = lines.slice(0, lineBreaks).join('\n');
  const col = pos - prefix.length;
  return `${line}\n${' '.repeat(Math.max(0, col))}^`;
}

// ===== Pratt パーサ =====
export const PREC: Record<BinOp, number> = {
  '^': 4,
  '**': 4,
  '*': 3,
  '/': 3,
  '%': 3,
  '+': 2,
  '-': 2,
};

export const RIGHT_ASSOC = new Set<BinOp>(['^', '**']);

export function parse(tokens: Token[], srcForError: string = ''): Node {
  let i = 0;
  const peek = () => tokens[i]!;
  const next = () => tokens[i++]!;

  function parsePrimary(): Node {
    const t = peek();
    if (t.type === 'op' && (t.op === '+' || t.op === '-')) {
      next();
      const expr = parsePrimary();
      return { type: 'unary', op: t.op, expr, pos: t.pos };
    }
    if (t.type === 'num') { next(); return { type: 'num', value: (t as TokNum).value, text: String((t as TokNum).value), pos: t.pos }; }
    if (t.type === 'lparen') {
      next();
      const expr = parseExpression(0);
      if (peek().type !== 'rparen') throw syntaxError('対応する ) がありません', srcForError, (t as any).pos);
      next();
      return { type: 'group', expr, pos: t.pos };
    }
    throw syntaxError('項が必要です', srcForError, (t as any).pos ?? 0);
  }

  function parseExpression(minPrec: number): Node {
    let left = parsePrimary();
    while (true) {
      const t = peek();
      if (t.type !== 'op') break;
      const prec = PREC[(t as TokOp).op as BinOp];
      if (prec == null || prec < minPrec) break;
      const op = (t as TokOp).op as BinOp;
      next();
      const nextMin = prec + (RIGHT_ASSOC.has(op) ? 0 : 1);
      const right = parseExpression(nextMin);
      left = { type: 'bin', op, left, right, pos: (t as any).pos };
    }
    return left;
  }

  const ast = parseExpression(0);
  if (peek().type !== 'eof') {
    const t = peek();
    throw syntaxError('式の末尾に余分なトークンがあります', srcForError, (t as any).pos ?? 0);
  }
  return ast;
}

// ===== 評価器 =====
export function evaluate(ast: Node) {
  const steps: string[] = [];
  function evalNode(node: Node): number {
    switch (node.type) {
      case 'num':
        return node.value;
      case 'group': {
        const v = evalNode(node.expr);
        return v;
      }
      case 'unary': {
        const v = evalNode(node.expr);
        const out = node.op === '-' ? -v : +v;
        steps.push(`${node.op}${formatMaybeParen(node.expr)} = ${fmt(out)}`);
        return out;
      }
      case 'bin': {
        const a = evalNode(node.left);
        const b = evalNode(node.right);
        const op = node.op;
        let res: number;
        if (op === '+') res = a + b;
        else if (op === '-') res = a - b;
        else if (op === '*') res = a * b;
        else if (op === '/') res = a / b;
        else if (op === '%') res = a % b;
        else if (op === '^' || op === '**') res = Math.pow(a, b);
        else throw new Error('未対応の演算子: ' + op);
        steps.push(`${fmt(a)} ${op} ${fmt(b)} = ${fmt(res)}`);
        return res;
      }
      default:
        // @ts-expect-error exhaustive
        throw new Error('未知のノード: ' + (node as any).type);
    }
  }
  const value = evalNode(ast);
  return { value, steps };
}

// トップレベルの + と - を分解して「項」を抽出
export function extractTopLevelTerms(ast: Node) {
  const list: Node[] = [];
  function pushTerm(node: Node) { list.push(node); }
  function walk(n: Node, sign = 1) {
    if (n.type === 'bin' && (n.op === '+' || n.op === '-')) {
      walk(n.left, sign);
      if (n.op === '+') walk(n.right, sign); else walk(n.right, -sign);
    } else if (sign === -1) {
      pushTerm({ type: 'unary', op: '-', expr: n });
    } else {
      pushTerm(n);
    }
  }
  walk(ast, 1);
  return list;
}

// ===== 文字列フォーマット =====
export function fmt(n: number) {
  if (!isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  let s = n.toFixed(12);
  s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  if (s === '-0') s = '0';
  return s;
}

export function exprToString(node: Node): string {
  switch (node.type) {
    case 'num': return fmt(node.value);
    case 'group': return `(${exprToString(node.expr)})`;
    case 'unary': {
      const inner = needsParenUnary(node.expr) ? `(${exprToString(node.expr)})` : exprToString(node.expr);
      return `${node.op}${inner}`;
    }
    case 'bin': {
      const lp = PREC[node.op];
      const l = node.left;
      const r = node.right;
      const ls = (l.type === 'bin' && PREC[l.op] < lp) ? `(${exprToString(l)})` : exprToString(l);
      const rs = (r.type === 'bin' && (PREC[r.op] < lp || (PREC[r.op] === lp && !RIGHT_ASSOC.has(node.op)))) ? `(${exprToString(r)})` : exprToString(r);
      return `${ls} ${node.op} ${rs}`;
    }
  }
}

export function needsParenUnary(n: Node) {
  return n.type === 'bin' || n.type === 'unary';
}

export function formatMaybeParen(n: Node) {
  if (n.type === 'num') return fmt(n.value);
  return `(${exprToString(n)})`;
}

