"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import {
  PERSON_ROLE_LABELS,
  PersonRoleSchema,
  type PersonRole,
} from "@/domain/validators";
import { useCreatePerson } from "@/hooks/use-persons";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/types";

type Person = Tables<"persons">;

const QuickPersonSchema = z.object({
  full_name: z.string().trim().min(1, "Nom requis").max(120),
  roles: z.array(PersonRoleSchema).min(1, "Au moins un rôle"),
});
type QuickPersonValues = z.infer<typeof QuickPersonSchema>;

const ROLES: PersonRole[] = [
  "borrower",
  "lender",
  "client",
  "investor",
  "surveyor",
];

interface QuickPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (person: Person) => void;
  defaultRole?: PersonRole;
}

export function QuickPersonDialog({
  open,
  onOpenChange,
  onCreated,
  defaultRole = "client",
}: QuickPersonDialogProps) {
  const mutation = useCreatePerson();
  const form = useForm<QuickPersonValues>({
    resolver: zodResolver(QuickPersonSchema),
    defaultValues: { full_name: "", roles: [defaultRole] },
  });

  useEffect(() => {
    if (open) {
      form.reset({ full_name: "", roles: [defaultRole] });
    }
  }, [open, defaultRole, form]);

  const roles = form.watch("roles");
  const errors = form.formState.errors;

  function toggleRole(role: PersonRole) {
    const current = form.getValues("roles");
    const next = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    form.setValue("roles", next, { shouldValidate: true });
  }

  async function onSubmit(values: QuickPersonValues) {
    try {
      const created = await mutation.mutateAsync({
        full_name: values.full_name,
        roles: values.roles,
      });
      toast.success("Personne créée");
      onCreated(created);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une personne</DialogTitle>
          <DialogDescription>
            Création rapide. Vous pourrez compléter téléphone, email, adresse
            plus tard depuis la fiche.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick_name">
              Nom complet <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quick_name"
              autoFocus
              autoComplete="name"
              placeholder="Ex: Awa Diop"
              {...form.register("full_name")}
            />
            {errors.full_name ? (
              <p className="text-xs text-red-600">{errors.full_name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              Rôles <span className="text-red-500">*</span>
            </Label>
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
            {errors.roles ? (
              <p className="text-xs text-red-600">{errors.roles.message}</p>
            ) : null}
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
              {mutation.isPending ? "Création…" : "Créer et sélectionner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
