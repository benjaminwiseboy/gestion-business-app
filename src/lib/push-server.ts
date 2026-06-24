/**
 * Server-side Web Push setup. Import from API routes only (never client).
 */
import webpush from "web-push";

let configured = false;

export function getWebPush(): typeof webpush {
  if (!configured) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) {
      throw new Error(
        "Missing VAPID env vars: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT",
      );
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return webpush;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendNotification(
  target: PushTarget,
  payload: NotificationPayload,
): Promise<{ ok: true } | { ok: false; statusCode: number; gone: boolean }> {
  const wp = getWebPush();
  try {
    await wp.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { statusCode?: number };
    const statusCode = e.statusCode ?? 500;
    // 404/410 = subscription expired or unsubscribed → safe to delete
    return { ok: false, statusCode, gone: statusCode === 404 || statusCode === 410 };
  }
}
