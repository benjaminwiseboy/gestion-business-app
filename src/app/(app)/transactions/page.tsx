import { EmptyState } from "@/components/empty-state";
import { ArrowLeftRight } from "lucide-react";

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Transactions</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Journal central de tous les mouvements financiers
        </p>
      </div>
      <EmptyState
        icon={ArrowLeftRight}
        title="Aucune transaction"
        description="Le journal des transactions arrive en Phase 1."
      />
    </div>
  );
}
