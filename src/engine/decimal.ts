import Big from 'big.js';

/**
 * 任意精度の 10 進小数を扱うための薄いラッパー。
 * エンジン内部では生の number を使わず、このモジュールの型と関数だけを利用する。
 */

// グローバル設定: 内部計算用の桁数と丸めモードを統一する。
// - DP: 小数点以下 40 桁まで保持
// - RM: ROUND_HALF_UP（四捨五入）
Big.DP = 40;
Big.RM = Big.roundHalfUp;

/** エンジン内で使用する 10 進小数の型。 */
export type Decimal = Big;

/** 0 を表す共通インスタンス。 */
export const DECIMAL_ZERO: Decimal = new Big(0);

/** 文字列または number から Decimal を生成する。 */
export function decimalFrom(input: string | number): Decimal {
  // number を直接渡すと binary float に依存するので、基本は文字列で受ける。
  // ただし 0 や 1 などの小さな整数は number でも問題ないように明示的に許容する。
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      throw new Error('有限でない数値は Decimal に変換できません。');
    }
    if (!Number.isInteger(input)) {
      // 暗黙の誤差を避けるため、小数の number 入力は拒否する。
      throw new Error('小数の number 入力は許可されていません。文字列で渡してください。');
    }
    return new Big(input);
  }
  return new Big(input);
}

/** a + b */
export function decimalAdd(a: Decimal, b: Decimal): Decimal {
  return a.plus(b);
}

/** a - b */
export function decimalSub(a: Decimal, b: Decimal): Decimal {
  return a.minus(b);
}

/** a * b */
export function decimalMul(a: Decimal, b: Decimal): Decimal {
  return a.times(b);
}

/** a / b （0 除算は呼び出し側でエラーとして扱う） */
export function decimalDiv(a: Decimal, b: Decimal): Decimal {
  if (b.eq(0)) {
    throw new Error('0 で割ることはできません。');
  }
  return a.div(b);
}

/** a % b （Big.js の mod を利用） */
export function decimalMod(a: Decimal, b: Decimal): Decimal {
  if (b.eq(0)) {
    throw new Error('0 で割った余りは定義されていません。');
  }
  return a.mod(b);
}

/** a^b（b は整数のみ許可） */
export function decimalPow(base: Decimal, exponent: Decimal): Decimal {
  if (!exponent.round(0, Big.roundDown).eq(exponent)) {
    throw new Error('指数は整数である必要があります。');
  }
  const n = exponent.toNumber();
  if (!Number.isSafeInteger(n)) {
    throw new Error('安全に扱えないほど大きな指数です。');
  }
  return base.pow(n);
}

/** 単項マイナス（-a） */
export function decimalNeg(a: Decimal): Decimal {
  return a.times(-1);
}

/** a と b が等しいかどうか。 */
export function decimalEq(a: Decimal, b: Decimal): boolean {
  return a.eq(b);
}

/** 0 かどうか。 */
export function decimalIsZero(a: Decimal): boolean {
  return a.eq(0);
}

/** Decimal を文字列に変換する（内部型そのままの表現）。 */
export function decimalToStringRaw(a: Decimal): string {
  return a.toString();
}

