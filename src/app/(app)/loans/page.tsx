"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import {
  useLoans,
  useLoanRemaining,
  type LoanWithPerson,
} from "@/hooks/use-loans";
import { money, type CurrencyCode } from "@/lib/money";
import type { LoanStatus, Views } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | LoanStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous statuts" },
  { value: "active", label: "En cours" },
  { value: "partial", label: "Partiels" },
  { value: "repaid", label: "Remboursés" },
  { value: "overdue", label: "En retard" },
];

export default function LoansPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const loansQuery = useLoans();
  const remainingQuery = useLoanRemaining();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Prêts &amp; dettes
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Suivi en temps réel de vos créances et dettes
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/loans/new" />}>
          <Plus />
          Nouveau
        </Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Rechercher par nom de personne"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter((value as StatusFilter) ?? "all")
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
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

      {loansQuery.isError ? (
        <ErrorState onRetry={() => loansQuery.refetch()} />
      ) : loansQuery.isLoading ? (
        <LoansListSkeleton />
      ) : (
        <Tabs defaultValue="lent">
          <TabsList>
            <TabsTrigger value="lent">
              <ArrowUpRight className="mr-1.5 size-3.5" /> Accordés
            </TabsTrigger>
            <TabsTrigger value="borrowed">
              <ArrowDownLeft className="mr-1.5 size-3.5" /> Reçus
            </TabsTrigger>
          </TabsList>
          <TabsContent value="lent" className="mt-4">
            <LoansList
              direction="lent"
              loans={loansQuery.data ?? []}
              remaining={remainingQuery.data ?? {}}
              search={search}
              statusFilter={statusFilter}
            />
          </TabsContent>
          <TabsContent value="borrowed" className="mt-4">
            <LoansList
              direction="borrowed"
              loans={loansQuery.data ?? []}
              remaining={remainingQuery.data ?? {}}
              search={search}
              statusFilter={statusFilter}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function LoansList({
  direction,
  loans,
  remaining,
  search,
  statusFilter,
}: {
  direction: "lent" | "borrowed";
  loans: LoanWithPerson[];
  remaining: Record<string, Views<"loan_remaining">>;
  search: string;
  statusFilter: StatusFilter;
}) {
  const q = search.trim().toLowerCase();
  const filtered = loans.filter((l) => {
    if (l.direction !== direction) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (q && !l.person?.full_name.toLowerCase().includes(q)) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title={
          search || statusFilter !== "all"
            ? "Aucun résultat"
            : direction === "lent"
              ? "Aucun prêt accordé"
              : "Aucune dette enregistrée"
        }
        description={
          search || statusFilter !== "all"
            ? "Ajustez vos filtres."
            : "Commencez par enregistrer un premier prêt."
        }
        action={
          search || statusFilter !== "all"
            ? undefined
            : { label: "Nouveau prêt", href: "/loans/new" }
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {filtered.map((loan) => (
        <li key={loan.id}>
          <Link
            href={`/loans/${loan.id}`}
            className={cn(
              "flex flex-wrap items-start justify-between gap-3 px-4 py-3 transition-colors",
              "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {loan.person?.full_name ?? "(personne supprimée)"}
                </span>
                <StatusBadge status={loan.status} />
              </div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Émis le{" "}
                {format(parseISO(loan.issue_date), "d MMM yyyy", {
                  locale: fr,
                })}
                {loan.due_date
                  ? ` · échéance ${format(parseISO(loan.due_date), "d MMM yyyy", { locale: fr })}`
                  : ""}
              </div>
            </div>
            <div className="flex flex-col items-end text-right">
              <MoneyDisplay
                money={money(
                  loan.principal_amount,
                  loan.principal_currency as CurrencyCode,
                )}
                size="lg"
                showPivotEquivalent={false}
              />
              {remaining[loan.id] && remaining[loan.id].remaining_amount > 0 ? (
                <Badge variant="secondary" className="mt-1 text-[10px]">
                  Reste{" "}
                  <MoneyDisplay
                    money={money(
                      remaining[loan.id].remaining_amount,
                      remaining[loan.id].currency as CurrencyCode,
                    )}
                    size="sm"
                    showPivotEquivalent={false}
                    className="ml-1"
                  />
                </Badge>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LoansListSkeleton() {
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
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}
