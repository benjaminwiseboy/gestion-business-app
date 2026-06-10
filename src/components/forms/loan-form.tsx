"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, UserPlus } from "lucide-react";
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
  LoanFormSchema,
  type LoanFormInput,
  type LoanFormValues,
} from "@/domain/validators";
import { useCreateLoan, useUpdateLoan } from "@/hooks/use-loans";
import { usePersons } from "@/hooks/use-persons";
import { QuickPersonDialog } from "@/components/forms/quick-person-dialog";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/types";

type Loan = Tables<"loans">;

interface LoanFormProps {
  initial?: Loan;
}

const CURRENCY_LABELS: Record<string, string> = {
  XOF: "FCFA (XOF)",
  USD: "USD",
};

export function LoanForm({ initial }: LoanFormProps) {
  const router = useRouter();
  const createMutation = useCreateLoan();
  const updateMutation = useUpdateLoan();
  const personsQuery = usePersons();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const form = useForm<LoanFormInput, unknown, LoanFormValues>({
    resolver: zodResolver(LoanFormSchema),
    defaultValues: {
      person_id: initial?.person_id ?? "",
      direction: initial?.direction ?? "lent",
      principal_amount: initial ? String(initial.principal_amount) : "",
      principal_currency: (initial?.principal_currency ?? "XOF") as
        | "XOF"
        | "USD",
      has_interest: Boolean(initial?.interest_rate),
      interest_rate:
        initial?.interest_rate != null
          ? String(initial.interest_rate * 100)
          : "",
      issue_date: initial?.issue_date ?? new Date().toISOString().slice(0, 10),
      due_date: initial?.due_date ?? "",
      notes: initial?.notes ?? "",
    },
  });

  const direction = form.watch("direction");
  const hasInterest = form.watch("has_interest");
  const currency = form.watch("principal_currency");
  const personId = form.watch("person_id");
  const errors = form.formState.errors;
  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    form.formState.isSubmitting;

  async function onSubmit(parsed: LoanFormValues) {
    try {
      const payload = {
        person_id: parsed.person_id,
        direction: parsed.direction,
        principal_amount: parseFloat(parsed.principal_amount),
        principal_currency: parsed.principal_currency,
        interest_rate:
          parsed.has_interest && parsed.interest_rate !== null
            ? parseFloat(parsed.interest_rate) / 100
            : null,
        interest_type: parsed.has_interest ? ("simple" as const) : null,
        issue_date: parsed.issue_date,
        due_date: parsed.due_date,
        notes: parsed.notes,
      };
      if (initial) {
        await updateMutation.mutateAsync({ id: initial.id, input: payload });
        toast.success("Prêt mis à jour");
        router.push(`/loans/${initial.id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success("Prêt créé");
        router.push(`/loans/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      <Field label="Sens" required>
        <div className="grid grid-cols-2 gap-2">
          <DirectionOption
            active={direction === "lent"}
            label="Accordé"
            description="J'ai prêté"
            icon={<ArrowUpRight className="size-4" />}
            onClick={() => form.setValue("direction", "lent")}
          />
          <DirectionOption
            active={direction === "borrowed"}
            label="Reçu"
            description="On m'a prêté"
            icon={<ArrowDownLeft className="size-4" />}
            onClick={() => form.setValue("direction", "borrowed")}
          />
        </div>
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
          error={errors.principal_amount?.message}
          htmlFor="principal_amount"
        >
          <Input
            id="principal_amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            className="tabular-nums"
            {...form.register("principal_amount")}
          />
        </Field>
        <Field
          label="Devise"
          required
          error={errors.principal_currency?.message}
        >
          <Select
            value={currency}
            onValueChange={(value) => {
              if (value)
                form.setValue("principal_currency", value as "XOF" | "USD", {
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

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Date d'octroi"
          required
          error={errors.issue_date?.message}
          htmlFor="issue_date"
        >
          <Input id="issue_date" type="date" {...form.register("issue_date")} />
        </Field>
        <Field
          label="Échéance"
          error={errors.due_date?.message}
          htmlFor="due_date"
        >
          <Input id="due_date" type="date" {...form.register("due_date")} />
        </Field>
      </div>

      <Field label="Intérêts">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <input
            type="checkbox"
            className="size-4 rounded border-zinc-300 accent-zinc-900 dark:border-zinc-700 dark:accent-zinc-100"
            {...form.register("has_interest")}
          />
          <div className="flex-1">
            <div className="text-sm font-medium">Avec intérêts</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Cochez si un taux d&apos;intérêt s&apos;applique à ce prêt.
            </div>
          </div>
        </label>
        {hasInterest ? (
          <div className="mt-3 flex flex-col gap-1.5">
            <Label htmlFor="interest_rate">
              Taux annuel <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="interest_rate"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ex: 12"
                className="pr-10 tabular-nums"
                {...form.register("interest_rate")}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-zinc-500">
                %
              </span>
            </div>
            {errors.interest_rate?.message ? (
              <p className="text-xs text-red-600">
                {errors.interest_rate.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </Field>

      <Field label="Notes" error={errors.notes?.message} htmlFor="notes">
        <Textarea
          id="notes"
          rows={3}
          placeholder="Contexte, garanties, conditions..."
          {...form.register("notes")}
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href={initial ? `/loans/${initial.id}` : "/loans"} />}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement…" : initial ? "Enregistrer" : "Créer"}
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

function DirectionOption({
  active,
  label,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors",
        active
          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
          : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50",
      )}
    >
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {label}
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        {description}
      </div>
    </button>
  );
}

function Field({
  label,
  required,
  error,
  description,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </Label>
      {description ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
