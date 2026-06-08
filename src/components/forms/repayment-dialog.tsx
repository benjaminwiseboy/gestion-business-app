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
  RepaymentFormSchema,
  type RepaymentFormInput,
  type RepaymentFormValues,
} from "@/domain/validators";
import { useCreateRepayment } from "@/hooks/use-transactions";
import type { Tables } from "@/lib/supabase/types";

type Loan = Tables<"loans">;

interface RepaymentDialogProps {
  loan: Pick<
    Loan,
    "id" | "person_id" | "due_date" | "principal_amount" | "principal_currency"
  >;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RepaymentDialog({
  loan,
  open,
  onOpenChange,
}: RepaymentDialogProps) {
  const mutation = useCreateRepayment();

  const form = useForm<RepaymentFormInput, unknown, RepaymentFormValues>({
    resolver: zodResolver(RepaymentFormSchema),
    defaultValues: {
      amount: "",
      currency: (loan.principal_currency as "XOF" | "USD") ?? "XOF",
      occurred_at: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: "",
        currency: (loan.principal_currency as "XOF" | "USD") ?? "XOF",
        occurred_at: new Date().toISOString().slice(0, 10),
        notes: "",
      });
    }
  }, [open, loan.principal_currency, form]);

  const currency = form.watch("currency");
  const errors = form.formState.errors;

  async function onSubmit(parsed: RepaymentFormValues) {
    try {
      await mutation.mutateAsync({
        loan,
        amount: parseFloat(parsed.amount),
        currency: parsed.currency,
        occurred_at: parsed.occurred_at,
        notes: parsed.notes,
      });
      toast.success("Remboursement enregistré");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer un remboursement</DialogTitle>
          <DialogDescription>
            Cette opération crée une transaction liée au prêt et met à jour son
            statut automatiquement.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="repay_amount">
                Montant <span className="text-red-500">*</span>
              </Label>
              <Input
                id="repay_amount"
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
                    form.setValue("currency", value as "XOF" | "USD", {
                      shouldValidate: true,
                    });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XOF">FCFA (XOF)</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repay_date">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="repay_date"
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
            <Label htmlFor="repay_notes">Notes</Label>
            <Textarea
              id="repay_notes"
              rows={2}
              placeholder="Mode de paiement, contexte..."
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
