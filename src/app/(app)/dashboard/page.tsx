"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Percent,
  PiggyBank,
  RefreshCw,
  Scale,
  TrendingUp,
} from "lucide-react";
import Decimal from "decimal.js";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { MoneyDisplay } from "@/components/money-display";
import { MonthlyFlowChart } from "@/components/dashboard/monthly-flow-chart";
import {
  useLoans,
  useLoanRemaining,
  type LoanWithPerson,
} from "@/hooks/use-loans";
import {
  useInvestmentBalance,
  useInvestments,
  type InvestmentWithCounterparty,
} from "@/hooks/use-investments";
import { useAdminFiles } from "@/hooks/use-admin-files";
import { useAllLandSales, useLandSaleRemaining } from "@/hooks/use-land-sales";
import { useTransactions } from "@/hooks/use-transactions";
import { useUserSettings } from "@/hooks/use-user-settings";
import { money, type CurrencyCode } from "@/lib/money";
import {
  computeAlerts,
  DOMAIN_CONFIG,
  SEVERITY_CONFIG,
  type Alert,
  type AlertSeverity,
} from "@/lib/alerts";
import type { Views } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const qc = useQueryClient();
  const loansQuery = useLoans();
  const remainingQuery = useLoanRemaining();
  const txQuery = useTransactions();
  const settingsQuery = useUserSettings();
  const investmentsQuery = useInvestments();
  const investmentBalanceQuery = useInvestmentBalance();
  const adminFilesQuery = useAdminFiles();
  const landSalesQuery = useAllLandSales();
  const landSaleRemainingQuery = useLandSaleRemaining();

  const isLoading =
    loansQuery.isLoading || remainingQuery.isLoading || settingsQuery.isLoading;
  const isError =
    loansQuery.isError ||
    remainingQuery.isError ||
    txQuery.isError ||
    investmentsQuery.isError ||
    investmentBalanceQuery.isError ||
    adminFilesQuery.isError ||
    landSalesQuery.isError ||
    landSaleRemainingQuery.isError;

  const usdRate = settingsQuery.data?.usd_to_xaf_rate ?? 600;
  const loans = loansQuery.data ?? [];
  const remaining = remainingQuery.data ?? {};
  const investments = investmentsQuery.data ?? [];
  const investmentBalance = investmentBalanceQuery.data ?? {};
  const adminFiles = adminFilesQuery.data ?? [];
  const landSales = landSalesQuery.data ?? [];
  const landSaleRemaining = landSaleRemainingQuery.data ?? {};
  const transactions = txQuery.data ?? [];

  const stats = useMemo(
    () => computeStats(loans, remaining, usdRate),
    [loans, remaining, usdRate],
  );
  const investmentStats = useMemo(
    () => computeInvestmentStats(investments, investmentBalance, usdRate),
    [investments, investmentBalance, usdRate],
  );
  const alerts = useMemo(
    () =>
      computeAlerts({
        loans,
        loanRemaining: remaining,
        investments,
        adminFiles,
        landSales,
        landSaleRemaining,
        transactions,
      }),
    [
      loans,
      remaining,
      investments,
      adminFiles,
      landSales,
      landSaleRemaining,
      transactions,
    ],
  );

  const alertsBySeverity = useMemo(() => groupBySeverity(alerts), [alerts]);

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

          {investments.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard
                label="Capital investi (actif)"
                icon={<PiggyBank className="size-4 text-indigo-600" />}
                valueXof={investmentStats.outstandingXof}
                description={`${investmentStats.activeCount} actif(s)`}
              />
              <SummaryCard
                label="Profit cumulé"
                icon={<TrendingUp className="size-4 text-emerald-600" />}
                valueXof={investmentStats.realizedProfitXof}
                description="Net retours − apports"
                emphasis={investmentStats.realizedProfitXof.gt(0)}
              />
              <SummaryCard
                label="Total investissements"
                icon={<Scale className="size-4 text-blue-600" />}
                valueXof={investmentStats.contributedXof}
                description={`Sur ${investmentStats.totalCount} investissement(s)`}
              />
            </div>
          ) : null}

          {alerts.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {(["overdue", "upcoming", "attention"] as AlertSeverity[]).map(
                (severity) => {
                  const items = alertsBySeverity[severity];
                  if (!items || items.length === 0) return null;
                  return (
                    <AlertsSection
                      key={severity}
                      severity={severity}
                      alerts={items}
                    />
                  );
                },
              )}
            </div>
          ) : null}

          <MonthlyFlowChart transactions={transactions} usdRate={usdRate} />
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

