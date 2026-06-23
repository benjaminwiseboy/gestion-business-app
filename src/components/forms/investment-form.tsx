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
  INVESTMENT_STATUS_LABELS,
  INVESTMENT_TYPE_DESCRIPTIONS,
  INVESTMENT_TYPE_LABELS,
  InvestmentFormSchema,
  type InvestmentFormInput,
  type InvestmentFormValues,
  type InvestmentStatusInput,
  type InvestmentTypeInput,
} from "@/domain/validators";
import {
  useCreateInvestment,
  useUpdateInvestment,
} from "@/hooks/use-investments";
import { usePersons } from "@/hooks/use-persons";
import { QuickPersonDialog } from "@/components/forms/quick-person-dialog";
import type { Tables } from "@/lib/supabase/types";

type Investment = Tables<"investments">;

interface InvestmentFormProps {
  initial?: Investment;
}

const CURRENCY_LABELS: Record<string, string> = {
  XAF: "FCFA (XAF)",
  USD: "USD",
};

const TYPES: InvestmentTypeInput[] = ["capital", "tontine", "savings", "other"];
const STATUSES: InvestmentStatusInput[] = ["active", "closed", "lost"];

export function InvestmentForm({ initial }: InvestmentFormProps) {
  const router = useRouter();
  const createMutation = useCreateInvestment();
  const updateMutation = useUpdateInvestment();
  const personsQuery = usePersons();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const form = useForm<InvestmentFormInput, unknown, InvestmentFormValues>({
    resolver: zodResolver(InvestmentFormSchema),
    defaultValues: {
      title: initial?.title ?? "",
      type: initial?.type ?? "capital",
      counterparty_person_id: initial?.counterparty_person_id ?? "",
      principal_amount:
        initial?.principal_amount != null
          ? String(initial.principal_amount)
          : "",
      principal_currency: (initial?.principal_currency ?? "XAF") as
        | "XAF"
        | "USD",
      expected_return_pct:
        initial?.expected_return_pct != null
          ? String(initial.expected_return_pct)
          : "",
      start_date: initial?.start_date ?? new Date().toISOString().slice(0, 10),
      end_date: initial?.end_date ?? "",
      status: initial?.status ?? "active",
      notes: initial?.notes ?? "",
    },
  });

  const type = form.watch("type");
  const status = form.watch("status");
  const currency = form.watch("principal_currency");
  const counterpartyId = form.watch("counterparty_person_id");
  const errors = form.formState.errors;
  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    form.formState.isSubmitting;

  async function onSubmit(parsed: InvestmentFormValues) {
    try {
      const payload = {
        title: parsed.title,
        type: parsed.type,
        counterparty_person_id: parsed.counterparty_person_id,
        principal_amount: parseFloat(parsed.principal_amount),
        principal_currency: parsed.principal_currency,
        expected_return_pct: parsed.expected_return_pct
          ? parseFloat(parsed.expected_return_pct)
          : null,
        start_date: parsed.start_date,
        end_date: parsed.end_date,
        status: parsed.status,
        notes: parsed.notes,
      };
      if (initial) {
        await updateMutation.mutateAsync({ id: initial.id, input: payload });
        toast.success("Investissement mis à jour");
        router.push(`/investments/${initial.id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success("Investissement créé");
        router.push(`/investments/${created.id}`);
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
      <Field
        label="Titre"
        required
        error={errors.title?.message}
        htmlFor="title"
      >
        <Input
          id="title"
          autoFocus
          placeholder="Ex: Tontine bureau, Participation boutique Aïcha"
          {...form.register("title")}
        />
      </Field>

      <Field label="Type" required>
        <Select
          value={type}
          onValueChange={(value) => {
            if (value)
              form.setValue("type", value as InvestmentTypeInput, {
                shouldValidate: true,
              });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{INVESTMENT_TYPE_LABELS[type]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {INVESTMENT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {INVESTMENT_TYPE_DESCRIPTIONS[type]}
        </p>
      </Field>

      <Field
        label="Contrepartie (personne ou organisation)"
        error={errors.counterparty_person_id?.message}
      >
        <div className="flex gap-2">
          <Select
            value={counterpartyId ?? ""}
            onValueChange={(value) => {
              if (value !== null && value !== undefined)
                form.setValue("counterparty_person_id", value, {
                  shouldValidate: true,
                });
            }}
            disabled={personsQuery.isLoading}
          >
            <SelectTrigger className="w-full flex-1">
              <SelectValue>
                {personsLabel(
                  counterpartyId ?? "",
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
          >
            <UserPlus />
          </Button>
        </div>
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label={
            type === "tontine"
              ? "Cotisation prévue"
              : type === "savings"
                ? "Montant déposé"
                : "Mise initiale"
          }
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
        <Field label="Devise" required>
          <Select
            value={currency}
            onValueChange={(value) => {
              if (value)
                form.setValue("principal_currency", value as "XAF" | "USD", {
                  shouldValidate: true,
                });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{CURRENCY_LABELS[currency] ?? currency}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="XAF">FCFA (XAF)</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        label="Rendement attendu (% annuel)"
        error={errors.expected_return_pct?.message}
        htmlFor="expected_return_pct"
      >
        <Input
          id="expected_return_pct"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Optionnel — ex. 12"
          className="tabular-nums"
          {...form.register("expected_return_pct")}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Date de début"
          required
          error={errors.start_date?.message}
          htmlFor="start_date"
        >
          <Input
            id="start_date"
            type="date"
            {...form.register("start_date")}
          />
        </Field>
        <Field
          label="Date de fin prévue"
          error={errors.end_date?.message}
          htmlFor="end_date"
        >
          <Input id="end_date" type="date" {...form.register("end_date")} />
        </Field>
      </div>

      <Field label="Statut" required>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value)
              form.setValue("status", value as InvestmentStatusInput, {
                shouldValidate: true,
              });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{INVESTMENT_STATUS_LABELS[status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {INVESTMENT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Notes" error={errors.notes?.message} htmlFor="notes">
        <Textarea
          id="notes"
          rows={3}
          placeholder="Conditions, modalités de la tontine, références..."
          {...form.register("notes")}
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          nativeButton={false}
          render={
            <Link
              href={initial ? `/investments/${initial.id}` : "/investments"}
            />
          }
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
          form.setValue("counterparty_person_id", p.id, {
            shouldValidate: true,
          })
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
        {isLoading ? "Chargement…" : "Aucune (facultatif)"}
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
