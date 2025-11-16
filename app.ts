// テキストエリア計算機（TypeScript）
// - eval 不使用の簡易パーサ（Pratt）と評価器
// - 四則演算、括弧、^/**、% をサポート
// - トップレベルの + / - を分解して項ごとの途中結果を表示

type TokNum = { type: 'num'; value: number; text: string; pos: number };
type TokOp = { type: 'op'; op: BinOp | '+' | '-'; pos: number };
type TokL = { type: 'lparen'; pos: number };
type TokR = { type: 'rparen'; pos: number };
type TokEOF = { type: 'eof'; pos: number };
type Token = TokNum | TokOp | TokL | TokR | TokEOF;

type BinOp = '+' | '-' | '*' | '/' | '%' | '^' | '**';

type NumNode = { type: 'num'; value: number; text?: string; pos?: number };
type GroupNode = { type: 'group'; expr: Node; pos?: number };
type UnaryNode = { type: 'unary'; op: '+' | '-'; expr: Node; pos?: number };
type BinNode = { type: 'bin'; op: BinOp; left: Node; right: Node; pos?: number };
type Node = NumNode | GroupNode | UnaryNode | BinNode;

(() => {
  const inputEl = document.getElementById('exprInput') as HTMLTextAreaElement;
  const varsEl = document.getElementById('varsInput') as HTMLTextAreaElement;
  const statusEl = document.getElementById('statusText') as HTMLDivElement;
  const finalEl = document.getElementById('finalValue') as HTMLDivElement;
  const stepsEl = document.getElementById('stepsList') as HTMLUListElement;
  const termsOl = document.getElementById('termsList') as HTMLOListElement;
  const runningDiv = document.getElementById('runningTotals') as HTMLDivElement;

  const sample = ``;
  inputEl.value = sample;

  function debounce<T extends (...args: any[]) => void>(fn: T, ms = 200) {
    let t: number | undefined;
    return (...args: Parameters<T>) => {
      if (t != null) window.clearTimeout(t);
      t = window.setTimeout(() => fn(...args), ms);
    };
  }

  function normalizeExpr(str: string) {
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

  function templateError(msg: string) {
    const e = new Error(msg);
    (e as any).name = 'TemplateError';
    return e as Error & { name: 'TemplateError' };
  }

  function parseVariables(text: string) {
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

  function applyTemplate(src: string, vars: Map<string, string>) {
    return src.replace(/\{\{\s*([A-Za-z_][\w]*)\s*\}\}/g, (_, name: string) => {
      if (!vars.has(name)) {
        throw templateError(`テンプレート変数 "${name}" が定義されていません`);
      }
      return vars.get(name) as string;
    });
  }

  // ===== トークナイザ =====
  function tokenize(src: string): Token[] {
    const s = src;
    const tokens: Token[] = [];
    let i = 0;
    const len = s.length;
    const push = (t: Token) => tokens.push(t);

    while (i < len) {
      const ch = s[i]!;
      if (/\s/.test(ch)) { i++; continue; }

      // 数字（小数対応）
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

      // 二文字演算子
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

  function syntaxError(msg: string, src: string, pos: number) {
    const caret = makeCaret(src, pos);
    const e = new Error(`${msg} @${pos}\n${caret}`);
    (e as any).name = 'SyntaxError';
    (e as any).pos = pos;
    return e as Error & { name: 'SyntaxError'; pos: number };
  }

  function makeCaret(src: string, pos: number) {
    const before = src.slice(0, pos);
    const lineBreaks = [...before.matchAll(/\n/g)].length;
    const lines = src.split(/\n/);
    const line = lines[lineBreaks] || '';
    const prefix = lines.slice(0, lineBreaks).join('\n');
    const col = pos - prefix.length;
    return `${line}\n${' '.repeat(Math.max(0, col))}^`;
  }

  // ===== Pratt パーサ =====
  const PREC: Record<BinOp, number> = {
    '^': 4,
    '**': 4,
    '*': 3,
    '/': 3,
    '%': 3,
    '+': 2,
    '-': 2,
  };

  const RIGHT_ASSOC = new Set<BinOp>(['^', '**']);

  function parse(tokens: Token[]) {
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
      if (t.type === 'num') { next(); return { type: 'num', value: t.value, text: String(t.value), pos: t.pos }; }
      if (t.type === 'lparen') {
        next();
        const expr = parseExpression(0);
        if (peek().type !== 'rparen') throw syntaxError('対応する ) がありません', sourceFromTokens(tokens), t.pos);
        next();
        return { type: 'group', expr, pos: t.pos };
      }
      throw syntaxError('項が必要です', sourceFromTokens(tokens), (t as any).pos ?? 0);
    }

    function parseExpression(minPrec: number): Node {
      let left = parsePrimary();
      while (true) {
        const t = peek();
        if (t.type !== 'op') break;
        const prec = PREC[t.op as BinOp];
        if (prec == null || prec < minPrec) break;
        const op = t.op as BinOp;
        next();
        const nextMin = prec + (RIGHT_ASSOC.has(op) ? 0 : 1);
        const right = parseExpression(nextMin);
        left = { type: 'bin', op, left, right, pos: t.pos };
      }
      return left;
    }

    const ast = parseExpression(0);
    if (peek().type !== 'eof') {
      const t = peek();
      throw syntaxError('式の末尾に余分なトークンがあります', sourceFromTokens(tokens), (t as any).pos ?? 0);
    }
    return ast;
  }

  function sourceFromTokens(_tokens: Token[]) {
    return inputEl.value;
  }

  // ===== 評価器 =====
  function evaluate(ast: Node) {
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
  function extractTopLevelTerms(ast: Node) {
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
  function fmt(n: number) {
    if (!isFinite(n)) return String(n);
    if (Number.isInteger(n)) return String(n);
    let s = n.toFixed(12);
    s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    if (s === '-0') s = '0';
    return s;
  }

  function exprToString(node: Node): string {
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

  function needsParenUnary(n: Node) {
    return n.type === 'bin' || n.type === 'unary';
  }

  function formatMaybeParen(n: Node) {
    if (n.type === 'num') return fmt(n.value);
    return `(${exprToString(n)})`;
  }

  function renderOk({ value, steps, ast }: { value: number; steps: string[]; ast: Node; src?: string }) {
    statusEl.textContent = 'OK';
    finalEl.textContent = fmt(value);

    // 項の描画
    termsOl.innerHTML = '';
    runningDiv.innerHTML = '';
    const terms = extractTopLevelTerms(ast);
    let run = 0;
    terms.forEach((t, idx) => {
      const v = evaluate(t).value;
      const li = document.createElement('li');
      li.textContent = `項${idx + 1}: ${exprToString(t)} = ${fmt(v)}`;
      termsOl.appendChild(li);
      run += v;
      const p = document.createElement('div');
      p.textContent = `項${idx + 1} までの累計: ${fmt(run)}`;
      runningDiv.appendChild(p);
    });

    // 途中計算
    stepsEl.innerHTML = '';
    steps.forEach(s => {
      const li = document.createElement('li');
      li.textContent = s;
      stepsEl.appendChild(li);
    });
  }

  function renderErr(err: any) {
    finalEl.textContent = '—';
    termsOl.innerHTML = '';
    runningDiv.innerHTML = '';
    stepsEl.innerHTML = '';
    const label = err && err.name === 'SyntaxError' ? '構文エラー' : 'エラー';
    statusEl.textContent = `${label}: ${err?.message ?? String(err)}`;
  }

  const onInput = debounce(() => {
    const exprRaw = inputEl.value;
    const varsRaw = varsEl.value;
    try {
      const vars = parseVariables(varsRaw);
      const templated = applyTemplate(exprRaw, vars);
      const src = normalizeExpr(templated);
      const tokens = tokenize(src);
      const ast = parse(tokens);
      const { value, steps } = evaluate(ast);
      renderOk({ value, steps, ast, src });
    } catch (e) {
      renderErr(e);
    }
  }, 120);

  inputEl.addEventListener('input', onInput);
  varsEl.addEventListener('input', onInput);
  onInput();
})();

