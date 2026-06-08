import { EmptyState } from "@/components/empty-state";
import { Wallet } from "lucide-react";

export default function LoansPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Prêts & dettes
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Suivi de vos créances et dettes
        </p>
      </div>
      <EmptyState
        icon={Wallet}
        title="Aucun prêt enregistré"
        description="La gestion des prêts arrive en Phase 1."
      />
    </div>
  );
}
