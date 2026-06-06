import { formatMoney, money } from "@/lib/money";

export default function DashboardPage() {
  const sample = money(1_500_000, "XOF");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Vue d&apos;ensemble de votre situation financière
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total créances", value: sample },
          { label: "Total dettes", value: money(0, "XOF") },
          { label: "Cash immobilisé", value: money(0, "XOF") },
          { label: "Cash attendu", value: money(0, "XOF") },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              {card.label}
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {formatMoney(card.value)}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        Phase 0 — squelette en place. Données réelles arrivent en Phase 1.
      </div>
    </div>
  );
}
