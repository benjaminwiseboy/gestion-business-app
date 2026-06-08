import { describe, expect, it } from "vitest";
import {
  calculateAccruedInterest,
  calculateRemaining,
  deriveStatus,
  sumRepayments,
} from "@/domain/loans";
import type { Tables } from "@/lib/supabase/types";

type Loan = Tables<"loans">;
type Transaction = Tables<"transactions">;

const LOAN_ID = "11111111-1111-1111-1111-111111111111";

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: LOAN_ID,
    owner_id: "owner-1",
    person_id: "p1",
    direction: "lent",
    principal_amount: 100000,
    principal_currency: "XOF",
    interest_rate: null,
    interest_type: null,
    issue_date: "2026-01-01",
    due_date: null,
    status: "active",
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  };
}

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "tx-1",
    owner_id: "owner-1",
    kind: "repayment",
    amount: 0,
    currency: "XOF",
    exchange_rate_snapshot: 1,
    occurred_at: "2026-01-15",
    person_id: "p1",
    linked_entity_type: "loan",
    linked_entity_id: LOAN_ID,
    notes: null,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
    deleted_at: null,
    ...overrides,
  };
}

describe("sumRepayments", () => {
  it("sums only repayment transactions linked to this loan", () => {
    const loan = makeLoan();
    const txs = [
      makeTx({ amount: 30000 }),
      makeTx({ id: "tx-2", amount: 10000 }),
      makeTx({ id: "tx-3", amount: 9999, kind: "fee" }),
      makeTx({ id: "tx-4", amount: 50000, linked_entity_id: "other-loan" }),
      makeTx({ id: "tx-5", amount: 7000, deleted_at: "2026-02-01T00:00:00Z" }),
    ];
    const total = sumRepayments(loan, txs);
    expect(total.amount.equals(40000)).toBe(true);
  });

  it("ignores transactions in a different currency", () => {
    const loan = makeLoan({ principal_currency: "XOF" });
    const txs = [makeTx({ amount: 100, currency: "USD" })];
    expect(sumRepayments(loan, txs).amount.equals(0)).toBe(true);
  });
});

describe("calculateRemaining", () => {
  it("returns principal when no repayments", () => {
    const remaining = calculateRemaining(makeLoan(), []);
    expect(remaining.amount.equals(100000)).toBe(true);
    expect(remaining.currency).toBe("XOF");
  });

  it("returns principal minus repayments", () => {
    const remaining = calculateRemaining(makeLoan(), [
      makeTx({ amount: 30000 }),
      makeTx({ id: "tx-2", amount: 20000 }),
    ]);
    expect(remaining.amount.equals(50000)).toBe(true);
  });
});

describe("calculateAccruedInterest", () => {
  const loan = {
    principal_amount: 1000,
    principal_currency: "USD",
    interest_rate: 0.12,
    interest_type: "simple" as const,
    issue_date: "2026-01-01",
  };

  it("returns zero when interest_type is null or 'none'", () => {
    const noInterest = calculateAccruedInterest(
      { ...loan, interest_type: null, interest_rate: null },
      new Date("2026-07-01"),
    );
    expect(noInterest.amount.equals(0)).toBe(true);

    const none = calculateAccruedInterest(
      { ...loan, interest_type: "none" },
      new Date("2026-07-01"),
    );
    expect(none.amount.equals(0)).toBe(true);
  });

  it("returns zero at issue date", () => {
    const i = calculateAccruedInterest(loan, new Date("2026-01-01"));
    expect(i.amount.equals(0)).toBe(true);
  });

  it("computes simple interest pro-rated by days", () => {
    // 1000 × 0.12 × (180/365) ≈ 59.178...
    const i = calculateAccruedInterest(loan, new Date("2026-06-30"));
    expect(i.amount.toDecimalPlaces(2).toNumber()).toBeCloseTo(59.18, 2);
  });

  it("computes compound interest", () => {
    // 1000 × ((1.12)^(180/365) - 1) ≈ 57.48
    const i = calculateAccruedInterest(
      { ...loan, interest_type: "compound" },
      new Date("2026-06-30"),
    );
    expect(i.amount.toDecimalPlaces(2).toNumber()).toBeCloseTo(57.48, 2);
  });

  it("compound interest exceeds simple over long horizon", () => {
    const simple = calculateAccruedInterest(loan, new Date("2030-01-01"));
    const compound = calculateAccruedInterest(
      { ...loan, interest_type: "compound" },
      new Date("2030-01-01"),
    );
    expect(compound.amount.gt(simple.amount)).toBe(true);
  });
});

describe("deriveStatus", () => {
  const base = {
    id: LOAN_ID,
    principal_amount: 100000,
    principal_currency: "XOF",
    due_date: "2026-12-31",
  };

  it("returns 'active' when no repayments and not overdue", () => {
    expect(deriveStatus(base, [], new Date("2026-06-01"))).toBe("active");
  });

  it("returns 'partial' when some repayments but not fully repaid", () => {
    expect(
      deriveStatus(base, [makeTx({ amount: 30000 })], new Date("2026-06-01")),
    ).toBe("partial");
  });

  it("returns 'repaid' when sum >= principal", () => {
    expect(
      deriveStatus(
        base,
        [makeTx({ amount: 60000 }), makeTx({ id: "tx-2", amount: 40000 })],
        new Date("2026-06-01"),
      ),
    ).toBe("repaid");
  });

  it("returns 'overdue' when past due_date and not repaid", () => {
    expect(deriveStatus(base, [], new Date("2027-01-15"))).toBe("overdue");
  });

  it("returns 'overdue' even with partial repayments past due date", () => {
    expect(
      deriveStatus(base, [makeTx({ amount: 10000 })], new Date("2027-01-15")),
    ).toBe("overdue");
  });
});
