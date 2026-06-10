"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  ManualTransactionFormSchema,
  TRANSACTION_KIND_LABELS,
  type ManualTransactionFormInput,
  type ManualTransactionFormValues,
} from "@/domain/validators";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { usePersons } from "@/hooks/use-persons";
import { QuickPersonDialog } from "@/components/forms/quick-person-dialog";

const CURRENCY_LABELS: Record<string, string> = {
  XOF: "FCFA (XOF)",
  USD: "USD",
};

export function ManualTransactionForm() {
  const router = useRouter();
  const mutation = useCreateTransaction();
  const personsQuery = usePersons();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const form = useForm<
    ManualTransactionFormInput,
    unknown,
    ManualTransactionFormValues
  >({
    resolver: zodResolver(ManualTransactionFormSchema),
    defaultValues: {
      kind: "fee",
      amount: "",
      currency: "XOF",
      occurred_at: new Date().toISOString().slice(0, 10),
      person_id: "",
      notes: "",
    },
  });

  const kind = form.watch("kind");
  const currency = form.watch("currency");
  const personId = form.watch("person_id");
  const errors = form.formState.errors;
  const isSubmitting = mutation.isPending || form.formState.isSubmitting;

  async function onSubmit(parsed: ManualTransactionFormValues) {
    try {
      const created = await mutation.mutateAsync({
        kind: parsed.kind,
        amount: parseFloat(parsed.amount),
        currency: parsed.currency,
        exchange_rate_snapshot: 1,
        occurred_at: parsed.occurred_at,
        person_id: parsed.person_id,
        linked_entity_type: null,
        linked_entity_id: null,
        notes: parsed.notes,
      });
      toast.success("Transaction enregistrée");
      router.push(`/transactions/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      <Field label="Type" required>
        <Select
          value={kind}
          onValueChange={(value) => {
            if (value)
              form.setValue("kind", value as "fee" | "adjustment", {
                shouldValidate: true,
              });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{TRANSACTION_KIND_LABELS[kind] ?? kind}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fee">{TRANSACTION_KIND_LABELS.fee}</SelectItem>
            <SelectItem value="adjustment">
              {TRANSACTION_KIND_LABELS.adjustment}
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Les remboursements, décaissements et autres transactions liées sont
          créés depuis les écrans Prêts, Foncier, etc.
        </p>
      </Field>

      <Field
        label="Personne"
        required
        error={errors.person_id?.message}
        htmlFor="person_id"
      >
        <div className="flex gap-2">
          <Select
            value={personId}
            onValueChange={(value) => {
              if (value)
                form.setValue("person_id", value, { shouldValidate: true });
            }}
            disabled={personsQuery.isLoading}
          >
            <SelectTrigger id="person_id" className="w-full flex-1">
              <SelectValue>
                {personsLabel(
                  personId,
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
            aria-label="Ajouter une nouvelle personne"
            title="Ajouter une nouvelle personne"
          >
            <UserPlus />
          </Button>
        </div>
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Montant"
          required
          error={errors.amount?.message}
          htmlFor="amount"
        >
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            className="tabular-nums"
            {...form.register("amount")}
          />
        </Field>
        <Field label="Devise" required>
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
              <SelectValue>{CURRENCY_LABELS[currency] ?? currency}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="XOF">FCFA (XOF)</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        label="Date"
        required
        error={errors.occurred_at?.message}
        htmlFor="occurred_at"
      >
        <Input id="occurred_at" type="date" {...form.register("occurred_at")} />
      </Field>

      <Field label="Notes" error={errors.notes?.message} htmlFor="notes">
        <Textarea
          id="notes"
          rows={3}
          placeholder="Description, justificatif, contexte..."
          {...form.register("notes")}
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href="/transactions" />}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement…" : "Créer"}
        </Button>
      </div>

      <QuickPersonDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={(p) =>
          form.setValue("person_id", p.id, { shouldValidate: true })
        }
      />
    </form>
  );
}

function personsLabel(
  id: string,
  persons: { id: string; full_name: string }[] | undefined,
  isLoading: boolean,
) {
  if (!id)
    return (
      <span className="text-muted-foreground">
        {isLoading ? "Chargement…" : "Sélectionner une personne"}
      </span>
    );
  const p = persons?.find((p) => p.id === id);
  return p?.full_name ?? <span className="text-muted-foreground">Inconnu</span>;
}

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
