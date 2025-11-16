/**
 * Simple string templating helpers used to substitute named variables into an
 * expression string prior to parsing.
 */

import { templateError } from './errors';

/** Parses lines in the shape `name = value` into a Map. */
export function parseVariables(text: string): Map<string, string> {
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

/** Applies `{{ name }}` substitutions using a variable map. */
export function applyTemplate(src: string, vars: Map<string, string>): string {
  return src.replace(/\{\{\s*([A-Za-z_][\w]*)\s*\}\}/g, (_, name: string) => {
    if (!vars.has(name)) {
      throw templateError(`テンプレート変数 "${name}" が定義されていません`);
    }
    return vars.get(name) as string;
  });
}

export { templateError } from './errors';

