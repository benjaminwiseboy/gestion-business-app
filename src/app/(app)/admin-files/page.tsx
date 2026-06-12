"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Plus, Search } from "lucide-react";
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
  useAdminFileRemaining,
  useAdminFiles,
  type AdminFileWithPersons,
} from "@/hooks/use-admin-files";
import {
  ADMIN_FILE_STATUS_LABELS,
  ADMIN_FILE_TYPE_LABELS,
  type AdminFileStatusInput,
  type AdminFileTypeInput,
} from "@/domain/validators";
import { money, type CurrencyCode } from "@/lib/money";
import type { Views } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | AdminFileStatusInput;
type TypeFilter = "all" | AdminFileTypeInput;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous statuts" },
  ...(
    [
      "processing",
      "awaiting_docs",
      "awaiting_payment",
      "done",
      "blocked",
    ] as AdminFileStatusInput[]
  ).map((s) => ({ value: s, label: ADMIN_FILE_STATUS_LABELS[s] })),
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Tous types" },
  ...(
    ["technical", "title", "linking", "survey", "legal"] as AdminFileTypeInput[]
  ).map((t) => ({ value: t, label: ADMIN_FILE_TYPE_LABELS[t] })),
];

export default function AdminFilesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const filesQuery = useAdminFiles();
  const remainingQuery = useAdminFileRemaining();

  const filtered = useMemo(() => {
    const all = filesQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((f) => {
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (typeFilter !== "all" && f.type !== typeFilter) return false;
      if (q) {
        const inTitle = f.title.toLowerCase().includes(q);
        const inBenef =
          f.beneficiary?.full_name.toLowerCase().includes(q) ?? false;
        const inSurv = f.surveyor?.full_name.toLowerCase().includes(q) ?? false;
        if (!inTitle && !inBenef && !inSurv) return false;
      }
      return true;
    });
  }, [filesQuery.data, search, statusFilter, typeFilter]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dossiers</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Titres fonciers, bornages, dossiers techniques et procédures
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin-files/new" />}>
          <Plus />
          Nouveau dossier
        </Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Rechercher par titre, bénéficiaire, géomètre"
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

      {filesQuery.isError ? (
        <ErrorState onRetry={() => filesQuery.refetch()} />
      ) : filesQuery.isLoading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            search || statusFilter !== "all" || typeFilter !== "all"
              ? "Aucun résultat"
              : "Aucun dossier"
          }
          description={
            search || statusFilter !== "all" || typeFilter !== "all"
              ? "Ajustez vos filtres."
              : "Créez votre premier dossier (titre foncier, bornage, etc.)."
          }
          action={
            search || statusFilter !== "all" || typeFilter !== "all"
              ? undefined
              : { label: "Nouveau dossier", href: "/admin-files/new" }
          }
        />
      ) : (
        <FilesList files={filtered} remaining={remainingQuery.data ?? {}} />
      )}
    </div>
  );
}

function FilesList({
  files,
  remaining,
}: {
  files: AdminFileWithPersons[];
  remaining: Record<string, Views<"admin_file_remaining">>;
}) {
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {files.map((f) => {
        const row = remaining[f.id];
        const currency = (f.total_cost_currency ??
          row?.currency ??
          "XAF") as CurrencyCode;
        return (
          <li key={f.id}>
            <Link
              href={`/admin-files/${f.id}`}
              className={cn(
                "flex flex-wrap items-start justify-between gap-3 px-4 py-3 transition-colors",
                "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{f.title}</span>
                  <StatusBadge
                    status={
                      f.status === "done"
                        ? "done"
                        : f.status === "blocked"
                          ? "blocked"
                          : f.status === "awaiting_docs"
                            ? "awaiting_docs"
                            : f.status === "awaiting_payment"
                              ? "awaiting_payment"
                              : "processing"
                    }
                  />
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {ADMIN_FILE_TYPE_LABELS[f.type]}
                  </Badge>
                </div>
                <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {[
                    f.beneficiary &&
                      `Bénéficiaire : ${f.beneficiary.full_name}`,
                    f.surveyor && `Géomètre : ${f.surveyor.full_name}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sans personnes liées"}
                </div>
              </div>
              <div className="flex flex-col items-end text-right">
                {f.total_cost_amount ? (
                  <MoneyDisplay
                    money={money(f.total_cost_amount, currency)}
                    size="lg"
                    showPivotEquivalent={false}
                  />
                ) : (
                  <span className="text-xs text-zinc-400">Pas de coût</span>
                )}
                {row && row.remaining_amount > 0 ? (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    Reste{" "}
                    <MoneyDisplay
                      money={money(row.remaining_amount, currency)}
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
