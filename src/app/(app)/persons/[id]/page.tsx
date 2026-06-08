"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/error-state";
import { useDeletePerson, usePerson } from "@/hooks/use-persons";
import { PERSON_ROLE_LABELS, type PersonRole } from "@/domain/validators";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PersonDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: person, isLoading, isError, refetch } = usePerson(id);
  const deleteMutation = useDeletePerson();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!person) {
    return (
      <ErrorState
        title="Introuvable"
        description="Cette personne n'existe pas ou a été supprimée."
      />
    );
  }

  async function onDelete() {
    if (!person) return;
    try {
      await deleteMutation.mutateAsync(person.id);
      toast.success("Personne supprimée");
      router.push("/persons");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/persons"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
          Personnes
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {person.full_name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1">
              {person.roles.map((role) => (
                <Badge key={role} variant="secondary" className="text-[10px]">
                  {PERSON_ROLE_LABELS[role as PersonRole] ?? role}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/persons/${person.id}/edit`} />}
            >
              <Pencil />
              Modifier
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 />
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      <dl className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900">
        <DetailField label="Téléphone" value={person.phone} />
        <DetailField label="Email" value={person.email} />
        <DetailField
          label="Adresse"
          value={person.address}
          className="sm:col-span-2"
        />
        <DetailField
          label="Notes"
          value={person.notes}
          className="sm:col-span-2"
        />
      </dl>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer {person.full_name} ?</DialogTitle>
            <DialogDescription>
              La personne sera masquée. Les prêts et transactions liés restent
              conservés. Cette action peut être annulée par un administrateur.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm whitespace-pre-line text-zinc-900 dark:text-zinc-100">
        {value || <span className="text-zinc-400">—</span>}
      </dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
