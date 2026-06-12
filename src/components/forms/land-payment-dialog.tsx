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
import { useCreateLandPayment } from "@/hooks/use-transactions";
import type { Tables } from "@/lib/supabase/types";

type LandProject = Tables<"land_projects">;

interface LandPaymentDialogProps {
  project: Pick<
    LandProject,
    "id" | "client_person_id" | "total_amount" | "price_per_m2_currency"
  >;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LandPaymentDialog({
  project,
  open,
  onOpenChange,
}: LandPaymentDialogProps) {
  const mutation = useCreateLandPayment();

  const form = useForm<LandPaymentFormInput, unknown, LandPaymentFormValues>({
    resolver: zodResolver(LandPaymentFormSchema),
    defaultValues: {
      amount: "",
      currency: (project.price_per_m2_currency as "XOF" | "USD") ?? "XOF",
      occurred_at: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: "",
        currency: (project.price_per_m2_currency as "XOF" | "USD") ?? "XOF",
        occurred_at: new Date().toISOString().slice(0, 10),
        notes: "",
      });
    }
  }, [open, project.price_per_m2_currency, form]);

  const currency = form.watch("currency");
  const errors = form.formState.errors;

  async function onSubmit(parsed: LandPaymentFormValues) {
    try {
      await mutation.mutateAsync({
        project,
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
          <DialogTitle>Saisir un paiement foncier</DialogTitle>
          <DialogDescription>
            Le montant est déduit du total dû. Le statut du projet passe à «
            Soldé » dès que le reste atteint 0.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="land_amount">
                Montant <span className="text-red-500">*</span>
              </Label>
              <Input
                id="land_amount"
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
                  <SelectValue>
                    {currency === "XOF" ? "FCFA (XOF)" : currency}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XOF">FCFA (XOF)</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="land_date">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="land_date"
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
            <Label htmlFor="land_notes">Notes</Label>
            <Textarea
              id="land_notes"
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
