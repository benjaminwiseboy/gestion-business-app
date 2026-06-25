"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Wallet,
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
import { LandSaleDialog } from "@/components/forms/land-sale-dialog";
import { LandSalePaymentDialog } from "@/components/forms/land-sale-payment-dialog";
import {
  useDeleteLand,
  useLand,
  useLandInventoryFor,
} from "@/hooks/use-lands";
import {
  useDeleteLandSale,
  useLandSales,
  useLandSaleRemaining,
  type LandSaleWithBuyer,
} from "@/hooks/use-land-sales";
import { useAdminFilesForLand } from "@/hooks/use-admin-files";
import {
  ADMIN_FILE_TYPE_LABELS,
  LAND_ACQUISITION_STATUS_LABELS,
} from "@/domain/validators";
import { money, type CurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function LandDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: land, isLoading, isError, refetch } = useLand(id);
  const { data: inventory } = useLandInventoryFor(id);
  const salesQuery = useLandSales(id);
  const saleRemainingQuery = useLandSaleRemaining();
  const dossiersQuery = useAdminFilesForLand(id);

  const deleteLandMutation = useDeleteLand();
  const deleteSaleMutation = useDeleteLandSale();

  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [editSale, setEditSale] = useState<LandSaleWithBuyer | null>(null);
  const [payingSale, setPayingSale] = useState<LandSaleWithBuyer | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteSale, setConfirmDeleteSale] =
    useState<LandSaleWithBuyer | null>(null);

  if (isLoading) return <DetailSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!land) {
    return (
      <ErrorState
        title="Introuvable"
        description="Ce terrain n'existe pas ou a été supprimé."
      />
    );
  }

  const totalSurface = Number(land.total_surface_m2);
  const soldSurface = inventory ? Number(inventory.sold_surface_m2) : 0;
  const remainingSurface = inventory
    ? Number(inventory.remaining_surface_m2)
    : totalSurface;
  const soldPercent = totalSurface > 0 ? (soldSurface / totalSurface) * 100 : 0;

  const sales = salesQuery.data ?? [];
  const dossiers = dossiersQuery.data ?? [];

  // Total encaissé par devise (somme des paiements)
  const totalCollected = computeTotalCollected(sales, saleRemainingQuery.data);

  async function onDeleteLand() {
    if (!land) return;
    if (sales.length > 0) {
      toast.error("Supprime d'abord les ventes liées à ce terrain.");
      setConfirmDeleteOpen(false);
      return;
    }
    try {
      await deleteLandMutation.mutateAsync(land.id);
      toast.success("Terrain supprimé");
      router.push("/land");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function onDeleteSale() {
    if (!confirmDeleteSale) return;
    try {
      await deleteSaleMutation.mutateAsync({
        id: confirmDeleteSale.id,
        land_id: confirmDeleteSale.land_id,
      });
      toast.success("Vente supprimée");
      setConfirmDeleteSale(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/land"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Foncier
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <MapPin className="size-5 text-zinc-500" />
              {land.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={land.acquisition_status} />
              {land.location ? (
                <span className="text-xs text-zinc-500">{land.location}</span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/land/${land.id}/edit`} />}
            >
              <Pencil />
              Modifier
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 />
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Surface totale"
          value={`${totalSurface.toLocaleString("fr-FR")} m²`}
        />
        <SummaryCard
          label="Vendue"
          value={`${soldSurface.toLocaleString("fr-FR")} m²`}
          sub={`${soldPercent.toFixed(0)}% du terrain`}
        />
        <SummaryCard
          label="Restante"
          value={`${remainingSurface.toLocaleString("fr-FR")} m²`}
          emphasis={remainingSurface > 0}
        />
      </div>

      {/* Acquisition */}
      <Section title="Acquisition">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Statut">
            {LAND_ACQUISITION_STATUS_LABELS[land.acquisition_status]}
          </Field>
          <Field
            label={
              land.acquisition_status === "owned"
                ? "Date d'acquisition"
                : "Date prévue"
            }
          >
            {land.acquisition_date
              ? format(parseISO(land.acquisition_date), "d MMM yyyy", {
                  locale: fr,
                })
              : "—"}
          </Field>
          <Field
            label={
              land.acquisition_status === "owned"
                ? "Prix d'achat au m²"
                : "Prix prévu au m²"
            }
          >
            {land.acquisition_price_per_m2 != null &&
            land.acquisition_currency ? (
              <div className="flex flex-col gap-0.5">
                <MoneyDisplay
                  money={money(
                    land.acquisition_price_per_m2,
                    land.acquisition_currency as CurrencyCode,
                  )}
                  size="base"
                  showPivotEquivalent={false}
                />
                <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  Total :{" "}
                  <MoneyDisplay
                    money={money(
                      new Decimal(land.acquisition_price_per_m2)
                        .mul(land.total_surface_m2)
                        .toNumber(),
                      land.acquisition_currency as CurrencyCode,
                    )}
                    size="sm"
                    showPivotEquivalent={false}
                    className="inline-flex"
                  />
                </span>
              </div>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Vendeur">
            {land.seller ? (
              <Link
                href={`/persons/${land.seller.id}`}
                className="text-blue-600 hover:underline"
              >
                {land.seller.full_name}
              </Link>
            ) : (
              "—"
            )}
          </Field>
        </dl>
      </Section>

      {/* Ventes */}
      <Section
        title="Ventes"
        count={sales.length}
        action={
          remainingSurface > 0 ? (
            <Button size="sm" onClick={() => setNewSaleOpen(true)}>
              <Plus />
              Nouvelle vente
            </Button>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Tout vendu
            </Badge>
          )
        }
      >
        {salesQuery.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : sales.length === 0 ? (
          <EmptyMini text="Aucune vente enregistrée pour ce terrain." />
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {sales.map((sale) => {
              const remaining = saleRemainingQuery.data?.[sale.id];
              const currency = sale.price_per_m2_currency as CurrencyCode;
              const hasRemaining =
                remaining && remaining.remaining_amount > 0;
              return (
                <li key={sale.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {sale.buyer?.full_name ?? "Sans acheteur"}
                        </span>
                        <StatusBadge
                          status={
                            sale.status === "settled"
                              ? "settled"
                              : sale.status === "blocked"
                                ? "blocked"
                                : "active"
                          }
                        />
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                        {sale.surface_m2.toLocaleString("fr-FR")} m² ·{" "}
                        {format(parseISO(sale.sale_date), "d MMM yyyy", {
                          locale: fr,
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <MoneyDisplay
                        money={money(sale.total_amount, currency)}
                        size="base"
                        showPivotEquivalent={false}
                      />
                      {hasRemaining ? (
                        <div className="mt-0.5 text-xs text-amber-700 tabular-nums dark:text-amber-300">
                          Reste{" "}
                          <MoneyDisplay
                            money={money(
                              remaining.remaining_amount,
                              currency,
                            )}
                            size="sm"
                            showPivotEquivalent={false}
                            className="inline-flex"
                          />
                        </div>
                      ) : (
                        <div className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                          ✓ Soldée
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hasRemaining ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPayingSale(sale)}
                      >
                        <Wallet />
                        Encaisser
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditSale(sale)}
                    >
                      <Pencil />
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDeleteSale(sale)}
                    >
                      <Trash2 className="text-red-500" />
                      Supprimer
                    </Button>
                  </div>
                  {sale.notes ? (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {sale.notes}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {sales.length > 0 ? (
          <div className="mt-3 flex justify-end text-xs text-zinc-500 dark:text-zinc-400">
            Total encaissé :{" "}
            {Object.entries(totalCollected).map(([cur, amount], i) => (
              <span key={cur} className="ml-2 font-medium tabular-nums">
                {i > 0 ? "· " : ""}
                <MoneyDisplay
                  money={money(amount, cur as CurrencyCode)}
                  size="sm"
                  showPivotEquivalent={false}
                  className="inline-flex"
                />
              </span>
            ))}
          </div>
        ) : null}
      </Section>

      {/* Dossiers admin */}
      <Section
        title="Dossiers"
        count={dossiers.length}
        action={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/admin-files/new?land_id=${land.id}`} />}
          >
            <Plus />
            Nouveau dossier
          </Button>
        }
      >
        {dossiersQuery.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : dossiers.length === 0 ? (
          <EmptyMini text="Aucun dossier rattaché à ce terrain." />
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {dossiers.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/admin-files/${d.id}`}
                  className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="size-4 text-zinc-500" />
                      <span className="font-medium">{d.title}</span>
                      <StatusBadge
                        status={
                          d.status === "done"
                            ? "done"
                            : d.status === "blocked"
                              ? "blocked"
                              : d.status === "awaiting_docs"
                                ? "awaiting_docs"
                                : d.status === "awaiting_payment"
                                  ? "awaiting_payment"
                                  : "processing"
                        }
                      />
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {ADMIN_FILE_TYPE_LABELS[d.type]}
                    </div>
                  </div>
                  {d.total_cost_amount && d.total_cost_currency ? (
                    <MoneyDisplay
                      money={money(
                        d.total_cost_amount,
                        d.total_cost_currency as CurrencyCode,
                      )}
                      size="sm"
                      showPivotEquivalent={false}
                    />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Notes */}
      {land.notes ? (
        <Section title="Notes">
          <p className="text-sm whitespace-pre-line">{land.notes}</p>
        </Section>
      ) : null}

      {/* Dialogs */}
      <LandSaleDialog
        landId={land.id}
        availableSurfaceM2={remainingSurface}
        open={newSaleOpen}
        onOpenChange={setNewSaleOpen}
      />
      {editSale ? (
        <LandSaleDialog
          landId={land.id}
          availableSurfaceM2={remainingSurface}
          initial={editSale}
          open={editSale !== null}
          onOpenChange={(open) => {
            if (!open) setEditSale(null);
          }}
        />
      ) : null}
      {payingSale ? (
        <LandSalePaymentDialog
          sale={payingSale}
          remainingAmount={Number(
            saleRemainingQuery.data?.[payingSale.id]?.remaining_amount ??
              payingSale.total_amount,
          )}
          open={payingSale !== null}
          onOpenChange={(open) => {
            if (!open) setPayingSale(null);
          }}
        />
      ) : null}

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce terrain ?</DialogTitle>
            <DialogDescription>
              Le terrain sera masqué. Les ventes/dossiers liés doivent être
              supprimés au préalable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteLand}
              disabled={deleteLandMutation.isPending}
            >
              {deleteLandMutation.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDeleteSale !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteSale(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette vente ?</DialogTitle>
            <DialogDescription>
              Les paiements liés restent conservés dans le journal des
              transactions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDeleteSale(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteSale}
              disabled={deleteSaleMutation.isPending}
            >
              {deleteSaleMutation.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function computeTotalCollected(
  sales: LandSaleWithBuyer[],
  remaining:
    | Record<string, { currency: string; total_amount: number; remaining_amount: number }>
    | undefined,
): Record<string, Decimal> {
  const out: Record<string, Decimal> = {};
  for (const sale of sales) {
    const cur = sale.price_per_m2_currency;
    const row = remaining?.[sale.id];
    const collected = row
      ? new Decimal(row.total_amount).minus(row.remaining_amount)
      : new Decimal(0);
    out[cur] = (out[cur] ?? new Decimal(0)).plus(collected);
  }
  return out;
}

function SummaryCard({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
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
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {sub ? (
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {title}
          {count !== undefined && count > 0 ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              {count}
            </Badge>
          ) : null}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
        {children}
      </dd>
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 px-4 py-5 text-center text-sm text-zinc-500 dark:border-zinc-700">
      {text}
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
