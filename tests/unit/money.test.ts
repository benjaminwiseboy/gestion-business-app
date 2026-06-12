import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import {
  add,
  compare,
  formatMoney,
  isZero,
  money,
  multiply,
  subtract,
  zero,
} from "@/lib/money";
import { convert, toPivot } from "@/lib/currency";

describe("money", () => {
  it("creates a Money with Decimal precision", () => {
    const m = money("1500000.123456", "XAF");
    expect(m.amount.toString()).toBe("1500000.123456");
    expect(m.currency).toBe("XAF");
  });

  it("adds two amounts in the same currency", () => {
    const result = add(money(1000, "XAF"), money(500, "XAF"));
    expect(result.amount.equals(1500)).toBe(true);
  });

  it("refuses to add across currencies", () => {
    expect(() => add(money(1000, "XAF"), money(1, "USD"))).toThrow(
      /Currency mismatch/,
    );
  });

  it("subtract works with negative results", () => {
    const result = subtract(money(100, "USD"), money(150, "USD"));
    expect(result.amount.equals(-50)).toBe(true);
  });

  it("multiply preserves decimal precision", () => {
    const result = multiply(money("0.1", "USD"), "0.2");
    expect(result.amount.equals(new Decimal("0.02"))).toBe(true);
  });

  it("zero and isZero", () => {
    expect(isZero(zero("XAF"))).toBe(true);
    expect(isZero(money(1, "XAF"))).toBe(false);
  });

  it("compare returns standard sort order", () => {
    expect(compare(money(100, "XAF"), money(200, "XAF"))).toBeLessThan(0);
    expect(compare(money(200, "XAF"), money(100, "XAF"))).toBeGreaterThan(0);
    expect(compare(money(100, "XAF"), money(100, "XAF"))).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formats XAF without decimals (FCFA)", () => {
    const formatted = formatMoney(money(1500000, "XAF"));
    expect(formatted).toContain("1");
    expect(formatted).toContain("500");
    expect(formatted).toContain("000");
    expect(formatted).not.toContain(",00");
    expect(formatted).not.toContain(".00");
  });

  it("formats USD with 2 decimals", () => {
    const formatted = formatMoney(money(1500.5, "USD"), "en-US");
    expect(formatted).toContain("1,500.50");
  });
});

describe("currency conversion", () => {
  it("returns same money when source = target", () => {
    const m = money(1000, "XAF");
    const converted = convert(m, "XAF");
    expect(converted).toEqual(m);
  });

  it("converts USD to XAF at default rate 600", () => {
    const converted = toPivot(money(10, "USD"));
    expect(converted.currency).toBe("XAF");
    expect(converted.amount.equals(6000)).toBe(true);
  });

  it("converts XAF to USD at default rate", () => {
    const converted = convert(money(6000, "XAF"), "USD");
    expect(converted.currency).toBe("USD");
    expect(converted.amount.equals(10)).toBe(true);
  });

  it("uses provided rate snapshot, not default", () => {
    const converted = toPivot(money(10, "USD"), 650);
    expect(converted.amount.equals(6500)).toBe(true);
  });
});
