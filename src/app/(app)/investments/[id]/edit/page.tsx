"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { InvestmentForm } from "@/components/forms/investment-form";
import { useInvestment } from "@/hooks/use-investments";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditInvestmentPage({ params }: PageProps) {
  const { id } = use(params);
  const {
    data: investment,
    isLoading,
    isError,
    refetch,
  } = useInvestment(id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href={`/investments/${id}`}
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
      ) : !investment ? (
        <ErrorState
          title="Introuvable"
          description="Cet investissement n'existe pas ou a été supprimé."
        />
      ) : (
        <InvestmentForm initial={investment} />
      )}
    </div>
  );
}
