"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Settings as SettingsIcon, Smartphone } from "lucide-react";
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
import { usePushNotifications } from "@/hooks/use-push-notifications";
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

      <NotificationsSection />

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

function NotificationsSection() {
  const push = usePushNotifications();

  async function handleSubscribe() {
    try {
      await push.subscribe();
      toast.success("Notifications activées");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleUnsubscribe() {
    try {
      await push.unsubscribe();
      toast.success("Notifications désactivées");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleTest() {
    try {
      await push.sendTest();
      toast.success(
        "Test envoyé — la notification devrait arriver dans quelques secondes",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Bell className="size-4" />
          Notifications push
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Reçois un résumé quotidien des retards et échéances à 8h00. Activable
          par appareil.
        </p>
      </div>

      {push.isLoading ? (
        <Skeleton className="h-10 w-40" />
      ) : push.support === "ios-needs-install" ? (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-950 dark:bg-amber-950/30">
          <Smartphone className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <div>
            <div className="font-medium text-amber-900 dark:text-amber-200">
              Installation requise sur iPhone
            </div>
            <p className="mt-1 text-amber-800 dark:text-amber-300">
              Ouvre Safari → bouton Partager → «{" "}
              <strong>Sur l&apos;écran d&apos;accueil</strong> ». Ouvre ensuite
              l&apos;app depuis son icône et reviens ici.
            </p>
          </div>
        </div>
      ) : push.support === "unsupported" ? (
        <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
          Cet appareil/navigateur ne supporte pas les notifications push.
        </div>
      ) : push.support === "no-vapid" ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          Configuration serveur incomplète (clé VAPID manquante).
        </div>
      ) : push.permission === "denied" ? (
        <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
          Les notifications sont bloquées dans le navigateur. Autorise-les
          depuis les réglages du site puis rafraîchis.
        </div>
      ) : push.isSubscribed ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleUnsubscribe}
            disabled={push.isMutating}
          >
            <BellOff />
            {push.isMutating ? "…" : "Désactiver"}
          </Button>
          <Button onClick={handleTest} disabled={push.isMutating}>
            Envoyer un test
          </Button>
        </div>
      ) : (
        <Button onClick={handleSubscribe} disabled={push.isMutating}>
          <Bell />
          {push.isMutating ? "Activation…" : "Activer les notifications"}
        </Button>
      )}
    </section>
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
