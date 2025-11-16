# Repository Guidelines

## Project Structure & Module Organization
- `src/` — TypeScript sources (e.g., `app.ts`, `calc.ts`). Co-locate tests as `*.test.ts`.
- `index.html`, `styles.css` — app shell and styles for local preview.
- `dist/` — build output (do not edit by hand).
- Config: `tsconfig.json`, `vitest.config.ts`, `wrangler.toml`.

## Build, Test, and Development Commands
- `pnpm i` — install deps (project uses pnpm; see `packageManager`).
- `pnpm dev` — start Vite dev server (opens http://localhost:5173).
- `pnpm build` — production build to `dist/` via Vite.
- `pnpm preview` — serve the build locally from `dist/`.
- `pnpm pages:dev` — Cloudflare Pages local preview from `dist/`.
- `pnpm deploy` — deploy `dist/` to Cloudflare Pages (requires Wrangler auth).
- `pnpm test` / `pnpm test:run` — run Vitest (watch / CI).

## Coding Style & Naming Conventions
- Language: TypeScript. Indent 2 spaces, keep semicolons, single quotes or consistent existing style.
- Names: functions `lowerCamelCase`, types/interfaces `PascalCase`, constants `UPPER_SNAKE_CASE`.
- Files: modules `kebab-or-camel.ts`; tests `module.test.ts` next to the module.
- Prefer small, pure functions in `src/calc.ts`; keep DOM/UI in `src/app.ts`.

## Testing Guidelines
- Framework: Vitest. Add tests for new parsing/eval behaviors in `src/*.test.ts`.
- Run a single test: `pnpm test -t "normalizeExpr"`.
- Aim for meaningful coverage on core logic; include edge cases (unicode, grouping, operator precedence).
- **プロジェクト外部のジュニアエンジニアでも絶対に読めるようにしろ**
- **サンプルで使う文字列は、その文字列を見て、ぱっと意味がわかる日本語の文字列にしろ**



## Commit & Pull Request Guidelines
- Commits: concise, imperative present (“Add power operator handling”). English or Japanese is fine; keep one logical change per commit. Commit `pnpm-lock.yaml` when deps change.
- PRs: include a short description, linked issue (e.g., `#123`), test updates, and before/after screenshots for UI changes. Ensure `pnpm build` and `pnpm test:run` pass.

## Security & Configuration Tips
- Do not commit secrets or Wrangler tokens. Local Cloudflare auth is required for `deploy`.
- Avoid changes in `dist/`; it is generated. Update source and rebuild.

## Agent-Specific Instructions
- Scope: this file governs the entire repo. Match existing style; avoid broad refactors without discussion. Prefer targeted changes, clear tests, and self-explanatory commits.

## Reporting

- 必ず、日本語の書き言葉でレポートしろ
- あるなら **必ずファイル名、ディレクトリ名、テーブル名などを明示しろ**

## 絶対命令

- ダミーコードやNO-OPの実装を絶対に禁じる。、もしどうしてもそれが必要なら、必ず作業を終了して、説明し許可を取れ
- 暗黙のフォールバックを**絶対に許さない**
- 早期失敗 fail fast しろ
- 一般論禁止。このリポジトリを対象としろ
