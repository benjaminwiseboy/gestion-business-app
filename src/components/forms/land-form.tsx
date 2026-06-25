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
  LAND_ACQUISITION_STATUS_DESCRIPTIONS,
  LAND_ACQUISITION_STATUS_LABELS,
  LandFormSchema,
  type LandAcquisitionStatusInput,
  type LandFormInput,
  type LandFormValues,
} from "@/domain/validators";
import { useCreateLand, useUpdateLand } from "@/hooks/use-lands";
import { usePersons } from "@/hooks/use-persons";
import { QuickPersonDialog } from "@/components/forms/quick-person-dialog";
import { formatMoney, money } from "@/lib/money";
import type { Tables } from "@/lib/supabase/types";

type Land = Tables<"land_projects">;

interface LandFormProps {
  initial?: Land;
}

const CURRENCY_LABELS: Record<string, string> = {
  XAF: "FCFA (XAF)",
  USD: "USD",
};

const ACQUISITION_STATUSES: LandAcquisitionStatusInput[] = [
  "planned",
  "owned",
  "blocked",
];

export function LandForm({ initial }: LandFormProps) {
  const router = useRouter();
  const createMutation = useCreateLand();
  const updateMutation = useUpdateLand();
  const personsQuery = usePersons();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const form = useForm<LandFormInput, unknown, LandFormValues>({
    resolver: zodResolver(LandFormSchema),
    defaultValues: {
      title: initial?.title ?? "",
      location: initial?.location ?? "",
      total_surface_m2: initial?.total_surface_m2
        ? String(initial.total_surface_m2)
        : "",
      acquisition_status: initial?.acquisition_status ?? "planned",
      acquisition_price_per_m2:
        initial?.acquisition_price_per_m2 != null
          ? String(initial.acquisition_price_per_m2)
          : "",
      acquisition_currency: (initial?.acquisition_currency ?? "XAF") as
        | "XAF"
        | "USD",
      acquisition_date: initial?.acquisition_date ?? "",
      acquisition_seller_person_id: initial?.acquisition_seller_person_id ?? "",
      notes: initial?.notes ?? "",
    },
  });

  const acquisitionStatus = form.watch("acquisition_status");
  const currency = form.watch("acquisition_currency");
  const sellerId = form.watch("acquisition_seller_person_id");
  const surfaceStr = form.watch("total_surface_m2");
  const pricePerM2Str = form.watch("acquisition_price_per_m2");
  const errors = form.formState.errors;
  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    form.formState.isSubmitting;

  const totalAcquisition = computeTotal(surfaceStr, pricePerM2Str);

  async function onSubmit(parsed: LandFormValues) {
    try {
      const payload = {
        title: parsed.title,
        location: parsed.location,
        total_surface_m2: parseFloat(parsed.total_surface_m2),
        acquisition_status: parsed.acquisition_status,
        acquisition_price_per_m2: parsed.acquisition_price_per_m2
          ? parseFloat(parsed.acquisition_price_per_m2)
          : null,
        acquisition_currency: parsed.acquisition_currency,
        acquisition_date: parsed.acquisition_date,
        acquisition_seller_person_id: parsed.acquisition_seller_person_id,
        notes: parsed.notes,
      };
      if (initial) {
        await updateMutation.mutateAsync({ id: initial.id, input: payload });
        toast.success("Terrain mis à jour");
        router.push(`/land/${initial.id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success("Terrain créé");
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
        label="Titre du terrain"
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

      <Field
        label="Surface totale (m²)"
        required
        error={errors.total_surface_m2?.message}
        htmlFor="total_surface_m2"
      >
        <Input
          id="total_surface_m2"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="500"
          className="tabular-nums"
          {...form.register("total_surface_m2")}
        />
      </Field>

      <fieldset className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Acquisition
        </legend>

        <Field
          label="Statut du terrain"
          required
          helpText={LAND_ACQUISITION_STATUS_DESCRIPTIONS[acquisitionStatus]}
        >
          <Select
            value={acquisitionStatus}
            onValueChange={(value) => {
              if (value)
                form.setValue(
                  "acquisition_status",
                  value as LandAcquisitionStatusInput,
                  { shouldValidate: true },
                );
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {LAND_ACQUISITION_STATUS_LABELS[acquisitionStatus]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ACQUISITION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {LAND_ACQUISITION_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field
            label={
              acquisitionStatus === "planned"
                ? "Prix prévu au m²"
                : "Prix d'achat au m²"
            }
            error={errors.acquisition_price_per_m2?.message}
            htmlFor="acquisition_price_per_m2"
          >
            <Input
              id="acquisition_price_per_m2"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Optionnel"
              className="tabular-nums"
              {...form.register("acquisition_price_per_m2")}
            />
          </Field>
          <Field label="Devise" required>
            <Select
              value={currency}
              onValueChange={(value) => {
                if (value)
                  form.setValue(
                    "acquisition_currency",
                    value as "XAF" | "USD",
                    { shouldValidate: true },
                  );
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

        {totalAcquisition ? (
          <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
            Prix d&apos;acquisition total :{" "}
            <span className="font-medium tabular-nums">
              {formatMoney(money(totalAcquisition, currency))}
            </span>
          </div>
        ) : null}

        <Field
          label={
            acquisitionStatus === "planned"
              ? "Date prévue d'acquisition"
              : "Date d'acquisition"
          }
          error={errors.acquisition_date?.message}
          htmlFor="acquisition_date"
        >
          <Input
            id="acquisition_date"
            type="date"
            {...form.register("acquisition_date")}
          />
        </Field>

        <Field
          label={acquisitionStatus === "planned" ? "Vendeur (prévu)" : "Vendeur"}
          error={errors.acquisition_seller_person_id?.message}
        >
          <div className="flex gap-2">
            <Select
              value={sellerId ?? ""}
              onValueChange={(value) => {
                if (value !== null && value !== undefined)
                  form.setValue("acquisition_seller_person_id", value, {
                    shouldValidate: true,
                  });
              }}
              disabled={personsQuery.isLoading}
            >
              <SelectTrigger className="w-full flex-1">
                <SelectValue>
                  {personsLabel(
                    sellerId ?? "",
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
              aria-label="Ajouter une personne"
            >
              <UserPlus />
            </Button>
          </div>
        </Field>
      </fieldset>

      <Field label="Notes" error={errors.notes?.message} htmlFor="notes">
        <Textarea
          id="notes"
          rows={3}
          placeholder="Références cadastrales, conditions particulières..."
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
          form.setValue("acquisition_seller_person_id", p.id, {
            shouldValidate: true,
          })
        }
      />
    </form>
  );
}

function computeTotal(
  surface: string | undefined,
  pricePerM2: string | undefined,
): Decimal | null {
  if (!surface || !pricePerM2) return null;
  const s = parseFloat(surface.replace(",", "."));
  const p = parseFloat(pricePerM2.replace(",", "."));
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
  helpText,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor?: string;
  helpText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </Label>
      {children}
      {helpText ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{helpText}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
