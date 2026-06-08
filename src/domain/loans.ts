import Decimal from "decimal.js";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { CurrencyCode, Money } from "@/lib/money";
import { money, subtract, zero } from "@/lib/money";
import type { InterestType, LoanStatus, Tables } from "@/lib/supabase/types";

type Loan = Tables<"loans">;
type Transaction = Tables<"transactions">;

const DAYS_PER_YEAR = new Decimal(365);

/** Sum of repayment transactions linked to a loan (same currency). */
export function sumRepayments(
  loan: Pick<Loan, "id" | "principal_currency">,
  transactions: ReadonlyArray<
    Pick<
      Transaction,
      | "linked_entity_id"
      | "linked_entity_type"
      | "kind"
      | "amount"
      | "currency"
      | "deleted_at"
    >
  >,
): Money {
  const currency = loan.principal_currency as CurrencyCode;
  const total = transactions
    .filter(
      (t) =>
        t.deleted_at === null &&
        t.kind === "repayment" &&
        t.linked_entity_type === "loan" &&
        t.linked_entity_id === loan.id &&
        t.currency === currency,
    )
    .reduce((acc, t) => acc.plus(new Decimal(t.amount)), new Decimal(0));
  return money(total, currency);
}

/** principal - sum(repayments). May be negative if overpaid. */
export function calculateRemaining(
  loan: Pick<Loan, "id" | "principal_amount" | "principal_currency">,
  transactions: ReadonlyArray<
    Pick<
      Transaction,
      | "linked_entity_id"
      | "linked_entity_type"
      | "kind"
      | "amount"
      | "currency"
      | "deleted_at"
    >
  >,
): Money {
  const currency = loan.principal_currency as CurrencyCode;
  const principal = money(new Decimal(loan.principal_amount), currency);
  const repaid = sumRepayments(loan, transactions);
  return subtract(principal, repaid);
}

interface InterestInput {
  principal_amount: number;
  principal_currency: string;
  interest_rate: number | null;
  interest_type: InterestType | null;
  issue_date: string;
}

/**
 * Accrued interest on the loan principal at a given date.
 * - none / null rate → zero
 * - simple → principal × rate × elapsedDays / 365
 * - compound → principal × ((1 + rate)^(elapsedDays/365) - 1)
 *
 * `rate` is the annual rate as a fraction (e.g. 0.12 for 12 %).
 */
export function calculateAccruedInterest(
  loan: InterestInput,
  asOf: Date = new Date(),
): Money {
  const currency = loan.principal_currency as CurrencyCode;
  if (
    loan.interest_rate === null ||
    loan.interest_type === null ||
    loan.interest_type === "none"
  ) {
    return zero(currency);
  }

  const elapsedDays = Math.max(
    0,
    differenceInCalendarDays(asOf, parseISO(loan.issue_date)),
  );
  if (elapsedDays === 0) return zero(currency);

  const principal = new Decimal(loan.principal_amount);
  const rate = new Decimal(loan.interest_rate);
  const yearFraction = new Decimal(elapsedDays).div(DAYS_PER_YEAR);

  if (loan.interest_type === "simple") {
    return money(principal.mul(rate).mul(yearFraction), currency);
  }

  // compound: principal × ((1 + rate)^(elapsedDays/365) - 1)
  const growth = Decimal.pow(rate.plus(1), yearFraction).minus(1);
  return money(principal.mul(growth), currency);
}

interface StatusInput {
  due_date: string | null;
  principal_amount: number;
  principal_currency: string;
  id: string;
}

/**
 * Derive a status from raw data. The stored `status` column is the
 * source of truth at rest, but this lets us recompute it after a
 * write (repayment, manual edit) for UI feedback.
 */
export function deriveStatus(
  loan: StatusInput,
  transactions: ReadonlyArray<
    Pick<
      Transaction,
      | "linked_entity_id"
      | "linked_entity_type"
      | "kind"
      | "amount"
      | "currency"
      | "deleted_at"
    >
  >,
  asOf: Date = new Date(),
): LoanStatus {
  const remaining = calculateRemaining(
    {
      id: loan.id,
      principal_amount: loan.principal_amount,
      principal_currency: loan.principal_currency,
    },
    transactions,
  );

  if (remaining.amount.lte(0)) return "repaid";

  const someRepayment = transactions.some(
    (t) =>
      t.deleted_at === null &&
      t.kind === "repayment" &&
      t.linked_entity_type === "loan" &&
      t.linked_entity_id === loan.id,
  );

  if (loan.due_date && asOf > parseISO(loan.due_date)) {
    return "overdue";
  }
  if (someRepayment) return "partial";
  return "active";
}
