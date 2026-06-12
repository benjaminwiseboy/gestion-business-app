"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { MoneyDisplay } from "@/components/money-display";
import { useDeleteTransaction, useTransaction } from "@/hooks/use-transactions";
import { TRANSACTION_KIND_LABELS } from "@/domain/validators";
import { money, type CurrencyCode } from "@/lib/money";
import type { LinkedEntityType } from "@/lib/supabase/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

const LINKED_ENTITY_ROUTES: Record<LinkedEntityType, string> = {
  loan: "/loans",
  land_project: "/land",
  admin_file: "/admin-files",
  investment: "/investments",
};

const LINKED_ENTITY_LABELS: Record<LinkedEntityType, string> = {
  loan: "Prêt",
  land_project: "Projet foncier",
  admin_file: "Dossier",
  investment: "Investissement",
};

export default function TransactionDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: tx, isLoading, isError, refetch } = useTransaction(id);
  const deleteMutation = useDeleteTransaction();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!tx) {
    return (
      <ErrorState
        title="Introuvable"
        description="Cette transaction n'existe pas ou a été supprimée."
      />
    );
  }

  const currency = tx.currency as CurrencyCode;
  const amount = money(tx.amount, currency);

  async function onDelete() {
    if (!tx) return;
    try {
      await deleteMutation.mutateAsync(tx.id);
      toast.success("Transaction supprimée");
      router.push("/transactions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  const linkedHref =
    tx.linked_entity_type && tx.linked_entity_id
      ? `${LINKED_ENTITY_ROUTES[tx.linked_entity_type]}/${tx.linked_entity_id}`
      : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Transactions
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge variant="secondary" className="text-[10px]">
              {TRANSACTION_KIND_LABELS[tx.kind] ?? tx.kind}
            </Badge>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              <MoneyDisplay
                money={amount}
                size="xl"
                rateToPivot={tx.exchange_rate_snapshot}
              />
            </h2>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 />
            Supprimer
          </Button>
        </div>
      </div>

      <dl className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900">
        <Field
          label="Date"
          value={format(parseISO(tx.occurred_at), "EEEE d MMMM yyyy", {
            locale: fr,
          })}
        />
        <Field
          label="Personne"
          value={
            tx.person ? (
              <Link
                href={`/persons/${tx.person.id}`}
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                {tx.person.full_name}
                <ExternalLink className="size-3" />
              </Link>
            ) : (
              <span className="text-zinc-400">—</span>
            )
          }
        />
        {linkedHref && tx.linked_entity_type ? (
          <Field
            label="Lié à"
            value={
              <Link
                href={linkedHref}
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                {LINKED_ENTITY_LABELS[tx.linked_entity_type]}
                <ExternalLink className="size-3" />
              </Link>
            }
          />
        ) : null}
        {tx.exchange_rate_snapshot && currency !== "XAF" ? (
          <Field
            label="Taux figé"
            value={`1 ${currency} = ${tx.exchange_rate_snapshot} XAF`}
          />
        ) : null}
        {tx.notes ? (
          <Field label="Notes" value={tx.notes} className="sm:col-span-2" />
        ) : null}
      </dl>

      <div className="text-xs text-zinc-400">
        Enregistrée le{" "}
        {format(parseISO(tx.created_at), "d MMM yyyy à HH:mm", {
          locale: fr,
        })}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette transaction ?</DialogTitle>
            <DialogDescription>
              Si elle était liée à un prêt, le reste à payer sera recalculé et
              le statut du prêt peut changer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm whitespace-pre-line text-zinc-900 dark:text-zinc-100">
        {value}
      </dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
