import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/push-server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!subs || subs.length === 0) {
    return NextResponse.json(
      { error: "Aucune subscription active sur cet appareil" },
      { status: 404 },
    );
  }

  const results = await Promise.all(
    subs.map((s) =>
      sendNotification(s, {
        title: "Test — Gestion Business",
        body: "Si tu vois ce message, les notifications fonctionnent ✓",
        url: "/dashboard",
        tag: "test",
      }),
    ),
  );

  // Nettoyage des subscriptions expirées (HTTP 404/410)
  const gone = subs.filter((_, i) => !results[i].ok && (results[i] as { gone: boolean }).gone);
  if (gone.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ deleted_at: new Date().toISOString() })
      .in(
        "endpoint",
        gone.map((s) => s.endpoint),
      );
  }

  const sent = results.filter((r) => r.ok).length;
  return NextResponse.json({
    sent,
    failed: results.length - sent,
    cleaned: gone.length,
  });
}