interface InvestmentStats {
  outstandingXof: Decimal;
  contributedXof: Decimal;
  realizedProfitXof: Decimal;
  activeCount: number;
  totalCount: number;
}

function computeInvestmentStats(
  investments: InvestmentWithCounterparty[],
  balance: Record<string, Views<"investment_balance">>,
  usdRate: number,
): InvestmentStats {
  let outstanding = new Decimal(0);
  let contributed = new Decimal(0);
  let profit = new Decimal(0);
  let activeCount = 0;

  for (const inv of investments) {
    const currency = inv.principal_currency as CurrencyCode;
    const rate = currency === "USD" ? usdRate : 1;
    const row = balance[inv.id];
    if (!row) continue;
    const contributedXof = new Decimal(row.contributed_amount).mul(rate);
    const returnedXof = new Decimal(row.returned_amount).mul(rate);
    const netXof = returnedXof.minus(contributedXof);
    contributed = contributed.plus(contributedXof);
    profit = profit.plus(netXof);
    if (inv.status === "active") {
      activeCount += 1;
      outstanding = outstanding.plus(
        Decimal.max(contributedXof.minus(returnedXof), 0),
      );
    }
  }

  return {
    outstandingXof: outstanding,
    contributedXof: contributed,
    realizedProfitXof: profit,
    activeCount,
    totalCount: investments.length,
  };
}

function groupBySeverity(alerts: Alert[]): Record<AlertSeverity, Alert[]> {
  const out: Record<AlertSeverity, Alert[]> = {
    overdue: [],
    upcoming: [],
    attention: [],
  };
  for (const alert of alerts) out[alert.severity].push(alert);
  return out;
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
            money={money(valueXof ?? new Decimal(0), "XAF")}
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

function AlertsSection({
  severity,
  alerts,
}: {
  severity: AlertSeverity;
  alerts: Alert[];
}) {
  const config = SEVERITY_CONFIG[severity];
  const Icon = config.icon;
  const tone = config.tone;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4",
        tone === "danger" &&
          "border-red-200 bg-red-50/40 dark:border-red-950 dark:bg-red-950/30",
        tone === "warning" &&
          "border-amber-200 bg-amber-50/40 dark:border-amber-950 dark:bg-amber-950/30",
        tone === "info" &&
          "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon
            className={cn(
              "size-4",
              tone === "danger" && "text-red-600",
              tone === "warning" && "text-amber-600",
              tone === "info" && "text-zinc-500",
            )}
          />
          {config.label}
        </div>
        <Badge
          variant="ghost"
          className={cn(
            "text-[10px]",
            tone === "danger" &&
              "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
            tone === "warning" &&
              "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
            tone === "info" &&
              "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
          )}
        >
          {alerts.length}
        </Badge>
      </div>
      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </ul>
    </div>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const domain = DOMAIN_CONFIG[alert.domain];
  const Icon = domain.icon;
  return (
    <li>
      <Link
        href={alert.href}
        className="flex items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <Icon
            className="mt-0.5 size-4 shrink-0 text-zinc-500"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium">
                {alert.title}
              </span>
              <Badge variant="outline" className="text-[10px] font-normal">
                {domain.label}
              </Badge>
            </div>
            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {alert.description}
            </div>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-zinc-400" />
      </Link>
    </li>
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
