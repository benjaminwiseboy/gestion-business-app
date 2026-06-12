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
  AdminPaymentFormSchema,
  type AdminPaymentFormInput,
  type AdminPaymentFormValues,
} from "@/domain/validators";
import { useCreateAdminPayment } from "@/hooks/use-transactions";
import type { Tables } from "@/lib/supabase/types";

type AdminFile = Tables<"admin_files">;

interface AdminPaymentDialogProps {
  file: Pick<
    AdminFile,
    | "id"
    | "beneficiary_person_id"
    | "surveyor_person_id"
    | "total_cost_amount"
    | "total_cost_currency"
  >;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminPaymentDialog({
  file,
  open,
  onOpenChange,
}: AdminPaymentDialogProps) {
  const mutation = useCreateAdminPayment();
  const defaultCurrency =
    (file.total_cost_currency as "XAF" | "USD" | null) ?? "XAF";

  const form = useForm<AdminPaymentFormInput, unknown, AdminPaymentFormValues>({
    resolver: zodResolver(AdminPaymentFormSchema),
    defaultValues: {
      amount: "",
      currency: defaultCurrency,
      occurred_at: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: "",
        currency: defaultCurrency,
        occurred_at: new Date().toISOString().slice(0, 10),
        notes: "",
      });
    }
  }, [open, defaultCurrency, form]);

  const currency = form.watch("currency");
  const errors = form.formState.errors;

  async function onSubmit(parsed: AdminPaymentFormValues) {
    try {
      await mutation.mutateAsync({
        file,
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
          <DialogTitle>Saisir un paiement</DialogTitle>
          <DialogDescription>
            Versement effectué pour ce dossier (frais administratifs,
            géomètre…). Si un coût total est défini, le statut passe à «
            Finalisé » dès que le total est atteint.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin_amount">
                Montant <span className="text-red-500">*</span>
              </Label>
              <Input
                id="admin_amount"
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
            <Label htmlFor="admin_date">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="admin_date"
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
            <Label htmlFor="admin_notes">Notes</Label>
            <Textarea
              id="admin_notes"
              rows={2}
              placeholder="Étape, motif, justificatif..."
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
