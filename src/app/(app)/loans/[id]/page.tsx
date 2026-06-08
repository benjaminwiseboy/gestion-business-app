"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import { StatusBadge } from "@/components/status-badge";
import { RepaymentDialog } from "@/components/forms/repayment-dialog";
import { useDeleteLoan, useLoan, useLoanRemainingFor } from "@/hooks/use-loans";
import {
  useDeleteTransaction,
  useTransactionsFor,
} from "@/hooks/use-transactions";
import { calculateAccruedInterest } from "@/domain/loans";
import { money, type CurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function LoanDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: loan, isLoading, isError, refetch } = useLoan(id);
  const { data: remaining } = useLoanRemainingFor(id);
  const txQuery = useTransactionsFor("loan", id);
  const deleteLoanMutation = useDeleteLoan();
  const deleteTxMutation = useDeleteTransaction();
  const [repayOpen, setRepayOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!loan) {
    return (
      <ErrorState
        title="Introuvable"
        description="Ce prêt n'existe pas ou a été supprimé."
      />
    );
  }

  const currency = loan.principal_currency as CurrencyCode;
  const principal = money(loan.principal_amount, currency);
  const remainingMoney = remaining
    ? money(remaining.remaining_amount, currency)
    : principal;
  const repaidMoney = remaining
    ? money(remaining.repaid_amount, currency)
    : money(0, currency);
  const accruedInterest = calculateAccruedInterest(loan);

  async function onDeleteLoan() {
    if (!loan) return;
    try {
      await deleteLoanMutation.mutateAsync(loan.id);
      toast.success("Prêt supprimé");
      router.push("/loans");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function onDeleteRepayment(txId: string) {
    try {
      await deleteTxMutation.mutateAsync(txId);
      toast.success("Remboursement supprimé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/loans"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Prêts &amp; dettes
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {loan.direction === "lent" ? (
                <ArrowUpRight className="size-5 text-emerald-600" />
              ) : (
                <ArrowDownLeft className="size-5 text-amber-600" />
              )}
              {loan.person?.full_name ?? "(personne supprimée)"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={loan.status} />
              <span className="text-xs text-zinc-500">
                {loan.direction === "lent" ? "Accordé" : "Reçu"} le{" "}
                {format(parseISO(loan.issue_date), "d MMMM yyyy", {
                  locale: fr,
                })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/loans/${loan.id}/edit`} />}
            >
              <Pencil />
              Modifier
            </Button>
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
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Principal" value={principal} />
        <SummaryCard label="Remboursé" value={repaidMoney} />
        <SummaryCard label="Reste à payer" value={remainingMoney} emphasis />
      </div>

      {loan.due_date || loan.interest_type ? (
        <dl className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900">
          {loan.due_date ? (
            <DetailField
              label="Échéance"
              value={format(parseISO(loan.due_date), "d MMMM yyyy", {
                locale: fr,
              })}
            />
          ) : null}
          {loan.interest_type && loan.interest_type !== "none" ? (
            <DetailField
              label={`Intérêts ${
                loan.interest_type === "simple" ? "simples" : "composés"
              } cumulés`}
              value={
                <MoneyDisplay
                  money={accruedInterest}
                  size="base"
                  showPivotEquivalent={false}
                />
              }
            />
          ) : null}
          {loan.notes ? (
            <DetailField
              label="Notes"
              value={loan.notes}
              className="sm:col-span-2"
            />
          ) : null}
        </dl>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight">
            Remboursements
          </h3>
          <Button size="sm" onClick={() => setRepayOpen(true)}>
            <Plus />
            Saisir un remboursement
          </Button>
        </div>

        {txQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : txQuery.data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Aucun remboursement enregistré.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {txQuery.data.map((tx) => (
              <li
                key={tx.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    {format(parseISO(tx.occurred_at), "d MMM yyyy", {
                      locale: fr,
                    })}
                  </div>
                  {tx.notes ? (
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {tx.notes}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <MoneyDisplay
                    money={money(tx.amount, tx.currency as CurrencyCode)}
                    size="base"
                    showPivotEquivalent={false}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Supprimer ce remboursement"
                    onClick={() => onDeleteRepayment(tx.id)}
                  >
                    <Trash2 className="text-red-500" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RepaymentDialog
        loan={loan}
        open={repayOpen}
        onOpenChange={setRepayOpen}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce prêt ?</DialogTitle>
            <DialogDescription>
              Le prêt sera masqué. Les remboursements liés restent conservés
              dans le journal des transactions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteLoan}
              disabled={deleteLoanMutation.isPending}
            >
              {deleteLoanMutation.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: ReturnType<typeof money>;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900",
        emphasis && "border-zinc-900 dark:border-zinc-100",
      )}
    >
      <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {label}
      </div>
      <div className="mt-1">
        <MoneyDisplay money={value} size="xl" showPivotEquivalent={false} />
      </div>
    </div>
  );
}

function DetailField({
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
