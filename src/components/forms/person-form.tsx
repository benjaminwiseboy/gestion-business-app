"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PERSON_ROLE_LABELS,
  PersonFormSchema,
  type PersonFormInput,
  type PersonRole,
} from "@/domain/validators";
import { useCreatePerson, useUpdatePerson } from "@/hooks/use-persons";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/types";

type Person = Tables<"persons">;

interface PersonFormProps {
  initial?: Person;
}

const ROLES: PersonRole[] = [
  "borrower",
  "lender",
  "client",
  "investor",
  "surveyor",
];

export function PersonForm({ initial }: PersonFormProps) {
  const router = useRouter();
  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson();

  const form = useForm<PersonFormInput>({
    resolver: zodResolver(PersonFormSchema),
    defaultValues: {
      full_name: initial?.full_name ?? "",
      roles: (initial?.roles ?? ["client"]) as PersonRole[],
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      address: initial?.address ?? "",
      notes: initial?.notes ?? "",
    },
  });

  const roles = form.watch("roles");
  const errors = form.formState.errors;
  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    form.formState.isSubmitting;

  function toggleRole(role: PersonRole) {
    const current = form.getValues("roles");
    const next = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    form.setValue("roles", next, { shouldValidate: true });
  }

  async function onSubmit(values: PersonFormInput) {
    try {
      if (initial) {
        await updateMutation.mutateAsync({
          id: initial.id,
          input: PersonFormSchema.parse(values),
        });
        toast.success("Personne mise à jour");
        router.push(`/persons/${initial.id}`);
      } else {
        const created = await createMutation.mutateAsync(
          PersonFormSchema.parse(values),
        );
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
      <Field
        label="Nom complet"
        required
        error={errors.full_name?.message}
        htmlFor="full_name"
      >
        <Input
          id="full_name"
          autoComplete="name"
          autoFocus
          {...form.register("full_name")}
        />
      </Field>

      <Field
        label="Rôles"
        required
        error={errors.roles?.message}
        description="Au moins un rôle est requis. Une personne peut cumuler plusieurs rôles."
      >
        <div className="flex flex-wrap gap-2">
          {ROLES.map((role) => {
            const active = roles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
                )}
              >
                {PERSON_ROLE_LABELS[role]}
              </button>
            );
          })}
        </div>
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
