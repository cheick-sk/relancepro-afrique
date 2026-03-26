// Push Notifications Library for RelancePro Africa
// Utilise l'API Web Push pour les notifications navigateur

// VAPID keys - En production, ces clés doivent être générées et stockées en toute sécurité
// Pour le développement, nous utilisons une approche simplifiée

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

// Vérifier si les notifications push sont supportées
export function isPushSupported(): boolean {
  return typeof window !== "undefined" && 
         "serviceWorker" in navigator && 
         "PushManager" in window;
}

// Vérifier si l'utilisateur a déjà donné la permission
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined") return "default";
  return Notification.permission;
}

// Demander la permission pour les notifications
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.warn("Push notifications are not supported");
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return "denied";
  }
}

// Convertir une subscription en format sérialisable
function subscriptionToJson(subscription: PushSubscription): PushSubscriptionData {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint || "",
    p256dh: json.keys?.p256dh || "",
    auth: json.keys?.auth || "",
  };
}

// Obtenir ou créer une subscription push
export async function subscribeToPush(vapidPublicKey?: string): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    console.warn("Push notifications are not supported");
    return null;
  }

  try {
    // Enregistrer le service worker
    const registration = await navigator.serviceWorker.ready;

    // Vérifier s'il existe déjà une subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Créer une nouvelle subscription
      // Note: En production, utilisez une vraie clé VAPID publique
      // Pour le développement, nous utilisons une clé factice
      const applicationServerKey = vapidPublicKey || generateDummyVapidKey();
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
      });
    }

    return subscriptionToJson(subscription);
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return null;
  }
}

// Annuler une subscription push
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error("Error unsubscribing from push:", error);
    return false;
  }
}

// Envoyer une notification locale (sans serveur push)
export async function showLocalNotification(
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn("Push notifications are not supported");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/badge-72x72.png",
      tag: payload.tag,
      data: payload.data,
      actions: payload.actions,
    });

    return true;
  } catch (error) {
    console.error("Error showing notification:", error);
    return false;
  }
}

// Écouter les notifications cliquées
export function setupNotificationClickListener(
  callback: (data: Record<string, unknown>) => void
): () => void {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === "NOTIFICATION_CLICKED") {
      callback(event.data.data);
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);

  return () => {
    navigator.serviceWorker.removeEventListener("message", handler);
  };
}

// Fonction utilitaire pour convertir une clé base64 en Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Générer une clé VAPID factice pour le développement
function generateDummyVapidKey(): string {
  // En production, générez de vraies clés VAPID avec:
  // npx web-push generate-vapid-keys
  // Pour le développement, cette clé factice fonctionne pour les notifications locales
  return "BNb9EkLcHhZJpBGrxNHcIMkYtJmDZfEeNhZmFjBkZGFkY2RkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODk=";
}

// Fonction pour envoyer une notification push via le serveur
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    const response = await fetch("/api/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        payload,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
}

// Détecter le type d'appareil
export function getDeviceType(): "desktop" | "mobile" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  
  const ua = navigator.userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) {
      return "tablet";
    }
    return "mobile";
  }
  
  return "desktop";
}

// Obtenir le user agent
export function getUserAgent(): string {
  if (typeof window === "undefined") return "";
  return navigator.userAgent;
}
