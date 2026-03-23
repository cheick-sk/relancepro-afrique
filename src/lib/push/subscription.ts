// Push Notification Subscription Management for RelancePro Africa
// Client-side subscription functions

import { getVapidConfig, type NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from './config';

// Subscription data structure
export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
}

// Subscription result
export interface SubscriptionResult {
  success: boolean;
  subscription?: PushSubscriptionData;
  error?: string;
}

// Check if push notifications are supported by the browser
export function isPushSupported(): boolean {
  return typeof window !== "undefined" && 
    "serviceWorker" in navigator && 
    "PushManager" in window;
}

// Check if the user has granted push notification permission
export function hasPushPermission(): boolean {
  if (typeof window === "undefined") return false;
  return Notification.permission === "granted";
}

// Check if push permission has been denied
export function isPushDenied(): boolean {
  if (typeof window === "undefined") return false;
  return Notification.permission === "denied";
}

// Get the current notification permission status
export function getPermissionStatus(): NotificationPermission {
  if (typeof window === "undefined") return "default";
  return Notification.permission;
}

// Convert base64 VAPID key to Uint8Array
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

// Detect device type from user agent
function getDeviceType(): "desktop" | "mobile" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return "mobile";
  return "desktop";
}

// Get user agent string
function getUserAgent(): string {
  if (typeof window === "undefined") return "";
  return navigator.userAgent;
}

// Get the current push subscription if it exists
export async function getSubscription(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return null;
    }

    const subJson = subscription.toJSON();
    return {
      endpoint: subJson.endpoint || "",
      p256dh: subJson.keys?.p256dh || "",
      auth: subJson.keys?.auth || "",
      userAgent: getUserAgent(),
      deviceType: getDeviceType(),
    };
  } catch (error) {
    console.error("Error getting subscription:", error);
    return null;
  }
}

// Request notification permission from the user
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Error requesting permission:", error);
    return "denied";
  }
}

// Subscribe the user to push notifications
export async function subscribeToPush(
  preferences?: Partial<NotificationPreferences>
): Promise<SubscriptionResult> {
  if (!isPushSupported()) {
    return { 
      success: false, 
      error: "Push notifications are not supported by this browser" 
    };
  }

  try {
    // Request permission if needed
    let permission = Notification.permission;
    if (permission !== "granted") {
      permission = await requestPermission();
    }

    if (permission !== "granted") {
      return { 
        success: false, 
        error: "Notification permission denied" 
      };
    }

    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      return { 
        success: false, 
        error: "Failed to get VAPID public key" 
      };
    }

    // Register service worker
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // Extract subscription data
    const subJson = subscription.toJSON();
    const subscriptionData: PushSubscriptionData = {
      endpoint: subJson.endpoint || "",
      p256dh: subJson.keys?.p256dh || "",
      auth: subJson.keys?.auth || "",
      userAgent: getUserAgent(),
      deviceType: getDeviceType(),
    };

    if (!subscriptionData.endpoint || !subscriptionData.p256dh || !subscriptionData.auth) {
      return { 
        success: false, 
        error: "Invalid subscription data" 
      };
    }

    // Save to server
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...subscriptionData,
        // Include preferences
        notifyPaymentReminders: preferences?.paymentReminders ?? DEFAULT_NOTIFICATION_PREFERENCES.paymentReminders,
        notifyNewDebts: preferences?.newDebts ?? DEFAULT_NOTIFICATION_PREFERENCES.newDebts,
        notifyRemindersSent: preferences?.remindersSent ?? DEFAULT_NOTIFICATION_PREFERENCES.remindersSent,
        notifySubscription: preferences?.subscription ?? DEFAULT_NOTIFICATION_PREFERENCES.subscription,
        soundEnabled: preferences?.soundEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.soundEnabled,
        quietHoursStart: preferences?.quietHoursStart ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart,
        quietHoursEnd: preferences?.quietHoursEnd ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error || "Failed to save subscription to server" 
      };
    }

    return { 
      success: true, 
      subscription: subscriptionData 
    };
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}

// Unsubscribe the user from push notifications
export async function unsubscribeFromPush(endpoint?: string): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: true }; // Already not subscribed
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from server
    const url = endpoint 
      ? `/api/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`
      : "/api/push/unsubscribe";
    
    const response = await fetch(url, { 
      method: "DELETE" 
    });

    if (!response.ok) {
      console.warn("Failed to remove subscription from server");
    }

    return { success: true };
  } catch (error) {
    console.error("Error unsubscribing from push:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to unsubscribe" 
    };
  }
}

// Get VAPID public key from server or config
async function getVapidPublicKey(): Promise<string | null> {
  try {
    // First try to get from localStorage cache
    const cached = localStorage.getItem("vapidPublicKey");
    if (cached) {
      return cached;
    }

    // Fetch from server
    const response = await fetch("/api/push/subscribe");
    if (response.ok) {
      const data = await response.json();
      if (data.vapidPublicKey) {
        localStorage.setItem("vapidPublicKey", data.vapidPublicKey);
        return data.vapidPublicKey;
      }
    }

    // Fall back to config
    const config = getVapidConfig();
    return config.publicKey;
  } catch (error) {
    console.error("Error getting VAPID key:", error);
    
    // Fall back to config
    const config = getVapidConfig();
    return config.publicKey;
  }
}

// Update notification preferences on the server
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/push/subscribe", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notifyPaymentReminders: preferences.paymentReminders,
        notifyNewDebts: preferences.newDebts,
        notifyRemindersSent: preferences.remindersSent,
        notifySubscription: preferences.subscription,
        soundEnabled: preferences.soundEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error || "Failed to update preferences" 
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating preferences:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update preferences" 
    };
  }
}

// Get all subscriptions for the current user
export async function getUserSubscriptions(): Promise<Array<{
  id: string;
  endpoint: string;
  deviceType: string | null;
  createdAt: string;
}>> {
  try {
    const response = await fetch("/api/push/subscribe");
    if (response.ok) {
      const data = await response.json();
      return data.subscriptions || [];
    }
    return [];
  } catch (error) {
    console.error("Error getting subscriptions:", error);
    return [];
  }
}

// Show a local notification (for testing or in-app notifications)
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      ...options,
    });
    return true;
  } catch (error) {
    console.error("Error showing notification:", error);
    return false;
  }
}
