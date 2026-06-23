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
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import Decimal from "decimal.js";
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
import { InvestmentMovementDialog } from "@/components/forms/investment-movement-dialog";
import {
  useDeleteInvestment,
  useInvestment,
  useInvestmentBalanceFor,
} from "@/hooks/use-investments";
import {
  useDeleteTransaction,
  useTransactionsFor,
} from "@/hooks/use-transactions";
import {
  INVESTMENT_TYPE_LABELS,
  type InvestmentMovementDirectionInput,
} from "@/domain/validators";
import { money, type CurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function InvestmentDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const {
    data: investment,
    isLoading,
    isError,
    refetch,
  } = useInvestment(id);
  const { data: balance } = useInvestmentBalanceFor(id);
  const txQuery = useTransactionsFor("investment", id);
  const deleteInvestmentMutation = useDeleteInvestment();
  const deleteTxMutation = useDeleteTransaction();
  const [movementDirection, setMovementDirection] =
    useState<InvestmentMovementDirectionInput | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!investment) {
    return (
      <ErrorState
        title="Introuvable"
        description="Cet investissement n'existe pas ou a été supprimé."
      />
    );
  }

  const currency = investment.principal_currency as CurrencyCode;
  const principal = money(investment.principal_amount, currency);
  const contributed = balance
    ? money(balance.contributed_amount, currency)
    : money(0, currency);
  const returned = balance
    ? money(balance.returned_amount, currency)
    : money(0, currency);
  const net = balance ? money(balance.net_amount, currency) : money(0, currency);
  const roi = computeRoi(
    balance?.contributed_amount,
    balance?.net_amount,
  );

  async function onDeleteInvestment() {
    if (!investment) return;
    try {
      await deleteInvestmentMutation.mutateAsync(investment.id);
      toast.success("Investissement supprimé");
      router.push("/investments");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function onDeleteMovement(txId: string) {
    try {
      await deleteTxMutation.mutateAsync(txId);
      toast.success("Mouvement supprimé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/investments"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Investissements
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <TrendingUp className="size-5 text-zinc-500" />
              {investment.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={investment.status} />
              <Badge variant="outline" className="text-[10px] font-normal">
                {INVESTMENT_TYPE_LABELS[investment.type]}
              </Badge>
              {investment.counterparty ? (
                <Link
                  href={`/persons/${investment.counterparty.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {investment.counterparty.full_name}
                </Link>
              ) : (
                <span className="text-xs text-zinc-500">Sans contrepartie</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/investments/${investment.id}/edit`} />}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Mise initiale" value={principal} />
        <SummaryCard label="Total apporté" value={contributed} />
        <SummaryCard label="Total reçu" value={returned} />
        <SummaryCard
          label="Solde net"
          value={net}
          emphasis
          tone={
            net.amount.gt(0) ? "profit" : net.amount.lt(0) ? "loss" : undefined
          }
          extra={roi !== null ? `ROI ${(roi * 100).toFixed(1)} %` : undefined}
        />
      </div>

      <dl className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-900">
        <DetailField
          label="Date de début"
          value={format(parseISO(investment.start_date), "d MMM yyyy", {
            locale: fr,
          })}
        />
        <DetailField
          label="Date de fin prévue"
          value={
            investment.end_date
              ? format(parseISO(investment.end_date), "d MMM yyyy", {
                  locale: fr,
                })
              : "—"
          }
        />
        <DetailField
          label="Rendement attendu"
          value={
            investment.expected_return_pct != null
              ? `${investment.expected_return_pct} %`
              : "—"
          }
        />
        {investment.notes ? (
          <DetailField
            label="Notes"
            value={investment.notes}
            className="sm:col-span-3"
          />
        ) : null}
      </dl>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight">Mouvements</h3>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setMovementDirection("in")}>
              <ArrowUpRight />
              Apport
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMovementDirection("out")}
            >
              <ArrowDownLeft />
              Retour
            </Button>
          </div>
        </div>

        {txQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : txQuery.data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Aucun mouvement enregistré.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {txQuery.data.map((tx) => {
              const isIn = tx.kind === "investment_in";
              return (
                <li
                  key={tx.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      {isIn ? (
                        <ArrowUpRight className="size-4 text-blue-600" />
                      ) : (
                        <ArrowDownLeft className="size-4 text-emerald-600" />
                      )}
                      <span className="font-medium">
                        {isIn ? "Apport" : "Retour"}
                      </span>
                      <span className="text-zinc-500">
                        ·{" "}
                        {format(parseISO(tx.occurred_at), "d MMM yyyy", {
                          locale: fr,
                        })}
                      </span>
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
                      className={cn(
                        isIn
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-emerald-700 dark:text-emerald-300",
                      )}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Supprimer ce mouvement"
                      onClick={() => onDeleteMovement(tx.id)}
                    >
                      <Trash2 className="text-red-500" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <InvestmentMovementDialog
        investment={investment}
        direction={movementDirection ?? "in"}
        open={movementDirection !== null}
        onOpenChange={(open) => {
          if (!open) setMovementDirection(null);
        }}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cet investissement ?</DialogTitle>
            <DialogDescription>
              L'investissement sera masqué. Les mouvements restent conservés
              dans le journal des transactions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteInvestment}
              disabled={deleteInvestmentMutation.isPending}
            >
              {deleteInvestmentMutation.isPending
                ? "Suppression…"
                : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function computeRoi(
  contributed: number | undefined,
  net: number | undefined,
): number | null {
  if (contributed == null || net == null) return null;
  const c = new Decimal(contributed);
  if (c.isZero()) return null;
  return new Decimal(net).div(c).toNumber();
}

function SummaryCard({
  label,
  value,
  emphasis,
  tone,
  extra,
}: {
  label: string;
  value: ReturnType<typeof money>;
  emphasis?: boolean;
  tone?: "profit" | "loss";
  extra?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900",
        emphasis && "border-zinc-900 dark:border-zinc-100",
        tone === "profit" &&
          "border-emerald-300 dark:border-emerald-700",
        tone === "loss" && "border-red-300 dark:border-red-800",
      )}
    >
      <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {label}
      </div>
      <div className="mt-1">
        <MoneyDisplay
          money={value}
          size="xl"
          showPivotEquivalent={false}
          className={cn(
            tone === "profit" && "text-emerald-700 dark:text-emerald-300",
            tone === "loss" && "text-red-700 dark:text-red-300",
          )}
        />
      </div>
      {extra ? (
        <div
          className={cn(
            "mt-1 text-xs",
            tone === "profit"
              ? "text-emerald-700 dark:text-emerald-300"
              : tone === "loss"
                ? "text-red-700 dark:text-red-300"
                : "text-zinc-500",
          )}
        >
          {extra}
        </div>
      ) : null}
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
