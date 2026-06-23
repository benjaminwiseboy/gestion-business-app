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
  InvestmentMovementFormSchema,
  type InvestmentMovementDirectionInput,
  type InvestmentMovementFormInput,
  type InvestmentMovementFormValues,
} from "@/domain/validators";
import { useCreateInvestmentMovement } from "@/hooks/use-transactions";
import type { Tables } from "@/lib/supabase/types";

type Investment = Tables<"investments">;

interface InvestmentMovementDialogProps {
  investment: Pick<
    Investment,
    "id" | "counterparty_person_id" | "principal_currency"
  >;
  direction: InvestmentMovementDirectionInput;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvestmentMovementDialog({
  investment,
  direction,
  open,
  onOpenChange,
}: InvestmentMovementDialogProps) {
  const mutation = useCreateInvestmentMovement();
  const defaultCurrency =
    (investment.principal_currency as "XAF" | "USD") ?? "XAF";

  const form = useForm<
    InvestmentMovementFormInput,
    unknown,
    InvestmentMovementFormValues
  >({
    resolver: zodResolver(InvestmentMovementFormSchema),
    defaultValues: {
      direction,
      amount: "",
      currency: defaultCurrency,
      occurred_at: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        direction,
        amount: "",
        currency: defaultCurrency,
        occurred_at: new Date().toISOString().slice(0, 10),
        notes: "",
      });
    }
  }, [open, defaultCurrency, direction, form]);

  const currency = form.watch("currency");
  const errors = form.formState.errors;

  const isApport = direction === "in";
  const title = isApport ? "Saisir un apport" : "Saisir un retour";
  const description = isApport
    ? "Argent injecté dans cet investissement (cotisation, ajout de capital…)."
    : "Argent reçu de cet investissement (dividende, pot de tontine, remboursement…).";

  async function onSubmit(parsed: InvestmentMovementFormValues) {
    try {
      await mutation.mutateAsync({
        investment,
        direction: parsed.direction,
        amount: parseFloat(parsed.amount),
        currency: parsed.currency,
        occurred_at: parsed.occurred_at,
        notes: parsed.notes,
      });
      toast.success(isApport ? "Apport enregistré" : "Retour enregistré");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv_mvt_amount">
                Montant <span className="text-red-500">*</span>
              </Label>
              <Input
                id="inv_mvt_amount"
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
            <Label htmlFor="inv_mvt_date">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="inv_mvt_date"
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
            <Label htmlFor="inv_mvt_notes">Notes</Label>
            <Textarea
              id="inv_mvt_notes"
              rows={2}
              placeholder={
                isApport
                  ? "Numéro de cotisation, motif, justificatif..."
                  : "Type de retour (dividende, pot, remboursement)..."
              }
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
