/**
 * Client-side Web Push helpers.
 *
 * Le service worker (Serwist) est désactivé en dev — ces helpers ne
 * fonctionnent donc qu'en build production (`npm run build && npm start`)
 * ou sur le déploiement Vercel.
 *
 * iOS spécifique : le Push API n'est exposé QUE si l'app est installée
 * comme PWA via "Sur l'écran d'accueil". `getPushSupport()` détecte cela.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushSupport =
  | "supported"
  | "unsupported"
  | "ios-needs-install"
  | "no-vapid";

export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "no-vapid";

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !("MSStream" in window);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as { standalone?: boolean }).standalone === true);

  if (isIOS && !isStandalone) return "ios-needs-install";

  if (!("serviceWorker" in navigator)) return "unsupported";
  if (!("PushManager" in window)) return "unsupported";
  if (!("Notification" in window)) return "unsupported";

  return "supported";
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<PushSubscription> {
  const support = getPushSupport();
  if (support !== "supported") {
    throw new Error(supportErrorMessage(support));
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Permission refusée. Active les notifications dans les réglages du navigateur."
        : "Permission non accordée.",
    );
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await postSubscription(existing);
    return existing;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      .buffer as ArrayBuffer,
  });

  await postSubscription(subscription);
  return subscription;
}

export async function unsubscribeFromPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}

export async function sendTestPush(): Promise<void> {
  const res = await fetch("/api/push/test", { method: "POST" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }
}

async function postSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Échec d'enregistrement (${res.status}): ${body}`);
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function supportErrorMessage(support: PushSupport): string {
  switch (support) {
    case "ios-needs-install":
      return 'Sur iPhone, installe d\'abord l\'app via Safari → Partager → "Sur l\'écran d\'accueil", puis ouvre-la depuis l\'icône.';
    case "no-vapid":
      return "Configuration VAPID manquante côté serveur.";
    case "unsupported":
    default:
      return "Notifications push non supportées sur cet appareil/navigateur.";
  }
}
