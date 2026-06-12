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
  ADMIN_FILE_STATUS_LABELS,
  ADMIN_FILE_TYPE_LABELS,
  AdminFileFormSchema,
  type AdminFileFormInput,
  type AdminFileFormValues,
  type AdminFileStatusInput,
  type AdminFileTypeInput,
} from "@/domain/validators";
import {
  useCreateAdminFile,
  useUpdateAdminFile,
} from "@/hooks/use-admin-files";
import { usePersons } from "@/hooks/use-persons";
import { QuickPersonDialog } from "@/components/forms/quick-person-dialog";
import type { Tables } from "@/lib/supabase/types";

type AdminFile = Tables<"admin_files">;

interface AdminFileFormProps {
  initial?: AdminFile;
}

const CURRENCY_LABELS: Record<string, string> = {
  XAF: "FCFA (XAF)",
  USD: "USD",
};

const TYPES: AdminFileTypeInput[] = [
  "technical",
  "title",
  "linking",
  "survey",
  "legal",
];
const STATUSES: AdminFileStatusInput[] = [
  "processing",
  "awaiting_docs",
  "awaiting_payment",
  "done",
  "blocked",
];

type QuickAddTarget = "beneficiary" | "surveyor" | null;

export function AdminFileForm({ initial }: AdminFileFormProps) {
  const router = useRouter();
  const createMutation = useCreateAdminFile();
  const updateMutation = useUpdateAdminFile();
  const personsQuery = usePersons();
  const [quickAddTarget, setQuickAddTarget] = useState<QuickAddTarget>(null);

  const form = useForm<AdminFileFormInput, unknown, AdminFileFormValues>({
    resolver: zodResolver(AdminFileFormSchema),
    defaultValues: {
      title: initial?.title ?? "",
      type: initial?.type ?? "technical",
      beneficiary_person_id: initial?.beneficiary_person_id ?? "",
      surveyor_person_id: initial?.surveyor_person_id ?? "",
      surface_m2: initial?.surface_m2 != null ? String(initial.surface_m2) : "",
      total_cost_amount:
        initial?.total_cost_amount != null
          ? String(initial.total_cost_amount)
          : "",
      total_cost_currency: (initial?.total_cost_currency ?? "XAF") as
        | "XAF"
        | "USD",
      status: initial?.status ?? "processing",
      notes: initial?.notes ?? "",
    },
  });

  const type = form.watch("type");
  const status = form.watch("status");
  const currency = form.watch("total_cost_currency");
  const beneficiaryId = form.watch("beneficiary_person_id");
  const surveyorId = form.watch("surveyor_person_id");
  const errors = form.formState.errors;
  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    form.formState.isSubmitting;

  async function onSubmit(parsed: AdminFileFormValues) {
    try {
      const payload = {
        title: parsed.title,
        type: parsed.type,
        beneficiary_person_id: parsed.beneficiary_person_id,
        surveyor_person_id: parsed.surveyor_person_id,
        surface_m2: parsed.surface_m2 ? parseFloat(parsed.surface_m2) : null,
        total_cost_amount: parsed.total_cost_amount
          ? parseFloat(parsed.total_cost_amount)
          : null,
        total_cost_currency: parsed.total_cost_currency,
        status: parsed.status,
        notes: parsed.notes,
      };
      if (initial) {
        await updateMutation.mutateAsync({ id: initial.id, input: payload });
        toast.success("Dossier mis à jour");
        router.push(`/admin-files/${initial.id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success("Dossier créé");
        router.push(`/admin-files/${created.id}`);
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
        label="Titre du dossier"
        required
        error={errors.title?.message}
        htmlFor="title"
      >
        <Input
          id="title"
          autoFocus
          placeholder="Ex: Titre foncier Lot 12 Cocody"
          {...form.register("title")}
        />
      </Field>

      <Field label="Type" required>
        <Select
          value={type}
          onValueChange={(value) => {
            if (value)
              form.setValue("type", value as AdminFileTypeInput, {
                shouldValidate: true,
              });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{ADMIN_FILE_TYPE_LABELS[type]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ADMIN_FILE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Bénéficiaire" error={errors.beneficiary_person_id?.message}>
        <div className="flex gap-2">
          <Select
            value={beneficiaryId ?? ""}
            onValueChange={(value) => {
              if (value !== null && value !== undefined)
                form.setValue("beneficiary_person_id", value, {
                  shouldValidate: true,
                });
            }}
            disabled={personsQuery.isLoading}
          >
            <SelectTrigger className="w-full flex-1">
              <SelectValue>
                {personsLabel(
                  beneficiaryId ?? "",
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
            onClick={() => setQuickAddTarget("beneficiary")}
            aria-label="Ajouter une personne"
          >
            <UserPlus />
          </Button>
        </div>
      </Field>

      <Field label="Géomètre" error={errors.surveyor_person_id?.message}>
        <div className="flex gap-2">
          <Select
            value={surveyorId ?? ""}
            onValueChange={(value) => {
              if (value !== null && value !== undefined)
                form.setValue("surveyor_person_id", value, {
                  shouldValidate: true,
                });
            }}
            disabled={personsQuery.isLoading}
          >
            <SelectTrigger className="w-full flex-1">
              <SelectValue>
                {personsLabel(
                  surveyorId ?? "",
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
            onClick={() => setQuickAddTarget("surveyor")}
            aria-label="Ajouter une personne"
          >
            <UserPlus />
          </Button>
        </div>
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Surface (m²)"
          error={errors.surface_m2?.message}
          htmlFor="surface_m2"
        >
          <Input
            id="surface_m2"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Optionnel"
            className="tabular-nums"
            {...form.register("surface_m2")}
          />
        </Field>
        <Field label="Statut" required>
          <Select
            value={status}
            onValueChange={(value) => {
              if (value)
                form.setValue("status", value as AdminFileStatusInput, {
                  shouldValidate: true,
                });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{ADMIN_FILE_STATUS_LABELS[status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ADMIN_FILE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Coût total"
          error={errors.total_cost_amount?.message}
          htmlFor="total_cost_amount"
        >
          <Input
            id="total_cost_amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Optionnel"
            className="tabular-nums"
            {...form.register("total_cost_amount")}
          />
        </Field>
        <Field label="Devise" required>
          <Select
            value={currency}
            onValueChange={(value) => {
              if (value)
                form.setValue("total_cost_currency", value as "XAF" | "USD", {
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

      <Field label="Notes" error={errors.notes?.message} htmlFor="notes">
        <Textarea
          id="notes"
          rows={3}
          placeholder="Références cadastrales, étapes en cours, blocages..."
          {...form.register("notes")}
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          nativeButton={false}
          render={
            <Link
              href={initial ? `/admin-files/${initial.id}` : "/admin-files"}
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
        open={quickAddTarget !== null}
        onOpenChange={(open) => {
          if (!open) setQuickAddTarget(null);
        }}
        onCreated={(p) => {
          if (quickAddTarget === "beneficiary") {
            form.setValue("beneficiary_person_id", p.id, {
              shouldValidate: true,
            });
          } else if (quickAddTarget === "surveyor") {
            form.setValue("surveyor_person_id", p.id, {
              shouldValidate: true,
            });
          }
          setQuickAddTarget(null);
        }}
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
        {isLoading ? "Chargement…" : "Aucun (facultatif)"}
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
