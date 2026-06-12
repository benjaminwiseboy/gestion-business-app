"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, FileText, Pencil, Plus, Trash2 } from "lucide-react";
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
import { StatusBadge } from "@/components/status-badge";
import { AdminPaymentDialog } from "@/components/forms/admin-payment-dialog";
import {
  useAdminFile,
  useAdminFileRemainingFor,
  useDeleteAdminFile,
} from "@/hooks/use-admin-files";
import {
  useDeleteTransaction,
  useTransactionsFor,
} from "@/hooks/use-transactions";
import {
  ADMIN_FILE_STATUS_LABELS,
  ADMIN_FILE_TYPE_LABELS,
} from "@/domain/validators";
import { money, type CurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminFileDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: file, isLoading, isError, refetch } = useAdminFile(id);
  const { data: remaining } = useAdminFileRemainingFor(id);
  const txQuery = useTransactionsFor("admin_file", id);
  const deleteFileMutation = useDeleteAdminFile();
  const deleteTxMutation = useDeleteTransaction();
  const [payOpen, setPayOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!file) {
    return (
      <ErrorState
        title="Introuvable"
        description="Ce dossier n'existe pas ou a été supprimé."
      />
    );
  }

  const currency = (file.total_cost_currency ?? "XAF") as CurrencyCode;
  const total =
    file.total_cost_amount !== null
      ? money(file.total_cost_amount, currency)
      : null;
  const remainingMoney = remaining
    ? money(remaining.remaining_amount, currency)
    : null;
  const paidMoney = remaining
    ? money(remaining.paid_amount, currency)
    : money(0, currency);

  async function onDeleteFile() {
    if (!file) return;
    try {
      await deleteFileMutation.mutateAsync(file.id);
      toast.success("Dossier supprimé");
      router.push("/admin-files");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function onDeletePayment(txId: string) {
    try {
      await deleteTxMutation.mutateAsync(txId);
      toast.success("Paiement supprimé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin-files"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Dossiers
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <FileText className="size-5 text-zinc-500" />
              {file.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={
                  file.status === "done"
                    ? "done"
                    : file.status === "blocked"
                      ? "blocked"
                      : file.status === "awaiting_docs"
                        ? "awaiting_docs"
                        : file.status === "awaiting_payment"
                          ? "awaiting_payment"
                          : "processing"
                }
              />
              <Badge variant="outline" className="text-[10px] font-normal">
                {ADMIN_FILE_TYPE_LABELS[file.type]}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/admin-files/${file.id}/edit`} />}
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

      {total ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Coût total" value={total} />
          <SummaryCard label="Payé" value={paidMoney} />
          {remainingMoney ? (
            <SummaryCard label="Reste" value={remainingMoney} emphasis />
          ) : null}
        </div>
      ) : null}

      <dl className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900">
        <DetailField
          label="Bénéficiaire"
          value={
            file.beneficiary ? (
              <Link
                href={`/persons/${file.beneficiary.id}`}
                className="text-blue-600 hover:underline"
              >
                {file.beneficiary.full_name}
              </Link>
            ) : (
              <span className="text-zinc-400">—</span>
            )
          }
        />
        <DetailField
          label="Géomètre"
          value={
            file.surveyor ? (
              <Link
                href={`/persons/${file.surveyor.id}`}
                className="text-blue-600 hover:underline"
              >
                {file.surveyor.full_name}
              </Link>
            ) : (
              <span className="text-zinc-400">—</span>
            )
          }
        />
        {file.surface_m2 ? (
          <DetailField
            label="Surface"
            value={`${file.surface_m2.toLocaleString("fr-FR")} m²`}
          />
        ) : null}
        <DetailField
          label="Statut"
          value={ADMIN_FILE_STATUS_LABELS[file.status]}
        />
        {file.notes ? (
          <DetailField
            label="Notes"
            value={file.notes}
            className="sm:col-span-2"
          />
        ) : null}
      </dl>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight">Paiements</h3>
          <Button size="sm" onClick={() => setPayOpen(true)}>
            <Plus />
            Saisir un paiement
          </Button>
        </div>

        {txQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : txQuery.data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Aucun paiement enregistré.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {txQuery.data.map((tx) => (
              <li
                key={tx.id}
                className={cn(
                  "flex items-start justify-between gap-3 px-4 py-3",
                )}
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
                    aria-label="Supprimer ce paiement"
                    onClick={() => onDeletePayment(tx.id)}
                  >
                    <Trash2 className="text-red-500" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AdminPaymentDialog
        file={file}
        open={payOpen}
        onOpenChange={setPayOpen}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce dossier ?</DialogTitle>
            <DialogDescription>
              Le dossier sera masqué. Les paiements liés restent conservés dans
              le journal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteFile}
              disabled={deleteFileMutation.isPending}
            >
              {deleteFileMutation.isPending ? "Suppression…" : "Supprimer"}
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
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
