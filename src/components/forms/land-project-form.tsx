"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import Decimal from "decimal.js";
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
  LAND_PROJECT_STATUS_LABELS,
  LandProjectFormSchema,
  type LandProjectFormInput,
  type LandProjectFormValues,
  type LandProjectStatusInput,
} from "@/domain/validators";
import {
  useCreateLandProject,
  useUpdateLandProject,
} from "@/hooks/use-land-projects";
import { usePersons } from "@/hooks/use-persons";
import { QuickPersonDialog } from "@/components/forms/quick-person-dialog";
import { money } from "@/lib/money";
import { formatMoney } from "@/lib/money";
import type { Tables } from "@/lib/supabase/types";

type LandProject = Tables<"land_projects">;

interface LandProjectFormProps {
  initial?: LandProject;
}

const CURRENCY_LABELS: Record<string, string> = {
  XAF: "FCFA (XAF)",
  USD: "USD",
};

const STATUSES: LandProjectStatusInput[] = ["active", "settled", "blocked"];

export function LandProjectForm({ initial }: LandProjectFormProps) {
  const router = useRouter();
  const createMutation = useCreateLandProject();
  const updateMutation = useUpdateLandProject();
  const personsQuery = usePersons();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const form = useForm<LandProjectFormInput, unknown, LandProjectFormValues>({
    resolver: zodResolver(LandProjectFormSchema),
    defaultValues: {
      title: initial?.title ?? "",
      client_person_id: initial?.client_person_id ?? "",
      location: initial?.location ?? "",
      surface_m2: initial ? String(initial.surface_m2) : "",
      price_per_m2_amount: initial ? String(initial.price_per_m2_amount) : "",
      price_per_m2_currency: (initial?.price_per_m2_currency ?? "XAF") as
        | "XAF"
        | "USD",
      status: initial?.status ?? "active",
      notes: initial?.notes ?? "",
    },
  });

  const currency = form.watch("price_per_m2_currency");
  const status = form.watch("status");
  const clientId = form.watch("client_person_id");
  const surface = form.watch("surface_m2");
  const price = form.watch("price_per_m2_amount");
  const errors = form.formState.errors;
  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    form.formState.isSubmitting;

  const total = computeTotal(surface, price);

  async function onSubmit(parsed: LandProjectFormValues) {
    try {
      const payload = {
        title: parsed.title,
        client_person_id: parsed.client_person_id,
        location: parsed.location,
        surface_m2: parseFloat(parsed.surface_m2),
        price_per_m2_amount: parseFloat(parsed.price_per_m2_amount),
        price_per_m2_currency: parsed.price_per_m2_currency,
        status: parsed.status,
        notes: parsed.notes,
      };
      if (initial) {
        await updateMutation.mutateAsync({ id: initial.id, input: payload });
        toast.success("Projet mis à jour");
        router.push(`/land/${initial.id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success("Projet créé");
        router.push(`/land/${created.id}`);
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
        label="Titre du projet"
        required
        error={errors.title?.message}
        htmlFor="title"
      >
        <Input
          id="title"
          autoFocus
          placeholder="Ex: Terrain Cocody Lot 12"
          {...form.register("title")}
        />
      </Field>

      <Field
        label="Client / acquéreur"
        error={errors.client_person_id?.message}
        htmlFor="client_person_id"
      >
        <div className="flex gap-2">
          <Select
            value={clientId ?? ""}
            onValueChange={(value) => {
              if (value !== null && value !== undefined)
                form.setValue("client_person_id", value, {
                  shouldValidate: true,
                });
            }}
            disabled={personsQuery.isLoading}
          >
            <SelectTrigger id="client_person_id" className="w-full flex-1">
              <SelectValue>
                {personsLabel(
                  clientId ?? "",
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

      <Field
        label="Localisation"
        error={errors.location?.message}
        htmlFor="location"
      >
        <Input
          id="location"
          placeholder="Ex: Cocody, Riviera 2 — Côte d'Ivoire"
          {...form.register("location")}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Surface (m²)"
          required
          error={errors.surface_m2?.message}
          htmlFor="surface_m2"
        >
          <Input
            id="surface_m2"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="500"
            className="tabular-nums"
            {...form.register("surface_m2")}
          />
        </Field>
        <Field
          label={`Prix au m² (${currency})`}
          required
          error={errors.price_per_m2_amount?.message}
          htmlFor="price_per_m2_amount"
        >
          <Input
            id="price_per_m2_amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="50000"
            className="tabular-nums"
            {...form.register("price_per_m2_amount")}
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Devise" required>
          <Select
            value={currency}
            onValueChange={(value) => {
              if (value)
                form.setValue("price_per_m2_currency", value as "XAF" | "USD", {
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
        <Field label="Statut" required>
          <Select
            value={status}
            onValueChange={(value) => {
              if (value)
                form.setValue("status", value as LandProjectStatusInput, {
                  shouldValidate: true,
                });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{LAND_PROJECT_STATUS_LABELS[status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {LAND_PROJECT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {total ? (
        <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
          Montant total :{" "}
          <span className="font-medium tabular-nums">
            {formatMoney(money(total, currency))}
          </span>
        </div>
      ) : null}

      <Field label="Notes" error={errors.notes?.message} htmlFor="notes">
        <Textarea
          id="notes"
          rows={3}
          placeholder="Lot, références cadastrales, conditions particulières..."
          {...form.register("notes")}
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href={initial ? `/land/${initial.id}` : "/land"} />}
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
          form.setValue("client_person_id", p.id, { shouldValidate: true })
        }
      />
    </form>
  );
}

function computeTotal(surface: string | undefined, price: string | undefined) {
  if (!surface || !price) return null;
  const s = parseFloat(surface.replace(",", "."));
  const p = parseFloat(price.replace(",", "."));
  if (!Number.isFinite(s) || !Number.isFinite(p) || s <= 0 || p <= 0)
    return null;
  return new Decimal(s).mul(p);
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
