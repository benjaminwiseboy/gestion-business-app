"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PERSON_KIND_DESCRIPTIONS,
  PERSON_KIND_LABELS,
  PersonFormSchema,
  type PersonFormInput,
  type PersonFormValues,
  type PersonKindInput,
} from "@/domain/validators";
import { useCreatePerson, useUpdatePerson } from "@/hooks/use-persons";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/types";

type Person = Tables<"persons">;

interface PersonFormProps {
  initial?: Person;
}

export function PersonForm({ initial }: PersonFormProps) {
  const router = useRouter();
  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson();

  const form = useForm<PersonFormInput, unknown, PersonFormValues>({
    resolver: zodResolver(PersonFormSchema),
    defaultValues: {
      full_name: initial?.full_name ?? "",
      kind: initial?.kind ?? "individual",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      address: initial?.address ?? "",
      notes: initial?.notes ?? "",
    },
  });

  const kind = form.watch("kind");
  const errors = form.formState.errors;
  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    form.formState.isSubmitting;

  async function onSubmit(parsed: PersonFormValues) {
    try {
      if (initial) {
        await updateMutation.mutateAsync({ id: initial.id, input: parsed });
        toast.success("Personne mise à jour");
        router.push(`/persons/${initial.id}`);
      } else {
        const created = await createMutation.mutateAsync(parsed);
        toast.success("Personne créée");
        router.push(`/persons/${created.id}`);
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
      <Field label="Type" required>
        <div className="grid grid-cols-2 gap-2">
          <KindOption
            active={kind === "individual"}
            kind="individual"
            icon={<User className="size-4" />}
            onClick={() => form.setValue("kind", "individual")}
          />
          <KindOption
            active={kind === "entity"}
            kind="entity"
            icon={<Building2 className="size-4" />}
            onClick={() => form.setValue("kind", "entity")}
          />
        </div>
      </Field>

      <Field
        label={kind === "entity" ? "Raison sociale" : "Nom complet"}
        required
        error={errors.full_name?.message}
        htmlFor="full_name"
      >
        <Input
          id="full_name"
          autoComplete={kind === "entity" ? "organization" : "name"}
          autoFocus
          placeholder={
            kind === "entity"
              ? "Ex: Tontine ADJF, Ecobank, Association Wakili…"
              : "Ex: Awa Diop"
          }
          {...form.register("full_name")}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Téléphone" error={errors.phone?.message} htmlFor="phone">
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+225..."
            {...form.register("phone")}
          />
        </Field>

        <Field label="Email" error={errors.email?.message} htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="contact@exemple.com"
            {...form.register("email")}
          />
        </Field>
      </div>

      <Field label="Adresse" error={errors.address?.message} htmlFor="address">
        <Input id="address" {...form.register("address")} />
      </Field>

      <Field label="Notes" error={errors.notes?.message} htmlFor="notes">
        <Textarea
          id="notes"
          rows={4}
          placeholder="Contexte, références, remarques..."
          {...form.register("notes")}
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          nativeButton={false}
          render={
            <Link href={initial ? `/persons/${initial.id}` : "/persons"} />
          }
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

function KindOption({
  active,
  kind,
  icon,
  onClick,
}: {
  active: boolean;
  kind: PersonKindInput;
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
        {PERSON_KIND_LABELS[kind]}
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        {PERSON_KIND_DESCRIPTIONS[kind]}
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
