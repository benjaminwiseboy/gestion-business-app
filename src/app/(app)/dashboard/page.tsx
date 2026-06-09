"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  Percent,
  RefreshCw,
  Scale,
} from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import Decimal from "decimal.js";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { MonthlyFlowChart } from "@/components/dashboard/monthly-flow-chart";
import {
  useLoans,
  useLoanRemaining,
  type LoanWithPerson,
} from "@/hooks/use-loans";
import { useTransactions } from "@/hooks/use-transactions";
import { useUserSettings } from "@/hooks/use-user-settings";
import { money, type CurrencyCode } from "@/lib/money";
import type { Views } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const qc = useQueryClient();
  const loansQuery = useLoans();
  const remainingQuery = useLoanRemaining();
  const txQuery = useTransactions();
  const settingsQuery = useUserSettings();

  const isLoading =
    loansQuery.isLoading || remainingQuery.isLoading || settingsQuery.isLoading;
  const isError =
    loansQuery.isError || remainingQuery.isError || txQuery.isError;

  const usdRate = settingsQuery.data?.usd_to_xof_rate ?? 600;
  const loans = loansQuery.data ?? [];
  const remaining = remainingQuery.data ?? {};

  const stats = useMemo(
    () => computeStats(loans, remaining, usdRate),
    [loans, remaining, usdRate],
  );
  const upcoming = useMemo(
    () => upcomingLoans(loans, remaining, 7),
    [loans, remaining],
  );
  const overdue = useMemo(
    () => overdueLoans(loans, remaining),
    [loans, remaining],
  );

  function onRefresh() {
    qc.invalidateQueries();
  }

  if (isError) {
    return <ErrorState onRetry={onRefresh} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Tableau de bord
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Vue d&apos;ensemble de votre situation financière
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loansQuery.isFetching}
        >
          <RefreshCw className={cn(loansQuery.isFetching && "animate-spin")} />
          Rafraîchir
        </Button>
      </header>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Total créances"
              icon={<ArrowUpRight className="size-4 text-emerald-600" />}
              valueXof={stats.receivablesXof}
              description={`${stats.activeLent} prêt(s) actif(s)`}
            />
            <SummaryCard
              label="Total dettes"
              icon={<ArrowDownLeft className="size-4 text-amber-600" />}
              valueXof={stats.debtsXof}
              description={`${stats.activeBorrowed} dette(s) active(s)`}
            />
            <SummaryCard
              label="Position nette"
              icon={<Scale className="size-4 text-blue-600" />}
              valueXof={stats.netXof}
              emphasis
              description="Créances − dettes"
            />
            <SummaryCard
              label="Taux de remboursement"
              icon={<Percent className="size-4 text-purple-600" />}
              ratio={stats.repaymentRatio}
              description={`${stats.totalLoans} prêt(s) au total`}
            />
          </div>

          {(upcoming.length > 0 || overdue.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {overdue.length > 0 ? (
                <SectionCard
                  title="Retards"
                  icon={<AlertTriangle className="size-4 text-red-600" />}
                  count={overdue.length}
                  tone="danger"
                >
                  <LoanItems
                    items={overdue}
                    remaining={remaining}
                    mode="overdue"
                  />
                </SectionCard>
              ) : null}
              {upcoming.length > 0 ? (
                <SectionCard
                  title="Échéances dans 7 jours"
                  icon={<CalendarClock className="size-4 text-amber-600" />}
                  count={upcoming.length}
                  tone="warning"
                >
                  <LoanItems
                    items={upcoming}
                    remaining={remaining}
                    mode="upcoming"
                  />
                </SectionCard>
              ) : null}
            </div>
          )}

          <MonthlyFlowChart
            transactions={txQuery.data ?? []}
            usdRate={usdRate}
          />
        </>
      )}
    </div>
  );
}

interface Stats {
  receivablesXof: Decimal;
  debtsXof: Decimal;
  netXof: Decimal;
  repaymentRatio: number;
  activeLent: number;
  activeBorrowed: number;
  totalLoans: number;
}

