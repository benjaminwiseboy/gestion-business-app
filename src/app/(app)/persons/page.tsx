import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";

export default function PersonsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Personnes</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Vos clients, débiteurs, créanciers et partenaires
        </p>
      </div>
      <EmptyState
        icon={Users}
        title="Aucune personne enregistrée"
        description="La gestion des personnes arrive en Phase 1."
      />
    </div>
  );
}
