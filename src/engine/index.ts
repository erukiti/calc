/**
 * Engine Barrel (Public API)
 *
 * This module aggregates and re-exports the calculator engine’s building
 * blocks so that consumers can import from `./engine` without needing to know
 * the internal file layout. It also provides a backward-friendly `evaluate`
 * helper that formats evaluation steps as strings, while the core evaluator
 * exposes `evaluateRaw` for structured steps.
 */

// Types
export type {
  Token,
  TokNum,
  TokOp,
  TokL,
  TokR,
  TokEOF,
  BinOp,
  NumNode,
  GroupNode,
  UnaryNode,
  BinNode,
  Node,
} from './ast';

// Normalization
export { normalizeExpr } from './normalize';

// Template helpers
export { parseVariables, applyTemplate, templateError } from './template';

// Lexer/Parser
export { tokenize } from './lexer';
export { parse } from './parser';

// Errors (keep the `makeCaret` legacy alias)
export { syntaxError, formatCaret as makeCaret } from './errors';

// Formatting/printing
export { fmt, formatNumber } from './format';
export { exprToString, formatMaybeParen } from './printer';

// Terms utility
export { extractTopLevelTerms } from './terms';

// Decimal helpers (公開 API として最小限のものだけを露出)
export type { Decimal } from './decimal';
export { DECIMAL_ZERO, decimalAdd } from './decimal';

// Evaluator: structured variant and convenience wrapper (re-export only)
export { evaluateRaw } from './evaluator';
export { evaluate } from './api';
