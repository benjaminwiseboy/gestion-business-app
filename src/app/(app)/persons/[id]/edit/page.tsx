"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { PersonForm } from "@/components/forms/person-form";
import { usePerson } from "@/hooks/use-persons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditPersonPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: person, isLoading, isError, refetch } = usePerson(id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href={`/persons/${id}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Retour
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Modifier</h2>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !person ? (
        <ErrorState
          title="Introuvable"
          description="Cette personne n'existe pas ou a été supprimée."
        />
      ) : (
        <PersonForm initial={person} />
      )}
    </div>
  );
}
