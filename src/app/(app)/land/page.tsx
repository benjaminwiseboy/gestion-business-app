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
import { StatusBadge } from "@/components/status-badge";
import {
  useLandInventory,
  useLands,
  type LandWithSeller,
} from "@/hooks/use-lands";
import {
  LAND_ACQUISITION_STATUS_LABELS,
  type LandAcquisitionStatusInput,
} from "@/domain/validators";
import type { Views } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | LandAcquisitionStatusInput;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous statuts" },
  { value: "planned", label: LAND_ACQUISITION_STATUS_LABELS.planned },
  { value: "owned", label: LAND_ACQUISITION_STATUS_LABELS.owned },
  { value: "blocked", label: LAND_ACQUISITION_STATUS_LABELS.blocked },
];

export default function LandPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const landsQuery = useLands();
  const inventoryQuery = useLandInventory();

  const filtered = useMemo(() => {
    const all = landsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((l) => {
      if (statusFilter !== "all" && l.acquisition_status !== statusFilter)
        return false;
      if (q) {
        const inTitle = l.title.toLowerCase().includes(q);
        const inLocation = l.location?.toLowerCase().includes(q) ?? false;
        const inSeller = l.seller?.full_name.toLowerCase().includes(q) ?? false;
        if (!inTitle && !inLocation && !inSeller) return false;
      }
      return true;
    });
  }, [landsQuery.data, search, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Foncier</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Terrains, acquisitions, ventes et dossiers techniques liés
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/land/new" />}>
          <Plus />
          Nouveau terrain
        </Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Rechercher par titre, localisation, vendeur"
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
          <SelectTrigger className="w-52">
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

      {landsQuery.isError ? (
        <ErrorState onRetry={() => landsQuery.refetch()} />
      ) : landsQuery.isLoading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={
            search || statusFilter !== "all"
              ? "Aucun résultat"
              : "Aucun terrain enregistré"
          }
          description={
            search || statusFilter !== "all"
              ? "Ajustez vos filtres."
              : "Commencez par enregistrer votre premier terrain."
          }
          action={
            search || statusFilter !== "all"
              ? undefined
              : { label: "Nouveau terrain", href: "/land/new" }
          }
        />
      ) : (
        <LandsList lands={filtered} inventory={inventoryQuery.data ?? {}} />
      )}
    </div>
  );
}

function LandsList({
  lands,
  inventory,
}: {
  lands: LandWithSeller[];
  inventory: Record<string, Views<"land_inventory">>;
}) {
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {lands.map((l) => {
        const inv = inventory[l.id];
        const total = Number(l.total_surface_m2);
        const sold = inv ? Number(inv.sold_surface_m2) : 0;
        const remaining = inv ? Number(inv.remaining_surface_m2) : total;
        const soldPct = total > 0 ? (sold / total) * 100 : 0;
        return (
          <li key={l.id}>
            <Link
              href={`/land/${l.id}`}
              className={cn(
                "flex flex-wrap items-start justify-between gap-3 px-4 py-3 transition-colors",
                "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{l.title}</span>
                  <StatusBadge status={l.acquisition_status} />
                </div>
                <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {l.location ?? "—"}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  {total.toLocaleString("fr-FR")} m² · vendu{" "}
                  {sold.toLocaleString("fr-FR")} m² ({soldPct.toFixed(0)}%)
                </div>
              </div>
              <div className="text-right">
                {remaining > 0 ? (
                  <Badge variant="secondary" className="text-[10px]">
                    Reste {remaining.toLocaleString("fr-FR")} m²
                  </Badge>
                ) : (
                  <Badge
                    variant="ghost"
                    className="bg-emerald-100 text-[10px] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    Tout vendu
                  </Badge>
                )}
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
