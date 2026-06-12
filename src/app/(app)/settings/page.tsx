"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { MoneyDisplay } from "@/components/money-display";
import {
  useUpdateUserSettings,
  useUserSettings,
} from "@/hooks/use-user-settings";
import { money } from "@/lib/money";

export default function SettingsPage() {
  const settingsQuery = useUserSettings();
  const updateMutation = useUpdateUserSettings();
  const [rateInput, setRateInput] = useState("");

  useEffect(() => {
    if (settingsQuery.data) {
      setRateInput(String(settingsQuery.data.usd_to_xaf_rate));
    }
  }, [settingsQuery.data]);

  async function onSaveRate() {
    const trimmed = rateInput.trim().replace(",", ".");
    const rate = parseFloat(trimmed);
    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error("Taux invalide. Saisissez un nombre positif.");
      return;
    }
    try {
      await updateMutation.mutateAsync({ usd_to_xaf_rate: rate });
      toast.success("Taux mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  if (settingsQuery.isError) {
    return <ErrorState onRetry={() => settingsQuery.refetch()} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <SettingsIcon className="size-5" />
          Paramètres
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Préférences de l&apos;application
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h3 className="text-base font-semibold tracking-tight">
            Taux de change USD → FCFA
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Utilisé pour convertir les montants en USD vers la devise pivot
            (FCFA) dans le tableau de bord. Les transactions déjà saisies
            conservent leur taux figé.
          </p>
        </div>

        {settingsQuery.isLoading ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="usd_rate">
                  1 USD ={" "}
                  <span className="font-mono tabular-nums">
                    {rateInput || "—"}
                  </span>{" "}
                  FCFA
                </Label>
                <Input
                  id="usd_rate"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="tabular-nums"
                />
              </div>
              <Button
                onClick={onSaveRate}
                disabled={
                  updateMutation.isPending ||
                  rateInput.trim() ===
                    String(settingsQuery.data?.usd_to_xaf_rate ?? "")
                }
              >
                {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
            <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
              Exemple :{" "}
              <span className="tabular-nums">
                <MoneyDisplay
                  money={money(100, "USD")}
                  size="sm"
                  rateToPivot={parseFloat(rateInput) || undefined}
                  className="inline-flex"
                />
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-base font-semibold tracking-tight">À propos</h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Field label="Devise pivot" value="FCFA (XAF)" />
          <Field label="Version" value="0.1.0 — MVP" />
        </dl>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Vous êtes en mode invité (compte anonyme). Vos données sont
          accessibles uniquement depuis ce navigateur jusqu&apos;à l&apos;ajout
          d&apos;un compte email (à venir en V1).
        </p>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
        {value}
      </dd>
    </div>
  );
}
