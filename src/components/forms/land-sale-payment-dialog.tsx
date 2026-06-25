"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
  LandPaymentFormSchema,
  type LandPaymentFormInput,
  type LandPaymentFormValues,
} from "@/domain/validators";
import { useCreateLandSalePayment } from "@/hooks/use-transactions";
import { formatMoney, money, type CurrencyCode } from "@/lib/money";
import type { Tables } from "@/lib/supabase/types";

type LandSale = Tables<"land_sales">;

interface LandSalePaymentDialogProps {
  sale: Pick<
    LandSale,
    | "id"
    | "land_id"
    | "buyer_person_id"
    | "total_amount"
    | "price_per_m2_currency"
  >;
  /** Reste à payer côté serveur (devise = sale.price_per_m2_currency). */
  remainingAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LandSalePaymentDialog({
  sale,
  remainingAmount,
  open,
  onOpenChange,
}: LandSalePaymentDialogProps) {
  const mutation = useCreateLandSalePayment();
  const saleCurrency =
    (sale.price_per_m2_currency as CurrencyCode) ?? "XAF";

  const form = useForm<LandPaymentFormInput, unknown, LandPaymentFormValues>({
    resolver: zodResolver(LandPaymentFormSchema),
    defaultValues: {
      amount: "",
      currency: saleCurrency,
      occurred_at: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: "",
        currency: saleCurrency,
        occurred_at: new Date().toISOString().slice(0, 10),
        notes: "",
      });
    }
  }, [open, saleCurrency, form]);

  const amountStr = form.watch("amount");
  const currency = form.watch("currency");
  const errors = form.formState.errors;

  // Validation : on ne contrôle l'excédent que si l'utilisateur paie dans la
  // même devise que la vente (sinon conversion nécessaire, hors scope).
  const amountNum = parseDec(amountStr);
  const overLimit =
    amountNum !== null &&
    currency === saleCurrency &&
    amountNum > remainingAmount + 0.0001;

  async function onSubmit(parsed: LandPaymentFormValues) {
    if (overLimit) {
      toast.error("Le paiement ne peut pas dépasser le reste à percevoir");
      return;
    }
    try {
      await mutation.mutateAsync({
        sale,
        amount: parseFloat(parsed.amount),
        currency: parsed.currency,
        occurred_at: parsed.occurred_at,
        notes: parsed.notes,
      });
      toast.success("Paiement enregistré");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encaisser un paiement</DialogTitle>
          <DialogDescription>
            Reste à percevoir :{" "}
            <strong>
              {formatMoney(money(remainingAmount, saleCurrency))}
            </strong>
            . La vente passe à « Soldée » quand le total dû est atteint.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ls_pay_amount">
                Montant <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ls_pay_amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                autoFocus
                className="tabular-nums"
                {...form.register("amount")}
              />
              {errors.amount ? (
                <p className="text-xs text-red-600">{errors.amount.message}</p>
              ) : overLimit ? (
                <p className="text-xs text-red-600">
                  Maximum {formatMoney(money(remainingAmount, saleCurrency))}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Devise</Label>
              <Select
                value={currency}
                onValueChange={(value) => {
                  if (value)
                    form.setValue("currency", value as "XAF" | "USD", {
                      shouldValidate: true,
                    });
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
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ls_pay_date">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ls_pay_date"
              type="date"
              {...form.register("occurred_at")}
            />
            {errors.occurred_at ? (
              <p className="text-xs text-red-600">
                {errors.occurred_at.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ls_pay_notes">Notes</Label>
            <Textarea
              id="ls_pay_notes"
              rows={2}
              placeholder="Mode de paiement, reçu, contexte..."
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
              disabled={mutation.isPending || overLimit}
            >
              {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseDec(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}
