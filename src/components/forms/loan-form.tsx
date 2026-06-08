"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/types";

type Loan = Tables<"loans">;

interface LoanFormProps {
  initial?: Loan;
}

export function LoanForm({ initial }: LoanFormProps) {
  const router = useRouter();
  const createMutation = useCreateLoan();
  const updateMutation = useUpdateLoan();
  const personsQuery = usePersons();

  const form = useForm<LoanFormInput, unknown, LoanFormValues>({
    resolver: zodResolver(LoanFormSchema),
    defaultValues: {
      person_id: initial?.person_id ?? "",
      direction: initial?.direction ?? "lent",
      principal_amount: initial ? String(initial.principal_amount) : "",
      principal_currency: (initial?.principal_currency ?? "XOF") as
        | "XOF"
        | "USD",
      interest_rate:
        initial?.interest_rate != null ? String(initial.interest_rate) : "",
      interest_type: initial?.interest_type ?? "none",
      issue_date: initial?.issue_date ?? new Date().toISOString().slice(0, 10),
      due_date: initial?.due_date ?? "",
      notes: initial?.notes ?? "",
    },
  });

  const direction = form.watch("direction");
  const interestType = form.watch("interest_type");
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
          parsed.interest_rate !== null && parsed.interest_type !== "none"
            ? parseFloat(parsed.interest_rate)
            : null,
        interest_type:
          parsed.interest_type === "none"
            ? null
            : (parsed.interest_type ?? null),
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
        <Select
          value={personId}
          onValueChange={(value) => {
            if (value)
              form.setValue("person_id", value, { shouldValidate: true });
          }}
          disabled={personsQuery.isLoading}
        >
          <SelectTrigger id="person_id" className="w-full">
            <SelectValue
              placeholder={
                personsQuery.isLoading
                  ? "Chargement…"
                  : "Sélectionner une personne"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {(personsQuery.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!personsQuery.isLoading && (personsQuery.data ?? []).length === 0 ? (
          <p className="text-xs text-zinc-500">
            Aucune personne enregistrée.{" "}
            <Link
              href="/persons/new"
              className="text-blue-600 underline-offset-2 hover:underline"
            >
              En créer une
            </Link>{" "}
            d&apos;abord.
          </p>
        ) : null}
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
              <SelectValue />
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

      <Field label="Intérêts" description="Optionnel">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            value={interestType ?? "none"}
            onValueChange={(value) => {
              if (value)
                form.setValue(
                  "interest_type",
                  value as "simple" | "compound" | "none",
                  { shouldValidate: true },
                );
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sans intérêts</SelectItem>
              <SelectItem value="simple">Simples</SelectItem>
              <SelectItem value="compound">Composés</SelectItem>
            </SelectContent>
          </Select>
          <div className="sm:col-span-2">
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Taux annuel (ex: 0.12 pour 12%)"
              disabled={interestType === "none"}
              className="tabular-nums"
              {...form.register("interest_rate")}
            />
            {errors.interest_rate?.message ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.interest_rate.message}
              </p>
            ) : null}
          </div>
        </div>
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
    </form>
  );
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
