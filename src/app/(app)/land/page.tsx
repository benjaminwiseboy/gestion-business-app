"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, Plus, Search } from "lucide-react";
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
  useLandProjects,
  useLandRemaining,
  type LandProjectWithClient,
} from "@/hooks/use-land-projects";
import type { LandProjectStatusInput } from "@/domain/validators";
import { money, type CurrencyCode } from "@/lib/money";
import type { Views } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | LandProjectStatusInput;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous statuts" },
  { value: "active", label: "En cours" },
  { value: "settled", label: "Soldés" },
  { value: "blocked", label: "Bloqués" },
];

export default function LandPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const projectsQuery = useLandProjects();
  const remainingQuery = useLandRemaining();

  const filtered = useMemo(() => {
    const all = projectsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q) {
        const inTitle = p.title.toLowerCase().includes(q);
        const inLocation = p.location?.toLowerCase().includes(q) ?? false;
        const inClient = p.client?.full_name.toLowerCase().includes(q) ?? false;
        if (!inTitle && !inLocation && !inClient) return false;
      }
      return true;
    });
  }, [projectsQuery.data, search, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Foncier</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Projets fonciers (ventes de terrains)
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/land/new" />}>
          <Plus />
          Nouveau projet
        </Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Rechercher par titre, localisation, client"
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

      {projectsQuery.isError ? (
        <ErrorState onRetry={() => projectsQuery.refetch()} />
      ) : projectsQuery.isLoading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={
            search || statusFilter !== "all"
              ? "Aucun résultat"
              : "Aucun projet enregistré"
          }
          description={
            search || statusFilter !== "all"
              ? "Ajustez vos filtres."
              : "Commencez par créer votre premier projet foncier."
          }
          action={
            search || statusFilter !== "all"
              ? undefined
              : { label: "Nouveau projet", href: "/land/new" }
          }
        />
      ) : (
        <ProjectList
          projects={filtered}
          remaining={remainingQuery.data ?? {}}
        />
      )}
    </div>
  );
}

function ProjectList({
  projects,
  remaining,
}: {
  projects: LandProjectWithClient[];
  remaining: Record<string, Views<"land_project_remaining">>;
}) {
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {projects.map((p) => {
        const row = remaining[p.id];
        const currency = p.price_per_m2_currency as CurrencyCode;
        return (
          <li key={p.id}>
            <Link
              href={`/land/${p.id}`}
              className={cn(
                "flex flex-wrap items-start justify-between gap-3 px-4 py-3 transition-colors",
                "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.title}</span>
                  <LandStatusBadge status={p.status} />
                </div>
                <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {[p.client?.full_name, p.location]
                    .filter(Boolean)
                    .join(" · ") || "Sans client / localisation"}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  {p.surface_m2.toLocaleString("fr-FR")} m² ×{" "}
                  {p.price_per_m2_amount.toLocaleString("fr-FR")} {currency}/m²
                </div>
              </div>
              <div className="flex flex-col items-end text-right">
                <MoneyDisplay
                  money={money(p.total_amount, currency)}
                  size="lg"
                  showPivotEquivalent={false}
                />
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

function LandStatusBadge({ status }: { status: LandProjectStatusInput }) {
  return (
    <StatusBadge
      status={
        status === "settled"
          ? "settled"
          : status === "blocked"
            ? "blocked"
            : "active"
      }
    />
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
