// テキストエリア計算機（モック）
// - eval 不使用の簡易パーサ（Pratt）と評価器
// - 四則演算、括弧、^/**、% をサポート
// - トップレベルの + / - を分解して項ごとの途中結果を表示

(function () {
  const inputEl = document.getElementById('exprInput');
  const statusEl = document.getElementById('statusText');
  const finalEl = document.getElementById('finalValue');
  const stepsEl = document.getElementById('stepsList');
  const termsOl = document.getElementById('termsList');
  const runningDiv = document.getElementById('runningTotals');

  const sample = ``;

  inputEl.value = sample;

  const debounce = (fn, ms = 200) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  function normalizeExpr(str) {
    // 全角・類似記号の正規化（NFKC + 置換）
    let s = (str || '').normalize('NFKC');
    s = s
      .replace(/[×✕✖]/g, '*')
      .replace(/[÷]/g, '/')
      .replace(/[−–—]/g, '-')
      .replace(/[·・]/g, '*') // よくある中点→掛け算扱い（簡易）
      .replace(/／/g, '/')
      .replace(/％/g, '%')
      .replace(/＾/g, '^')
      .replace(/￥/g, '\\')
      .replace(/[，]/g, ',');
    return s;
  }

  // ===== トークナイザ =====
  function tokenize(src) {
    const s = src;
    const tokens = [];
    let i = 0;
    const len = s.length;

    const push = (t) => tokens.push(t);

    while (i < len) {
      const ch = s[i];
      // 空白・改行はスキップ
      if (/\s/.test(ch)) { i++; continue; }

      // 数字（小数対応） 例: 123, 0.5, .75
      // カンマ区切り（桁区切り）とアンダースコアは無視して数値化
      if (/[0-9.]/.test(ch)) {
        let start = i;
        let dotCount = 0;
        if (ch === '.') { dotCount++; }
        i++;
        while (i < len) {
          const c = s[i];
          if (c === '.') {
            dotCount++;
            if (dotCount > 1) break;
            i++;
          } else if (/[0-9_,]/.test(c)) { // 数字・アンダースコア・カンマは継続
            i++;
          } else {
            break;
          }
        }
        // アンダースコアとカンマを除去して数値へ
        const text = s.slice(start, i).replace(/[_,]/g, '');
        if (text === '.' || text === '') {
          throw syntaxError('不正な数値', s, start);
        }
        push({ type: 'num', value: parseFloat(text), text, pos: start });
        continue;
      }

      // 演算子（二文字 ** 優先）
      if (s.slice(i, i + 2) === '**') {
        push({ type: 'op', op: '**', pos: i });
        i += 2; continue;
      }

      const singleOps = '+-*/%^()';
      if (singleOps.includes(ch)) {
        if (ch === '(' || ch === ')') {
          push({ type: ch === '(' ? 'lparen' : 'rparen', pos: i });
        } else {
          push({ type: 'op', op: ch, pos: i });
        }
        i++; continue;
      }

      // 未対応文字
      throw syntaxError(`未対応の文字 '${ch}'`, s, i);
    }

    push({ type: 'eof', pos: i });
    return tokens;
  }

  function syntaxError(msg, src, pos) {
    const caret = makeCaret(src, pos);
    const e = new Error(`${msg} @${pos}\n${caret}`);
    e.name = 'SyntaxError';
    e.pos = pos;
    return e;
  }

  function makeCaret(src, pos) {
    const lineBreaks = [...src.slice(0, pos).matchAll(/\n/g)].length;
    const lines = src.split(/\n/);
    const line = lines[lineBreaks] || '';
    const col = pos - (lines.slice(0, lineBreaks).join('\n').length);
    return `${line}\n${' '.repeat(Math.max(0, col))}^`;
  }

  // ===== Pratt パーサ =====
  const PREC = {
    '^': 4,
    '**': 4,
    '*': 3,
    '/': 3,
    '%': 3,
    '+': 2,
    '-': 2,
  };
  const RIGHT_ASSOC = new Set(['^', '**']);

  function parse(tokens) {
    let i = 0;
    const peek = () => tokens[i];
    const next = () => tokens[i++];

    function parsePrimary() {
      const t = peek();
      if (t.type === 'op' && (t.op === '+' || t.op === '-')) {
        // 単項演算子（連続可）
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
      throw syntaxError('項が必要です', sourceFromTokens(tokens), t.pos);
    }

    function parseExpression(minPrec) {
      let left = parsePrimary();
      while (true) {
        const t = peek();
        if (t.type !== 'op') break;
        const prec = PREC[t.op];
        if (prec == null || prec < minPrec) break;
        const op = t.op;
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
      throw syntaxError('式の末尾に余分なトークンがあります', sourceFromTokens(tokens), t.pos);
    }
    return ast;
  }

  function sourceFromTokens(tokens) {
    // トークンから元のソースを復元（簡易）
    // 今回は入力テキストを直接使うので未使用でも問題なし
    return inputEl.value;
  }

  // ===== 評価器 =====
  function evaluate(ast) {
    const steps = [];
    function evalNode(node) {
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
          let res;
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
          throw new Error('未知のノード: ' + node.type);
      }
    }
    const value = evalNode(ast);
    return { value, steps };
  }

  // トップレベルの + と - を分解して「項」を抽出
  function extractTopLevelTerms(ast) {
    const list = [];
    function pushTerm(node) { list.push(node); }
    function walk(n, sign = 1) {
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
  function fmt(n) {
    if (!isFinite(n)) return String(n);
    if (Number.isInteger(n)) return String(n);
    // 小数は12桁で丸め、末尾の0を削除
    let s = n.toFixed(12);
    s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    if (s === '-0') s = '0';
    return s;
  }

  function exprToString(node) {
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
      default: return '?';
    }
  }

  function needsParenUnary(n) {
    return n.type === 'bin' || n.type === 'unary';
  }

  function formatMaybeParen(n) {
    if (n.type === 'num') return fmt(n.value);
    return `(${exprToString(n)})`;
  }

  function renderOk({ value, steps, ast, src }) {
    statusEl.textContent = 'OK';
    finalEl.textContent = fmt(value);

    // 項の描画
    termsOl.innerHTML = '';
    runningDiv.innerHTML = '';
    const terms = extractTopLevelTerms(ast);
    let run = 0;
    terms.forEach((t, idx) => {
      // 個別に評価
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

  function renderErr(err) {
    finalEl.textContent = '—';
    termsOl.innerHTML = '';
    runningDiv.innerHTML = '';
    stepsEl.innerHTML = '';
    statusEl.textContent = `構文エラー: ${err.message}`;
  }

  const onInput = debounce(() => {
    const srcRaw = inputEl.value;
    const src = normalizeExpr(srcRaw);
    try {
      const tokens = tokenize(src);
      const ast = parse(tokens);
      const { value, steps } = evaluate(ast);
      renderOk({ value, steps, ast, src });
    } catch (e) {
      renderErr(e);
    }
  }, 120);

  inputEl.addEventListener('input', onInput);
  // 初期評価
  onInput();
})();
