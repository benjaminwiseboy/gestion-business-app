import Decimal from "decimal.js";
import { type CurrencyCode, type Money, money } from "./money";

export const PIVOT_CURRENCY: CurrencyCode = "XOF";

export const DEFAULT_RATES: Record<CurrencyCode, Decimal> = {
  XOF: new Decimal(1),
  USD: new Decimal(600),
};

export function convert(
  source: Money,
  target: CurrencyCode,
  rateToPivot: Decimal.Value = DEFAULT_RATES[source.currency],
  targetRateToPivot: Decimal.Value = DEFAULT_RATES[target],
): Money {
  if (source.currency === target) return source;
  const inPivot = source.amount.mul(rateToPivot);
  const inTarget = inPivot.div(targetRateToPivot);
  return money(inTarget, target);
}

export function toPivot(
  source: Money,
  rateToPivot: Decimal.Value = DEFAULT_RATES[source.currency],
): Money {
  return convert(source, PIVOT_CURRENCY, rateToPivot, 1);
}
