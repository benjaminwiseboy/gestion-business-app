"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, Plus, Search, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { useFilteredPersons } from "@/hooks/use-persons";
import { PERSON_KIND_LABELS, type PersonKindInput } from "@/domain/validators";
import { cn } from "@/lib/utils";

export default function PersonsPage() {
  const [search, setSearch] = useState("");
  const {
    data: persons,
    isLoading,
    isError,
    refetch,
  } = useFilteredPersons(search);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Personnes</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Particuliers et organisations avec qui vous traitez
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/persons/new" />}>
          <Plus />
          Nouvelle
        </Button>
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Rechercher par nom, téléphone, email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <PersonsListSkeleton />
      ) : persons.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Aucun résultat" : "Aucune personne enregistrée"}
          description={
            search
              ? "Essayez un autre terme de recherche."
              : "Commencez par ajouter votre premier contact."
          }
          action={
            search ? undefined : { label: "Ajouter", href: "/persons/new" }
          }
        />
      ) : (
        <PersonsList persons={persons} />
      )}
    </div>
  );
}

function PersonsList({
  persons,
}: {
  persons: ReadonlyArray<{
    id: string;
    full_name: string;
    kind: PersonKindInput;
    phone: string | null;
    email: string | null;
  }>;
}) {
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {persons.map((p) => (
        <li key={p.id}>
          <Link
            href={`/persons/${p.id}`}
            className={cn(
              "flex items-start justify-between gap-4 px-4 py-3 transition-colors",
              "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
            )}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <PersonKindIcon kind={p.kind} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{p.full_name}</div>
                <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {[p.phone, p.email].filter(Boolean).join(" · ") ||
                    "Sans contact"}
                </div>
              </div>
            </div>
            {p.kind === "entity" ? (
              <Badge variant="secondary" className="text-[10px]">
                Morale
              </Badge>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PersonKindIcon({ kind }: { kind: PersonKindInput }) {
  const Icon = kind === "entity" ? Building2 : User;
  return (
    <div
      aria-label={PERSON_KIND_LABELS[kind]}
      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
    >
      <Icon className="size-3.5" />
    </div>
  );
}

function PersonsListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 last:border-b-0 dark:border-zinc-800"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}