function computeStats(
  loans: LoanWithPerson[],
  remaining: Record<string, Views<"loan_remaining">>,
  usdRate: number,
): Stats {
  let receivables = new Decimal(0);
  let debts = new Decimal(0);
  let totalPrincipal = new Decimal(0);
  let totalRepaid = new Decimal(0);
  let activeLent = 0;
  let activeBorrowed = 0;

  for (const loan of loans) {
    const currency = loan.principal_currency as CurrencyCode;
    const rate = currency === "USD" ? usdRate : 1;
    const principalXof = new Decimal(loan.principal_amount).mul(rate);
    totalPrincipal = totalPrincipal.plus(principalXof);

    const row = remaining[loan.id];
    if (!row) continue;
    const remainingXof = new Decimal(row.remaining_amount).mul(rate);
    const repaidXof = new Decimal(row.repaid_amount).mul(rate);
    totalRepaid = totalRepaid.plus(repaidXof);

    if (loan.direction === "lent") {
      receivables = receivables.plus(Decimal.max(remainingXof, 0));
      if (loan.status !== "repaid") activeLent += 1;
    } else {
      debts = debts.plus(Decimal.max(remainingXof, 0));
      if (loan.status !== "repaid") activeBorrowed += 1;
    }
  }

  const repaymentRatio = totalPrincipal.isZero()
    ? 0
    : totalRepaid.div(totalPrincipal).toNumber();

  return {
    receivablesXof: receivables,
    debtsXof: debts,
    netXof: receivables.minus(debts),
    repaymentRatio: Math.min(1, Math.max(0, repaymentRatio)),
    activeLent,
    activeBorrowed,
    totalLoans: loans.length,
  };
}

function upcomingLoans(
  loans: LoanWithPerson[],
  remaining: Record<string, Views<"loan_remaining">>,
  withinDays: number,
): LoanWithPerson[] {
  const today = new Date();
  const horizon = new Date(today.getTime() + withinDays * 24 * 3600 * 1000);
  return loans
    .filter((l) => {
      if (l.status === "repaid") return false;
      if (!l.due_date) return false;
      const due = parseISO(l.due_date);
      if (due < today) return false;
      if (due > horizon) return false;
      const row = remaining[l.id];
      return !row || row.remaining_amount > 0;
    })
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));
}

function overdueLoans(
  loans: LoanWithPerson[],
  remaining: Record<string, Views<"loan_remaining">>,
): LoanWithPerson[] {
  const today = new Date();
  return loans
    .filter((l) => {
      if (l.status === "repaid") return false;
      if (!l.due_date) return false;
      const due = parseISO(l.due_date);
      if (due >= today) return false;
      const row = remaining[l.id];
      return !row || row.remaining_amount > 0;
    })
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));
}

function SummaryCard({
  label,
  icon,
  valueXof,
  ratio,
  description,
  emphasis,
}: {
  label: string;
  icon: React.ReactNode;
  valueXof?: Decimal;
  ratio?: number;
  description?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900",
        emphasis && "border-zinc-900 dark:border-zinc-100",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          {label}
        </div>
        {icon}
      </div>
      <div className="mt-2">
        {ratio !== undefined ? (
          <div className="text-2xl font-semibold tabular-nums">
            {Math.round(ratio * 100)} %
          </div>
        ) : (
          <MoneyDisplay
            money={money(valueXof ?? new Decimal(0), "XOF")}
            size="xl"
            showPivotEquivalent={false}
          />
        )}
      </div>
      {description ? (
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </div>
      ) : null}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  count,
  tone,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  tone: "warning" | "danger";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4",
        tone === "danger"
          ? "border-red-200 bg-red-50/40 dark:border-red-950 dark:bg-red-950/30"
          : "border-amber-200 bg-amber-50/40 dark:border-amber-950 dark:bg-amber-950/30",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </div>
        <Badge
          variant="ghost"
          className={cn(
            "text-[10px]",
            tone === "danger"
              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
          )}
        >
          {count}
        </Badge>
      </div>
      {children}
    </div>
  );
}

function LoanItems({
  items,
  remaining,
  mode,
}: {
  items: LoanWithPerson[];
  remaining: Record<string, Views<"loan_remaining">>;
  mode: "upcoming" | "overdue";
}) {
  const today = new Date();
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {items.map((loan) => {
        const row = remaining[loan.id];
        const due = parseISO(loan.due_date!);
        const days = differenceInCalendarDays(due, today);
        const relative =
          mode === "overdue"
            ? `${Math.abs(days)} j de retard`
            : days === 0
              ? "Aujourd'hui"
              : `dans ${days} j`;
        return (
          <li key={loan.id}>
            <Link
              href={`/loans/${loan.id}`}
              className="flex items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {loan.person?.full_name ?? "—"}
                  <StatusBadge status={loan.status} />
                </div>
                <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {format(due, "d MMM yyyy", { locale: fr })} · {relative}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {row ? (
                  <MoneyDisplay
                    money={money(
                      row.remaining_amount,
                      row.currency as CurrencyCode,
                    )}
                    size="sm"
                    showPivotEquivalent={false}
                  />
                ) : null}
                <ChevronRight className="size-4 text-zinc-400" />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
