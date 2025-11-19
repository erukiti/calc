export type SheetId = string;

export interface SheetMeta {
  id: SheetId;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface SheetState {
  expr: string;
  vars: string;
}

export interface SheetIndex {
  version: 1;
  sheets: SheetMeta[];
}

export interface SheetSnapshot {
  version: 1;
  meta: SheetMeta;
  state: SheetState;
}

const INDEX_KEY = 'calc-sheet-index';
const SHEET_KEY_PREFIX = 'calc-sheet:';
const INDEX_VERSION = 1;
const SHEET_VERSION = 1;

function getStorage(): Storage {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('localStorage が利用できない環境です。');
  }
  return window.localStorage;
}

function sheetKey(id: SheetId): string {
  if (!id) {
    throw new Error('空のシートIDが指定されました。');
  }
  return `${SHEET_KEY_PREFIX}${id}`;
}

function parseJson<T>(raw: string, key: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`localStorage のキー "${key}" の JSON が壊れています。`);
  }
}

function normalizeMeta(meta: any): SheetMeta {
  if (!meta || typeof meta !== 'object') {
    throw new Error('シート情報の形式が不正です。');
  }
  const { id, title, createdAt, updatedAt } = meta as {
    id?: unknown;
    title?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };

  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('シート情報のIDが不正です。');
  }
  if (typeof title !== 'string') {
    throw new Error('シート情報のタイトルの型が不正です。');
  }
  if (typeof createdAt !== 'string' || createdAt.length === 0) {
    throw new Error('シート情報の作成日時が不正です。');
  }
  if (typeof updatedAt !== 'string' || updatedAt.length === 0) {
    throw new Error('シート情報の更新日時が不正です。');
  }

  return { id, title, createdAt, updatedAt };
}

function assertIndexVersion(index: SheetIndex, key: string): void {
  if (index.version !== INDEX_VERSION) {
    throw new Error(
      `シート一覧のバージョンが一致しません (key=${key}, expected=${INDEX_VERSION}, actual=${String(
        (index as any).version,
      )})。`,
    );
  }
}

function assertSnapshotVersion(snapshot: SheetSnapshot, key: string): void {
  if (snapshot.version !== SHEET_VERSION) {
    throw new Error(
      `計算シートのバージョンが一致しません (key=${key}, expected=${SHEET_VERSION}, actual=${String(
        (snapshot as any).version,
      )})。`,
    );
  }
}

function readIndex(): SheetIndex {
  const storage = getStorage();
  const raw = storage.getItem(INDEX_KEY);

  if (raw == null) {
    // 初期状態（シート0枚）のインデックスを明示的に返す。
    return { version: INDEX_VERSION, sheets: [] };
  }

  const index = parseJson<SheetIndex>(raw, INDEX_KEY);
  assertIndexVersion(index, INDEX_KEY);

  if (!Array.isArray(index.sheets)) {
    throw new Error('シート一覧の形式が不正です。');
  }

  return {
    version: INDEX_VERSION,
    sheets: index.sheets.map(normalizeMeta),
  };
}

function writeIndex(index: SheetIndex): void {
  const storage = getStorage();
  const payload: SheetIndex = {
    version: INDEX_VERSION,
    sheets: index.sheets.map(normalizeMeta),
  };
  storage.setItem(INDEX_KEY, JSON.stringify(payload));
}

function readSnapshot(id: SheetId): SheetSnapshot {
  const storage = getStorage();
  const key = sheetKey(id);
  const raw = storage.getItem(key);
  if (raw == null) {
    throw new Error('指定された計算シートが見つかりません。');
  }
  const snapshot = parseJson<SheetSnapshot>(raw, key);
  assertSnapshotVersion(snapshot, key);
  if (!snapshot.meta || snapshot.meta.id !== id) {
    throw new Error('計算シートのメタ情報とIDが一致しません。');
  }
  if (
    !snapshot.state ||
    typeof snapshot.state.expr !== 'string' ||
    typeof snapshot.state.vars !== 'string'
  ) {
    throw new Error('計算シートの状態の形式が不正です。');
  }
  return snapshot;
}

function writeSnapshot(snapshot: SheetSnapshot): void {
  const storage = getStorage();
  const key = sheetKey(snapshot.meta.id);
  const payload: SheetSnapshot = {
    version: SHEET_VERSION,
    meta: normalizeMeta(snapshot.meta),
    state: {
      expr: snapshot.state.expr,
      vars: snapshot.state.vars,
    },
  };
  storage.setItem(key, JSON.stringify(payload));
}

function generateSheetId(): SheetId {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('このブラウザはランダムID生成に対応していません。');
  }
  return crypto.randomUUID();
}

export function listSheets(): SheetMeta[] {
  const index = readIndex();
  return [...index.sheets];
}

export function loadSheet(id: SheetId): SheetSnapshot {
  return readSnapshot(id);
}

export function createSheet(params?: {
  title?: string;
  initialState?: SheetState;
}): SheetSnapshot {
  const id = generateSheetId();
  const now = new Date().toISOString();
  const title = (params?.title ?? '').trim();
  const state: SheetState = params?.initialState ?? { expr: '', vars: '' };

  const meta: SheetMeta = {
    id,
    title,
    createdAt: now,
    updatedAt: now,
  };

  const snapshot: SheetSnapshot = {
    version: SHEET_VERSION,
    meta,
    state,
  };

  const index = readIndex();
  const nextIndex: SheetIndex = {
    version: INDEX_VERSION,
    sheets: [...index.sheets, meta],
  };

  writeSnapshot(snapshot);
  writeIndex(nextIndex);

  return snapshot;
}

export function saveSheetState(id: SheetId, state: SheetState): SheetSnapshot {
  const index = readIndex();
  const metaIndex = index.sheets.findIndex((m) => m.id === id);
  if (metaIndex === -1) {
    throw new Error('シート一覧に存在しないIDが指定されました。');
  }

  const prevSnapshot = readSnapshot(id);
  const now = new Date().toISOString();
  const updatedMeta: SheetMeta = {
    ...prevSnapshot.meta,
    updatedAt: now,
  };

  const snapshot: SheetSnapshot = {
    version: SHEET_VERSION,
    meta: updatedMeta,
    state: {
      expr: state.expr,
      vars: state.vars,
    },
  };

  const nextIndex: SheetIndex = {
    version: INDEX_VERSION,
    sheets: index.sheets.map((m, i) => (i === metaIndex ? updatedMeta : m)),
  };

  writeSnapshot(snapshot);
  writeIndex(nextIndex);

  return snapshot;
}

export function saveSheetTitle(id: SheetId, title: string): SheetSnapshot {
  const index = readIndex();
  const metaIndex = index.sheets.findIndex((m) => m.id === id);
  if (metaIndex === -1) {
    throw new Error('シート一覧に存在しないIDが指定されました。');
  }

  const prevSnapshot = readSnapshot(id);
  const now = new Date().toISOString();
  const nextTitle = title.trim();

  const updatedMeta: SheetMeta = {
    ...prevSnapshot.meta,
    title: nextTitle,
    updatedAt: now,
  };

  const snapshot: SheetSnapshot = {
    version: SHEET_VERSION,
    meta: updatedMeta,
    state: prevSnapshot.state,
  };

  const nextIndex: SheetIndex = {
    version: INDEX_VERSION,
    sheets: index.sheets.map((m, i) => (i === metaIndex ? updatedMeta : m)),
  };

  writeSnapshot(snapshot);
  writeIndex(nextIndex);

  return snapshot;
}
