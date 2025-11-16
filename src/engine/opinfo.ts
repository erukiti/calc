/**
 * Operator metadata shared by parser and printer.
 */

import type { BinOp } from './ast';

/** Associativity of a binary operator. */
export type Assoc = 'left' | 'right';

/** Operator information: precedence and associativity. */
export type OpInfo = { prec: number; assoc: Assoc };

/**
 * Single source of truth for all binary operator rules. Higher `prec` binds
 * tighter. Right-associative operators keep the same precedence for the right
 * operand during Pratt parsing.
 */
export const OP_INFO: Record<BinOp, OpInfo> = {
  '^': { prec: 4, assoc: 'right' },
  '**': { prec: 4, assoc: 'right' },
  '*': { prec: 3, assoc: 'left' },
  '/': { prec: 3, assoc: 'left' },
  '%': { prec: 3, assoc: 'left' },
  '+': { prec: 2, assoc: 'left' },
  '-': { prec: 2, assoc: 'left' },
};

/** Convenience set to check right-associativity in formatting. */
export const RIGHT_ASSOC = new Set<BinOp>(
  (Object.keys(OP_INFO) as BinOp[]).filter(k => OP_INFO[k].assoc === 'right')
);

