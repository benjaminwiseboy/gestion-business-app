"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import Decimal from "decimal.js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LandSaleFormSchema,
  type LandSaleFormInput,
  type LandSaleFormValues,
} from "@/domain/validators";
import {
  useCreateLandSale,
  useUpdateLandSale,
} from "@/hooks/use-land-sales";
import { useCreateLandSalePayment } from "@/hooks/use-transactions";
import { usePersons } from "@/hooks/use-persons";
import { QuickPersonDialog } from "@/components/forms/quick-person-dialog";
import { formatMoney, money } from "@/lib/money";
import type { Tables } from "@/lib/supabase/types";

type LandSale = Tables<"land_sales">;

interface LandSaleDialogProps {
  landId: string;
  /** Surface restante disponible sur le terrain (m²). */
  availableSurfaceM2: number;
  /** Pour édition d'une vente existante. */
  initial?: LandSale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LandSaleDialog({
  landId,
  availableSurfaceM2,
  initial,
  open,
  onOpenChange,
}: LandSaleDialogProps) {
  const createMutation = useCreateLandSale();
  const updateMutation = useUpdateLandSale();
  const initialPaymentMutation = useCreateLandSalePayment();
  const personsQuery = usePersons();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const form = useForm<LandSaleFormInput, unknown, LandSaleFormValues>({
    resolver: zodResolver(LandSaleFormSchema),
    defaultValues: defaultValues(initial),
  });

  useEffect(() => {
    if (open) form.reset(defaultValues(initial));
  }, [open, initial, form]);

  const buyerId = form.watch("buyer_person_id");
  const surfaceStr = form.watch("surface_m2");
  const priceStr = form.watch("price_per_m2_amount");
  const currency = form.watch("price_per_m2_currency");
  const status = form.watch("status");
  const initialPaidStr = form.watch("initial_paid_amount");
  const errors = form.formState.errors;

  const surface = parseDec(surfaceStr);
  const price = parseDec(priceStr);
  const total =
    surface && price ? new Decimal(surface).mul(price) : null;
  const initialPaid = parseDec(initialPaidStr);

  // Max surface available = current available + the surface this sale already
  // occupies (so editing doesn't double-count itself).
  const maxSurface =
    availableSurfaceM2 + (initial ? Number(initial.surface_m2) : 0);

  const overLimitSurface = surface !== null && surface > maxSurface + 0.0001;
  const overLimitPayment =
    initialPaid !== null && total !== null && initialPaid > total.toNumber() + 0.0001;

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    initialPaymentMutation.isPending;

  async function onSubmit(parsed: LandSaleFormValues) {
    if (overLimitSurface) {
      toast.error("Surface supérieure à la surface disponible");
      return;
    }
    if (overLimitPayment) {
      toast.error("L'acompte ne peut pas dépasser le total de la vente");
      return;
    }
    try {
      const payload = {
        land_id: landId,
        buyer_person_id: parsed.buyer_person_id,
        surface_m2: parseFloat(parsed.surface_m2),
        price_per_m2_amount: parseFloat(parsed.price_per_m2_amount),
        price_per_m2_currency: parsed.price_per_m2_currency,
        sale_date: parsed.sale_date,
        status: parsed.status,
        notes: parsed.notes,
      };
      if (initial) {
        await updateMutation.mutateAsync({ id: initial.id, input: payload });
        toast.success("Vente mise à jour");
      } else {
        const created = await createMutation.mutateAsync(payload);
        // Si un acompte initial est saisi, on enregistre un paiement
        // immédiatement après la création de la vente.
        const initialAmount = parsed.initial_paid_amount
          ? parseFloat(parsed.initial_paid_amount)
          : 0;
        if (initialAmount > 0) {
          await initialPaymentMutation.mutateAsync({
            sale: {
              id: created.id,
              land_id: created.land_id,
              buyer_person_id: created.buyer_person_id,
              total_amount: Number(created.total_amount),
              price_per_m2_currency: created.price_per_m2_currency,
            },
            amount: initialAmount,
            currency: parsed.price_per_m2_currency,
            occurred_at: parsed.sale_date,
            notes: "Acompte initial",
          });
        }
        toast.success("Vente enregistrée");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Modifier la vente" : "Nouvelle vente"}
          </DialogTitle>
          <DialogDescription>
            Surface disponible : <strong>{maxSurface.toLocaleString("fr-FR")} m²</strong>
            {initial
              ? null
              : ". Si l'acheteur paie en plusieurs fois, ce qui reste à percevoir devient une créance."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label>Acheteur</Label>
            <div className="flex gap-2">
              <Select
                value={buyerId ?? ""}
                onValueChange={(value) => {
                  if (value !== null && value !== undefined)
                    form.setValue("buyer_person_id", value, {
                      shouldValidate: true,
                    });
                }}
                disabled={personsQuery.isLoading}
              >
                <SelectTrigger className="w-full flex-1">
                  <SelectValue>
                    {personsLabel(
                      buyerId ?? "",
                      personsQuery.data,
                      personsQuery.isLoading,
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(personsQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuickAddOpen(true)}
                aria-label="Ajouter une personne"
              >
                <UserPlus />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sale_surface">
                Surface (m²) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sale_surface"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                className="tabular-nums"
                {...form.register("surface_m2")}
              />
              {errors.surface_m2 ? (
                <p className="text-xs text-red-600">
                  {errors.surface_m2.message}
                </p>
              ) : overLimitSurface ? (
                <p className="text-xs text-red-600">
                  Maximum {maxSurface.toLocaleString("fr-FR")} m²
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sale_price">
                Prix au m² <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sale_price"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                className="tabular-nums"
                {...form.register("price_per_m2_amount")}
              />
              {errors.price_per_m2_amount ? (
                <p className="text-xs text-red-600">
                  {errors.price_per_m2_amount.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Devise</Label>
              <Select
                value={currency}
                onValueChange={(value) => {
                  if (value)
                    form.setValue(
                      "price_per_m2_currency",
                      value as "XAF" | "USD",
                      { shouldValidate: true },
                    );
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {currency === "XAF" ? "FCFA (XAF)" : currency}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XAF">FCFA (XAF)</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sale_date">
                Date de vente <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sale_date"
                type="date"
                {...form.register("sale_date")}
              />
              {errors.sale_date ? (
                <p className="text-xs text-red-600">
                  {errors.sale_date.message}
                </p>
              ) : null}
            </div>
          </div>

          {total ? (
            <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/50">
              Total vente :{" "}
              <span className="font-medium tabular-nums">
                {formatMoney(money(total, currency))}
              </span>
            </div>
          ) : null}

          {!initial ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="initial_paid">
                Acompte déjà versé{" "}
                <span className="text-xs font-normal text-zinc-500">
                  (optionnel)
                </span>
              </Label>
              <Input
                id="initial_paid"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0 — laisse vide si l'acheteur n'a rien versé"
                className="tabular-nums"
                {...form.register("initial_paid_amount")}
              />
              {errors.initial_paid_amount ? (
                <p className="text-xs text-red-600">
                  {errors.initial_paid_amount.message}
                </p>
              ) : overLimitPayment ? (
                <p className="text-xs text-red-600">
                  Ne peut pas dépasser le total ({total ? formatMoney(money(total, currency)) : "—"})
                </p>
              ) : initialPaid !== null && total !== null ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Reste à percevoir :{" "}
                  <span className="font-medium tabular-nums">
                    {formatMoney(
                      money(total.minus(initialPaid).toNumber(), currency),
                    )}
                  </span>{" "}
                  → créance enregistrée
                </p>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Si l&apos;acheteur paie en plusieurs fois, le reste devient
                  une créance suivie via la vente.
                </p>
              )}
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label>Statut</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                if (value)
                  form.setValue(
                    "status",
                    value as LandSaleFormValues["status"],
                    { shouldValidate: true },
                  );
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{STATUS_LABELS[status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(["active", "settled", "blocked"] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sale_notes">Notes</Label>
            <Textarea
              id="sale_notes"
              rows={2}
              placeholder="Conditions, échéancier..."
              {...form.register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending || overLimitSurface || overLimitPayment}
            >
              {isPending ? "Enregistrement…" : initial ? "Enregistrer" : "Créer la vente"}
            </Button>
          </DialogFooter>
        </form>

        <QuickPersonDialog
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          onCreated={(p) =>
            form.setValue("buyer_person_id", p.id, { shouldValidate: true })
          }
        />
      </DialogContent>
    </Dialog>
  );
}

const STATUS_LABELS = {
  active: "En cours",
  settled: "Soldée",
  blocked: "Bloquée",
} as const;

function defaultValues(initial: LandSale | undefined): LandSaleFormInput {
  return {
    buyer_person_id: initial?.buyer_person_id ?? "",
    surface_m2: initial?.surface_m2 != null ? String(initial.surface_m2) : "",
    price_per_m2_amount:
      initial?.price_per_m2_amount != null
        ? String(initial.price_per_m2_amount)
        : "",
    price_per_m2_currency: (initial?.price_per_m2_currency ?? "XAF") as
      | "XAF"
      | "USD",
    sale_date: initial?.sale_date ?? new Date().toISOString().slice(0, 10),
    initial_paid_amount: "",
    status: initial?.status ?? "active",
    notes: initial?.notes ?? "",
  };
}

function parseDec(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function personsLabel(
  id: string,
  persons: { id: string; full_name: string }[] | undefined,
  isLoading: boolean,
) {
  if (!id)
    return (
      <span className="text-muted-foreground">
        {isLoading ? "Chargement…" : "Sans acheteur"}
      </span>
    );
  const p = persons?.find((p) => p.id === id);
  return p?.full_name ?? <span className="text-muted-foreground">Inconnu</span>;
}
