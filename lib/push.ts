/**
 * Browser push subscription helpers. Used from client components.
 * The actual VAPID-signed sends happen server-side in lib/webpush.ts.
 */

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Make sure this device is subscribed to push. Reuses an existing
 * subscription if present, otherwise asks for permission and creates one.
 * Throws if permission is denied or push isn't supported.
 */
export async function ensurePushSubscription(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error("Notifications push non supportées par ce navigateur");
  }

  const registration = await navigator.serviceWorker.ready;

  // Reuse if already subscribed
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  // Need permission first
  if (Notification.permission === "denied") {
    throw new Error(
      "Notifications bloquées — autorise-les dans les paramètres du navigateur"
    );
  }

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Permission refusée");
    }
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    throw new Error("VAPID public key non configurée");
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}
