/**
 * Daily cron — appelé par Vercel Cron (vercel.json).
 *
 * Pour chaque utilisateur ayant ≥1 push subscription active :
 *  1. Récupère ses données (loans, invest, admin, land, transactions)
 *  2. Calcule les alertes via lib/alerts.ts
 *  3. Envoie un digest push si ≥1 alerte
 *
 * Auth : Vercel envoie `Authorization: Bearer CRON_SECRET`.
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendNotification } from "@/lib/push-server";
import { computeAlerts } from "@/lib/alerts";
import type { AlertsInput } from "@/lib/alerts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CronSummary {
  users_total: number;
  users_notified: number;
  notifications_sent: number;
  notifications_failed: number;
  subscriptions_cleaned: number;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const summary: CronSummary = {
    users_total: 0,
    users_notified: 0,
    notifications_sent: 0,
    notifications_failed: 0,
    subscriptions_cleaned: 0,
  };

  // 1. Récupère les owners ayant des subscriptions actives
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("owner_id, endpoint, p256dh, auth")
    .is("deleted_at", null);
  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ...summary, message: "No subscriptions" });
  }

  // Groupe par owner
  const subsByOwner = new Map<string, typeof subs>();
  for (const s of subs) {
    const list = subsByOwner.get(s.owner_id) ?? [];
    list.push(s);
    subsByOwner.set(s.owner_id, list);
  }
  summary.users_total = subsByOwner.size;

  // 2. Pour chaque owner, calcule les alertes
  const goneEndpoints: string[] = [];
  for (const [ownerId, ownerSubs] of subsByOwner) {
    const input = await loadAlertsInput(supabase, ownerId);
    const alerts = computeAlerts(input);
    if (alerts.length === 0) continue;

    const counts = {
      overdue: alerts.filter((a) => a.severity === "overdue").length,
      upcoming: alerts.filter((a) => a.severity === "upcoming").length,
      attention: alerts.filter((a) => a.severity === "attention").length,
    };

    const title = formatTitle(alerts.length, counts.overdue);
    const body = formatBody(counts);

    const results = await Promise.all(
      ownerSubs.map((s) =>
        sendNotification(s, {
          title,
          body,
          url: "/dashboard",
          tag: "daily-alerts",
        }),
      ),
    );

    let owUserNotified = false;
    results.forEach((r, i) => {
      if (r.ok) {
        summary.notifications_sent += 1;
        owUserNotified = true;
      } else {
        summary.notifications_failed += 1;
        if (r.gone) goneEndpoints.push(ownerSubs[i].endpoint);
      }
    });
    if (owUserNotified) summary.users_notified += 1;
  }

  // 3. Nettoyage subscriptions expirées
  if (goneEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ deleted_at: new Date().toISOString() })
      .in("endpoint", goneEndpoints);
    summary.subscriptions_cleaned = goneEndpoints.length;
  }

  return NextResponse.json(summary);
}

function formatTitle(total: number, overdue: number): string {
  if (overdue > 0) {
    return `${overdue} retard${overdue > 1 ? "s" : ""} à traiter`;
  }
  return `${total} alerte${total > 1 ? "s" : ""}`;
}

function formatBody(counts: {
  overdue: number;
  upcoming: number;
  attention: number;
}): string {
  const parts: string[] = [];
  if (counts.overdue > 0)
    parts.push(`${counts.overdue} retard${counts.overdue > 1 ? "s" : ""}`);
  if (counts.upcoming > 0)
    parts.push(`${counts.upcoming} échéance${counts.upcoming > 1 ? "s" : ""} ≤7j`);
  if (counts.attention > 0)
    parts.push(`${counts.attention} à surveiller`);
  return parts.join(" · ");
}

type ServiceSupabase = ReturnType<typeof createServiceClient>;

async function loadAlertsInput(
  supabase: ServiceSupabase,
  ownerId: string,
): Promise<AlertsInput> {
  const [
    loans,
    loanRemaining,
    investments,
    adminFiles,
    landProjects,
    landRemaining,
    transactions,
  ] = await Promise.all([
    supabase
      .from("loans")
      .select("*, person:persons(id, full_name)")
      .eq("owner_id", ownerId)
      .is("deleted_at", null),
    supabase.from("loan_remaining").select("*").eq("owner_id", ownerId),
    supabase
      .from("investments")
      .select("*, counterparty:persons(id, full_name)")
      .eq("owner_id", ownerId)
      .is("deleted_at", null),
    supabase
      .from("admin_files")
      .select(
        "*, beneficiary:persons!admin_files_beneficiary_person_id_fkey(id, full_name), surveyor:persons!admin_files_surveyor_person_id_fkey(id, full_name)",
      )
      .eq("owner_id", ownerId)
      .is("deleted_at", null),
    supabase
      .from("land_projects")
      .select("*, client:persons(id, full_name)")
      .eq("owner_id", ownerId)
      .is("deleted_at", null),
    supabase
      .from("land_project_remaining")
      .select("*")
      .eq("owner_id", ownerId),
    supabase
      .from("transactions")
      .select("*, person:persons(id, full_name)")
      .eq("owner_id", ownerId)
      .is("deleted_at", null),
  ]);

  const loanRemainingMap: Record<string, (typeof loanRemaining.data extends (infer T)[] | null ? T : never)> = {};
  for (const row of loanRemaining.data ?? []) loanRemainingMap[row.loan_id] = row;
  const landRemainingMap: Record<string, (typeof landRemaining.data extends (infer T)[] | null ? T : never)> = {};
  for (const row of landRemaining.data ?? []) landRemainingMap[row.project_id] = row;

  return {
    loans: (loans.data ?? []) as AlertsInput["loans"],
    loanRemaining: loanRemainingMap as AlertsInput["loanRemaining"],
    investments: (investments.data ?? []) as AlertsInput["investments"],
    adminFiles: (adminFiles.data ?? []) as AlertsInput["adminFiles"],
    landProjects: (landProjects.data ?? []) as AlertsInput["landProjects"],
    landRemaining: landRemainingMap as AlertsInput["landRemaining"],
    transactions: (transactions.data ?? []) as AlertsInput["transactions"],
  };
}
