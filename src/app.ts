import {
  applyTemplate,
  extractTopLevelTerms,
  exprToString,
  fmt,
  normalizeExpr,
  parse,
  parseVariables,
  tokenize,
  type Node,
} from './calc';

function debounce<T extends (...args: any[]) => void>(fn: T, ms = 200) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t != null) (window as any).clearTimeout(t);
    t = (window as any).setTimeout(() => fn(...args), ms);
  };
}

// Only run the UI bootstrap in a real browser document
if (typeof document !== 'undefined') {
  (function () {
    const inputEl = document.getElementById('exprInput') as HTMLTextAreaElement | null;
    const varsEl = document.getElementById('varsInput') as HTMLTextAreaElement | null;
    const statusEl = document.getElementById('statusText') as HTMLDivElement | null;
    const finalEl = document.getElementById('finalValue') as HTMLDivElement | null;
    const stepsEl = document.getElementById('stepsList') as HTMLUListElement | null;
    const termsOl = document.getElementById('termsList') as HTMLOListElement | null;
    const runningDiv = document.getElementById('runningTotals') as HTMLDivElement | null;

    if (!inputEl || !varsEl || !statusEl || !finalEl || !stepsEl || !termsOl || !runningDiv) {
      // Not on the app page (e.g., tests or different HTML); skip boot.
      return;
    }

    const sample = ``;
    inputEl.value = sample;

    function renderOk({ value, steps, ast }: { value: number; steps: string[]; ast: Node }) {
      statusEl!.textContent = 'OK';
      finalEl!.textContent = fmt(value);

      // 項の描画
      termsOl!.innerHTML = '';
      runningDiv!.innerHTML = '';
      const terms = extractTopLevelTerms(ast);
      let run = 0;
      terms.forEach((t, idx) => {
        const v = evaluate(t).value;
        const li = document.createElement('li');
        li.textContent = `項${idx + 1}: ${exprToString(t)} = ${fmt(v)}`;
        termsOl!.appendChild(li);
        run += v;
        const p = document.createElement('div');
        p.textContent = `項${idx + 1} までの累計: ${fmt(run)}`;
        runningDiv!.appendChild(p);
      });

      // 途中計算
      stepsEl!.innerHTML = '';
      steps.forEach((s) => {
        const li = document.createElement('li');
        li.textContent = s;
        stepsEl!.appendChild(li);
      });
    }

    function renderErr(err: any) {
      finalEl!.textContent = '—';
      termsOl!.innerHTML = '';
      runningDiv!.innerHTML = '';
      stepsEl!.innerHTML = '';
      const label = err && err.name === 'SyntaxError' ? '構文エラー' : 'エラー';
      statusEl!.textContent = `${label}: ${err?.message ?? String(err)}`;
    }

    function evalAst(ast: Node) {
      const mod = require('./calc') as typeof import('./calc');
      return mod.evaluate(ast);
    }

    const onInput = debounce(() => {
      const exprRaw = inputEl.value;
      const varsRaw = varsEl.value;
      try {
        const vars = parseVariables(varsRaw);
        const templated = applyTemplate(exprRaw, vars);
        const src = normalizeExpr(templated);
        const tokens = tokenize(src);
        const ast = parse(tokens, src);
        const { value, steps } = evalAst(ast);
        renderOk({ value, steps, ast });
      } catch (e) {
        renderErr(e);
      }
    }, 120);

    inputEl.addEventListener('input', onInput);
    varsEl.addEventListener('input', onInput);
    onInput();
  })();
}
