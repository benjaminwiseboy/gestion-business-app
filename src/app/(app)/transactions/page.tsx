"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeftRight, ChevronRight, Plus, Search } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
  useTransactions,
  type TransactionWithPerson,
} from "@/hooks/use-transactions";
import {
  TRANSACTION_KIND_LABELS,
  type TransactionKindInput,
} from "@/domain/validators";
import { money, type CurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";

type KindFilter = "all" | TransactionKindInput;
type PeriodFilter = "all" | "7d" | "30d" | "90d" | "year";

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "Tous types" },
  { value: "repayment", label: "Remboursements" },
  { value: "loan_disbursement", label: "Décaissements" },
  { value: "land_payment", label: "Paiements fonciers" },
  { value: "investment_in", label: "Investissements" },
  { value: "investment_out", label: "Distributions" },
  { value: "fee", label: "Frais" },
  { value: "adjustment", label: "Ajustements" },
];

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "all", label: "Toutes périodes" },
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "90d", label: "90 derniers jours" },
  { value: "year", label: "Cette année" },
];

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const txQuery = useTransactions();

  const filtered = useMemo(() => {
    const all = txQuery.data ?? [];
    const q = search.trim().toLowerCase();
    const now = new Date();
    const minDate = periodMinDate(periodFilter, now);

    return all.filter((t) => {
      if (kindFilter !== "all" && t.kind !== kindFilter) return false;
      if (minDate && parseISO(t.occurred_at) < minDate) return false;
      if (q) {
        const inNotes = t.notes?.toLowerCase().includes(q) ?? false;
        const inPerson = t.person?.full_name.toLowerCase().includes(q) ?? false;
        if (!inNotes && !inPerson) return false;
      }
      return true;
    });
  }, [txQuery.data, search, kindFilter, periodFilter]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Transactions
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Journal central de tous les mouvements financiers
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/transactions/new" />}>
          <Plus />
          Nouvelle
        </Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Rechercher par notes ou personne"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={kindFilter}
          onValueChange={(value) =>
            setKindFilter((value as KindFilter) ?? "all")
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={periodFilter}
          onValueChange={(value) =>
            setPeriodFilter((value as PeriodFilter) ?? "all")
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {txQuery.isError ? (
        <ErrorState onRetry={() => txQuery.refetch()} />
      ) : txQuery.isLoading ? (
        <TransactionsListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={
            search || kindFilter !== "all" || periodFilter !== "all"
              ? "Aucun résultat"
              : "Aucune transaction"
          }
          description={
            search || kindFilter !== "all" || periodFilter !== "all"
              ? "Ajustez vos filtres."
              : "Le journal se remplit automatiquement quand vous saisissez des remboursements, ou créez une transaction manuelle."
          }
          action={
            search || kindFilter !== "all" || periodFilter !== "all"
              ? undefined
              : { label: "Saisir une transaction", href: "/transactions/new" }
          }
        />
      ) : (
        <TransactionsByDay transactions={filtered} />
      )}
    </div>
  );
}

function periodMinDate(period: PeriodFilter, now: Date): Date | null {
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 3600 * 1000);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

function TransactionsByDay({
  transactions,
}: {
  transactions: TransactionWithPerson[];
}) {
  const groups = useMemo(() => {
    const map = new Map<string, TransactionWithPerson[]>();
    for (const tx of transactions) {
      const key = tx.occurred_at;
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [transactions]);

  const today = new Date();

  return (
    <div className="flex flex-col gap-5">
      {groups.map(([date, items]) => {
        const d = parseISO(date);
        const label = isSameDay(d, today)
          ? "Aujourd’hui"
          : format(d, "EEEE d MMMM yyyy", { locale: fr });
        return (
          <section key={date} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              {label}
            </h3>
            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {items.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function TransactionRow({ tx }: { tx: TransactionWithPerson }) {
  const currency = tx.currency as CurrencyCode;
  const amount = money(tx.amount, currency);
  return (
    <li>
      <Link
        href={`/transactions/${tx.id}`}
        className={cn(
          "flex items-start justify-between gap-3 px-4 py-3 transition-colors",
          "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {TRANSACTION_KIND_LABELS[tx.kind] ?? tx.kind}
            </Badge>
            <span className="truncate text-sm font-medium">
              {tx.person?.full_name ?? "—"}
            </span>
          </div>
          {tx.notes ? (
            <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {tx.notes}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <MoneyDisplay
            money={amount}
            size="base"
            rateToPivot={tx.exchange_rate_snapshot}
            className="items-end"
          />
          <ChevronRight className="size-4 text-zinc-400" />
        </div>
      </Link>
    </li>
  );
}

function TransactionsListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-32" />
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {Array.from({ length: 3 }).map((__, j) => (
              <div
                key={j}
                className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 last:border-b-0 dark:border-zinc-800"
              >
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
