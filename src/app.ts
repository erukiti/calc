/**
 * UI bootstrap for the calculator demo.
 *
 * This file wires DOM elements to the pure calculation engine exposed from
 * `./engine`. It deliberately performs only UI concerns (reading inputs,
 * rendering outputs) and delegates all parsing/evaluation/formatting to the
 * engine. All imports are static import declarations as required.
 */
import {
  applyTemplate,
  extractTopLevelTerms,
  exprToString,
  fmt,
  normalizeExpr,
  parse,
  parseVariables,
  tokenize,
  evaluate,
  type Node,
} from './engine';
import {
  createSheet,
  listSheets,
  loadSheet,
  saveSheetState,
  saveSheetTitle,
  type SheetId,
  type SheetState,
  type SheetMeta,
} from './sheet-store';

type Route =
  | { kind: 'index' }
  | { kind: 'sheet'; id: SheetId }
  | { kind: 'invalid'; reason: string };

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
    const appEl = document.getElementById('app') as HTMLDivElement | null;
    const titleInput = document.getElementById('sheetTitleInput') as HTMLInputElement | null;
    const inputEl = document.getElementById('exprInput') as HTMLTextAreaElement | null;
    const varsEl = document.getElementById('varsInput') as HTMLTextAreaElement | null;
    const statusEl = document.getElementById('statusText') as HTMLDivElement | null;
    const finalEl = document.getElementById('finalValue') as HTMLDivElement | null;
    const stepsEl = document.getElementById('stepsList') as HTMLUListElement | null;
    const termsOl = document.getElementById('termsList') as HTMLOListElement | null;
    const runningDiv = document.getElementById('runningTotals') as HTMLDivElement | null;
    const leftPane = document.querySelector<HTMLElement>('.pane.left');
    const rightPane = document.querySelector<HTMLElement>('.pane.right');

    if (
      !appEl ||
      !titleInput ||
      !inputEl ||
      !varsEl ||
      !statusEl ||
      !finalEl ||
      !stepsEl ||
      !termsOl ||
      !runningDiv ||
      !leftPane ||
      !rightPane
    ) {
      throw new Error('計算機アプリのDOM構造が想定と異なります。');
    }

    function formatDateTime(iso: string): string {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) {
        return iso;
      }
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${hh}:${mm}`;
    }

    // 計算シート一覧ビューを動的に構築する
    const listRoot = document.createElement('div');
    listRoot.id = 'sheetListView';
    listRoot.style.flex = '1 1 auto';
    listRoot.style.padding = '10px';
    listRoot.style.overflow = 'auto';
    listRoot.style.display = 'none';

    const listPanel = document.createElement('div');
    listPanel.className = 'panel';

    const listTitle = document.createElement('div');
    listTitle.className = 'panel-title';
    listTitle.textContent = '計算シート一覧';
    listPanel.appendChild(listTitle);

    const listStatus = document.createElement('div');
    listStatus.id = 'sheetListStatus';
    listStatus.className = 'help';
    listPanel.appendChild(listStatus);

    const listEl = document.createElement('ul');
    listEl.id = 'sheetList';
    listEl.className = 'steps';
    listPanel.appendChild(listEl);

    const newButton = document.createElement('button');
    newButton.id = 'newSheetButton';
    newButton.type = 'button';
    newButton.textContent = '新しい計算シートを作る';
    listPanel.appendChild(newButton);

    listRoot.appendChild(listPanel);
    appEl.appendChild(listRoot);

    let currentSheetId: SheetId | null = null;

    function resetTitleInputForIndex(): void {
      titleInput.value = '';
      titleInput.disabled = true;
      titleInput.placeholder = 'シートを選ぶとタイトルを編集できます（任意）';
    }

    function applyTitleFromMeta(meta: SheetMeta): void {
      titleInput.disabled = false;
      titleInput.value = meta.title;
      titleInput.placeholder = 'シートのタイトル（任意）';
    }

    function showSheetUi(): void {
      listRoot.style.display = 'none';
      leftPane.style.display = '';
      rightPane.style.display = '';
    }

    function showListUi(): void {
      listRoot.style.display = 'block';
      leftPane.style.display = 'none';
      rightPane.style.display = 'none';
    }

    function renderOk({ value, steps, ast }: { value: number; steps: string[]; ast: Node }) {
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
      steps.forEach((s) => {
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

    const onTitleInput = debounce(() => {
      if (!currentSheetId) {
        return;
      }
      try {
        saveSheetTitle(currentSheetId, titleInput.value);
      } catch (e: any) {
        const msg = e && typeof e.message === 'string' ? e.message : String(e);
        statusEl.textContent = `タイトル保存エラー: ${msg}`;
      }
    }, 300);

    titleInput.addEventListener('input', onTitleInput);

    function persistCurrentSheet(exprRaw: string, varsRaw: string): void {
      if (!currentSheetId) {
        return;
      }
      const state: SheetState = { expr: exprRaw, vars: varsRaw };
      try {
        saveSheetState(currentSheetId, state);
      } catch (e: any) {
        const msg = e && typeof e.message === 'string' ? e.message : String(e);
        statusEl.textContent = `保存エラー: ${msg}`;
      }
    }

    function handleInputChange(): void {
      const exprRaw = inputEl.value;
      const varsRaw = varsEl.value;
      try {
        const vars = parseVariables(varsRaw);
        const templated = applyTemplate(exprRaw, vars);
        const src = normalizeExpr(templated);
        const tokens = tokenize(src);
        const ast = parse(tokens, src);
        const { value, steps } = evaluate(ast);
        renderOk({ value, steps, ast });
      } catch (e) {
        renderErr(e);
      }
      persistCurrentSheet(exprRaw, varsRaw);
    }

    const onInput = debounce(handleInputChange, 120);

    function renderSheetIndex(message?: string): void {
      showListUi();
      resetTitleInputForIndex();
      listStatus.textContent =
        message ?? '保存されている計算シートの一覧です。クリックして開きます。';
      listEl.innerHTML = '';

      let metas: SheetMeta[];
      try {
        metas = listSheets();
      } catch (e: any) {
        const msg = e && typeof e.message === 'string' ? e.message : String(e);
        const li = document.createElement('li');
        li.textContent = `一覧の読み込みに失敗しました: ${msg}`;
        listEl.appendChild(li);
        return;
      }

      if (metas.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'まだ計算シートがありません。下のボタンから作成できます。';
        listEl.appendChild(li);
        return;
      }

      metas
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .forEach((meta) => {
          const displayTitle =
            meta.title.trim().length > 0 ? meta.title : '（タイトル未設定）';
          const li = document.createElement('li');
          li.textContent = `${displayTitle}（最終更新: ${formatDateTime(meta.updatedAt)}）`;
          li.style.cursor = 'pointer';
          li.addEventListener('click', () => {
            window.location.hash = `#/sheets/${meta.id}`;
          });
          listEl.appendChild(li);
        });
    }

    function openSheet(id: SheetId): void {
      let snapshot;
      try {
        snapshot = loadSheet(id);
      } catch (e: any) {
        const msg = e && typeof e.message === 'string' ? e.message : String(e);
        renderSheetIndex(`シートの読み込みに失敗しました: ${msg}`);
        return;
      }
      currentSheetId = snapshot.meta.id;
      showSheetUi();
      applyTitleFromMeta(snapshot.meta);
      inputEl.value = snapshot.state.expr;
      varsEl.value = snapshot.state.vars;
      handleInputChange();
    }

    function parseRoute(hash: string): Route {
      if (!hash || hash === '#' || hash === '#/') {
        return { kind: 'index' };
      }
      if (hash.startsWith('#/sheets/')) {
        const id = hash.slice('#/sheets/'.length);
        if (!id) {
          return { kind: 'invalid', reason: 'シートIDが指定されていません。' };
        }
        return { kind: 'sheet', id };
      }
      return { kind: 'invalid', reason: '不正なURLです。' };
    }

    function applyRoute(route: Route): void {
      if (route.kind === 'index') {
        currentSheetId = null;
        renderSheetIndex();
        return;
      }
      if (route.kind === 'sheet') {
        openSheet(route.id);
        return;
      }
      renderSheetIndex(route.reason);
    }

    function handleHashChange(): void {
      const route = parseRoute(window.location.hash);
      applyRoute(route);
    }

    newButton.addEventListener('click', () => {
      let snapshot;
      try {
        snapshot = createSheet({
          initialState: { expr: '', vars: '' },
        });
      } catch (e: any) {
        const msg = e && typeof e.message === 'string' ? e.message : String(e);
        renderSheetIndex(`シートの作成に失敗しました: ${msg}`);
        return;
      }
      window.location.hash = `#/sheets/${snapshot.meta.id}`;
    });

    inputEl.addEventListener('input', onInput);
    varsEl.addEventListener('input', onInput);

    window.addEventListener('hashchange', handleHashChange);

    handleHashChange();
  })();
}
