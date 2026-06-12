import Decimal from "decimal.js";

export type CurrencyCode = "XAF" | "USD";

export interface Money {
  readonly amount: Decimal;
  readonly currency: CurrencyCode;
}

const DECIMALS: Record<CurrencyCode, number> = {
  XAF: 0,
  USD: 2,
};

export function money(amount: Decimal.Value, currency: CurrencyCode): Money {
  return { amount: new Decimal(amount), currency };
}

export function zero(currency: CurrencyCode): Money {
  return money(0, currency);
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount.plus(b.amount), a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount.minus(b.amount), a.currency);
}

export function multiply(m: Money, factor: Decimal.Value): Money {
  return money(m.amount.mul(factor), m.currency);
}

export function isNegative(m: Money): boolean {
  return m.amount.isNegative();
}

export function isZero(m: Money): boolean {
  return m.amount.isZero();
}

export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.amount.cmp(b.amount);
}

export function formatMoney(m: Money, locale: string = "fr-FR"): string {
  const decimals = DECIMALS[m.currency];
  const rounded = m.amount.toDecimalPlaces(decimals).toNumber();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rounded);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(
      `Currency mismatch: ${a.currency} vs ${b.currency}. Convert before operating.`,
    );
  }
}
