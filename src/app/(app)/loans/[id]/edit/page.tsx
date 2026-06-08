"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { LoanForm } from "@/components/forms/loan-form";
import { useLoan } from "@/hooks/use-loans";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditLoanPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: loan, isLoading, isError, refetch } = useLoan(id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href={`/loans/${id}`}
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
      ) : !loan ? (
        <ErrorState
          title="Introuvable"
          description="Ce prêt n'existe pas ou a été supprimé."
        />
      ) : (
        <LoanForm initial={loan} />
      )}
    </div>
  );
}
