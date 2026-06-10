"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Building2, User } from "lucide-react";
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
  PERSON_KIND_LABELS,
  PersonKindSchema,
  type PersonKindInput,
} from "@/domain/validators";
import { useCreatePerson } from "@/hooks/use-persons";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/types";

type Person = Tables<"persons">;

const QuickPersonSchema = z.object({
  full_name: z.string().trim().min(1, "Nom requis").max(120),
  kind: PersonKindSchema,
});
type QuickPersonValues = z.infer<typeof QuickPersonSchema>;

interface QuickPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (person: Person) => void;
  defaultKind?: PersonKindInput;
}

export function QuickPersonDialog({
  open,
  onOpenChange,
  onCreated,
  defaultKind = "individual",
}: QuickPersonDialogProps) {
  const mutation = useCreatePerson();
  const form = useForm<QuickPersonValues>({
    resolver: zodResolver(QuickPersonSchema),
    defaultValues: { full_name: "", kind: defaultKind },
  });

  useEffect(() => {
    if (open) {
      form.reset({ full_name: "", kind: defaultKind });
    }
  }, [open, defaultKind, form]);

  const kind = form.watch("kind");
  const errors = form.formState.errors;

  async function onSubmit(values: QuickPersonValues) {
    try {
      const created = await mutation.mutateAsync({
        full_name: values.full_name,
        kind: values.kind,
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
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <KindChip
                active={kind === "individual"}
                kindValue="individual"
                icon={<User className="size-4" />}
                onClick={() => form.setValue("kind", "individual")}
              />
              <KindChip
                active={kind === "entity"}
                kindValue="entity"
                icon={<Building2 className="size-4" />}
                onClick={() => form.setValue("kind", "entity")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick_name">
              {kind === "entity" ? "Raison sociale" : "Nom complet"}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quick_name"
              autoFocus
              autoComplete={kind === "entity" ? "organization" : "name"}
              placeholder={
                kind === "entity"
                  ? "Ex: Tontine ADJF, Ecobank…"
                  : "Ex: Awa Diop"
              }
              {...form.register("full_name")}
            />
            {errors.full_name ? (
              <p className="text-xs text-red-600">{errors.full_name.message}</p>
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

function KindChip({
  active,
  kindValue,
  icon,
  onClick,
}: {
  active: boolean;
  kindValue: PersonKindInput;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
          : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50",
      )}
    >
      {icon}
      {PERSON_KIND_LABELS[kindValue]}
    </button>
  );
}
