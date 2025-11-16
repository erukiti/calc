/**
 * Public convenience helpers that compose multiple engine modules.
 *
 * Rationale: keep `index.ts` as a pure barrel (re-exports only) and place any
 * thin wrappers that span modules in this file. This respects the rule that the
 * barrel should not contain implementation logic.
 */

import type { Node } from './ast';
import { evaluateRaw } from './evaluator';
import { formatStep } from './printer';

/**
 * Evaluates an AST and returns a numeric value and human-readable steps.
 * - For structured (machine-readable) steps, prefer `evaluateRaw`.
 * - This wrapper exists for compatibility with UIs that expect formatted text.
 */
export function evaluate(ast: Node): { value: number; steps: string[] } {
  const { value, steps } = evaluateRaw(ast);
  return { value, steps: steps.map(formatStep) };
}

