import { EmptyState } from "@/components/empty-state";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Paramètres</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Préférences de l&apos;application
        </p>
      </div>
      <EmptyState
        icon={Settings}
        title="Paramètres bientôt disponibles"
        description="Configuration des taux de change, devises, alertes : Phase 1."
      />
    </div>
  );
}
