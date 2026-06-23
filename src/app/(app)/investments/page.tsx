"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import {
  useInvestmentBalance,
  useInvestments,
  type InvestmentWithCounterparty,
} from "@/hooks/use-investments";
import {
  INVESTMENT_STATUS_LABELS,
  INVESTMENT_TYPE_LABELS,
  type InvestmentStatusInput,
  type InvestmentTypeInput,
} from "@/domain/validators";
import { money, type CurrencyCode } from "@/lib/money";
import type { Views } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | InvestmentStatusInput;
type TypeFilter = "all" | InvestmentTypeInput;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous statuts" },
  ...(["active", "closed", "lost"] as InvestmentStatusInput[]).map((s) => ({
    value: s,
    label: INVESTMENT_STATUS_LABELS[s],
  })),
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Tous types" },
  ...(["capital", "tontine", "savings", "other"] as InvestmentTypeInput[]).map(
    (t) => ({ value: t, label: INVESTMENT_TYPE_LABELS[t] }),
  ),
];

export default function InvestmentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const investmentsQuery = useInvestments();
  const balanceQuery = useInvestmentBalance();

  const filtered = useMemo(() => {
    const all = investmentsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (q) {
        const inTitle = i.title.toLowerCase().includes(q);
        const inCp = i.counterparty?.full_name.toLowerCase().includes(q) ?? false;
        if (!inTitle && !inCp) return false;
      }
      return true;
    });
  }, [investmentsQuery.data, search, statusFilter, typeFilter]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Investissements
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Tontines, capitaux, épargnes — vos apports et retours
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/investments/new" />}>
          <Plus />
          Nouvel investissement
        </Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Rechercher par titre ou contrepartie"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(value) =>
            setTypeFilter((value as TypeFilter) ?? "all")
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue>
              {TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter((value as StatusFilter) ?? "all")
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue>
              {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {investmentsQuery.isError ? (
        <ErrorState onRetry={() => investmentsQuery.refetch()} />
      ) : investmentsQuery.isLoading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title={
            search || statusFilter !== "all" || typeFilter !== "all"
              ? "Aucun résultat"
              : "Aucun investissement"
          }
          description={
            search || statusFilter !== "all" || typeFilter !== "all"
              ? "Ajustez vos filtres."
              : "Suivez vos tontines, participations et épargnes ici."
          }
          action={
            search || statusFilter !== "all" || typeFilter !== "all"
              ? undefined
              : { label: "Nouvel investissement", href: "/investments/new" }
          }
        />
      ) : (
        <InvestmentsList
          investments={filtered}
          balance={balanceQuery.data ?? {}}
        />
      )}
    </div>
  );
}

function InvestmentsList({
  investments,
  balance,
}: {
  investments: InvestmentWithCounterparty[];
  balance: Record<string, Views<"investment_balance">>;
}) {
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {investments.map((i) => {
        const row = balance[i.id];
        const currency = i.principal_currency as CurrencyCode;
        const isProfit = row ? row.net_amount > 0 : false;
        const isLoss = row ? row.net_amount < 0 : false;
        return (
          <li key={i.id}>
            <Link
              href={`/investments/${i.id}`}
              className={cn(
                "flex flex-wrap items-start justify-between gap-3 px-4 py-3 transition-colors",
                "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{i.title}</span>
                  <StatusBadge status={i.status} />
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {INVESTMENT_TYPE_LABELS[i.type]}
                  </Badge>
                </div>
                <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {i.counterparty?.full_name ?? "Sans contrepartie"}
                </div>
              </div>
              <div className="flex flex-col items-end text-right">
                <MoneyDisplay
                  money={money(i.principal_amount, currency)}
                  size="lg"
                  showPivotEquivalent={false}
                />
                {row ? (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "mt-1 text-[10px]",
                      isProfit &&
                        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                      isLoss &&
                        "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
                    )}
                  >
                    Net{" "}
                    <MoneyDisplay
                      money={money(row.net_amount, currency)}
                      size="sm"
                      showPivotEquivalent={false}
                      className="ml-1"
                    />
                  </Badge>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 last:border-b-0 dark:border-zinc-800"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-28" />
        </div>
      ))}
    </div>
  );
}
