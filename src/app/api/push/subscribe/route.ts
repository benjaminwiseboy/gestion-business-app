import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface SubscribeBody {
  endpoint?: string;
  p256dh?: string;
  auth?: string;
  user_agent?: string | null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SubscribeBody | null;
  if (!body?.endpoint || !body?.p256dh || !body?.auth) {
    return NextResponse.json(
      { error: "Missing endpoint, p256dh or auth" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Select-then-update-or-insert (le partial unique index ne supporte pas
  // ON CONFLICT côté JS client Supabase). Ré-active la subscription si
  // précédemment soft-deleted.
  const { data: existing, error: selectError } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", body.endpoint)
    .maybeSingle();
  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  if (existing) {
    const { error } = await supabase
      .from("push_subscriptions")
      .update({
        p256dh: body.p256dh,
        auth: body.auth,
        user_agent: body.user_agent ?? null,
        deleted_at: null,
      })
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase.from("push_subscriptions").insert({
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      user_agent: body.user_agent ?? null,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { endpoint?: string }
    | null;
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("endpoint", body.endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
