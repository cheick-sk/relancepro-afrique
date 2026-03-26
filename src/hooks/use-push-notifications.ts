"use client";

import { useState, useEffect, useCallback } from "react";
import { type NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/push/config";

// Push subscription data
interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Subscription from server
interface Subscription {
  id: string;
  endpoint: string;
  deviceType: string | null;
  createdAt: string;
}

// Return type for the hook
interface UsePushNotificationsReturn {
  // State
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  permissionStatus: NotificationPermission;
  isLoading: boolean;
  error: string | null;
  subscriptions: Subscription[];
  
  // Actions
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<PushSubscriptionData | null>;
  unsubscribe: () => Promise<void>;
  
  // Preferences
  preferences: NotificationPreferences;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  
  // Test
  sendTestNotification: () => Promise<boolean>;
}

// Check if push notifications are supported
function isPushSupported(): boolean {
  return typeof window !== "undefined" && 
    "serviceWorker" in navigator && 
    "PushManager" in window;
}

// Convert base64 to Uint8Array for VAPID key
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

// Get device type
function getDeviceType(): "desktop" | "mobile" | "tablet" {
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * usePushNotifications - Hook for managing push notifications
 * 
 * Provides:
 * - isSupported: Browser supports push notifications
 * - permissionStatus: Current permission state
 * - isSubscribed: User is subscribed to push
 * - requestPermission(): Request push permission
 * - subscribe(): Subscribe to push notifications
 * - unsubscribe(): Unsubscribe from push notifications
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  // Check status on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!isSupported) return;

      // Check permission
      const currentPermission = Notification.permission;
      setPermission(currentPermission);

      // Check existing subscriptions
      if (currentPermission === "granted") {
        try {
          const response = await fetch("/api/push/subscribe");
          if (response.ok) {
            const data = await response.json();
            setSubscriptions(data.subscriptions || []);
            setIsSubscribed((data.subscriptions || []).length > 0);
            
            if (data.preferences) {
              setPreferences(data.preferences);
            }
            
            if (data.vapidPublicKey) {
              localStorage.setItem("vapidPublicKey", data.vapidPublicKey);
            }
          }
        } catch (err) {
          console.error("Error checking subscription status:", err);
        }
      }
    };

    checkStatus();

    // Listen for notification clicks
    const handleNotificationClick = (event: MessageEvent) => {
      if (event.data && event.data.type === "NOTIFICATION_CLICKED") {
        const data = event.data.data;
        if (data?.url) {
          window.location.href = data.url;
        }
      }
    };

    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", handleNotificationClick);
    }

    return () => {
      if (typeof navigator !== "undefined" && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", handleNotificationClick);
      }
    };
  }, [isSupported]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Push notifications are not supported");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newPermission = await Notification.requestPermission();
      setPermission(newPermission);

      if (newPermission !== "granted") {
        setError("Permission denied");
        setIsLoading(false);
        return false;
      }

      setIsLoading(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to request permission";
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<PushSubscriptionData | null> => {
    if (!isSupported) {
      setError("Push notifications are not supported");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission if needed
      let currentPermission = permission;
      if (currentPermission !== "granted") {
        const granted = await requestPermission();
        if (!granted) {
          setError("Permission required");
          setIsLoading(false);
          return null;
        }
        currentPermission = "granted";
      }

      // Get VAPID public key
      let vapidPublicKey = localStorage.getItem("vapidPublicKey");
      if (!vapidPublicKey) {
        const response = await fetch("/api/push/subscribe");
        if (response.ok) {
          const data = await response.json();
          vapidPublicKey = data.vapidPublicKey;
          if (vapidPublicKey) {
            localStorage.setItem("vapidPublicKey", vapidPublicKey);
          }
        }
      }

      if (!vapidPublicKey) {
        setError("Failed to get VAPID key");
        setIsLoading(false);
        return null;
      }

      // Get service worker registration
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
      };

      if (!subscriptionData.endpoint || !subscriptionData.p256dh || !subscriptionData.auth) {
        setError("Invalid subscription data");
        setIsLoading(false);
        return null;
      }

      // Save to server
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...subscriptionData,
          userAgent: navigator.userAgent,
          deviceType: getDeviceType(),
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
        throw new Error("Failed to save subscription to server");
      }

      // Refresh subscriptions list
      const dataResponse = await fetch("/api/push/subscribe");
      if (dataResponse.ok) {
        const data = await dataResponse.json();
        setSubscriptions(data.subscriptions || []);
      }

      setIsSubscribed(true);
      setIsLoading(false);
      return subscriptionData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to subscribe";
      setError(errorMessage);
      setIsLoading(false);
      return null;
    }
  }, [isSupported, permission, requestPermission, preferences]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Unsubscribe from browser
      if (isSupported) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Remove from server
      await fetch("/api/push/unsubscribe", { method: "DELETE" });

      setIsSubscribed(false);
      setSubscriptions([]);
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to unsubscribe";
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, [isSupported]);

  // Update notification preferences
  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>): Promise<void> => {
    const newPreferences = { ...preferences, ...prefs };
    setPreferences(newPreferences);

    try {
      const response = await fetch("/api/push/subscribe", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyPaymentReminders: newPreferences.paymentReminders,
          notifyNewDebts: newPreferences.newDebts,
          notifyRemindersSent: newPreferences.remindersSent,
          notifySubscription: newPreferences.subscription,
          soundEnabled: newPreferences.soundEnabled,
          quietHoursStart: newPreferences.quietHoursStart,
          quietHoursEnd: newPreferences.quietHoursEnd,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update preferences");
      }
    } catch (err) {
      // Revert on error
      setPreferences(preferences);
      throw err;
    }
  }, [preferences]);

  // Send test notification
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!isSubscribed) {
      setError("Not subscribed to push notifications");
      return false;
    }

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "debt.created",
          title: "Notification de test",
          body: "Votre configuration de notification fonctionne correctement !",
        }),
      });

      const data = await response.json();
      return data.success;
    } catch (err) {
      console.error("Error sending test notification:", err);
      return false;
    }
  }, [isSubscribed]);

  return {
    isSupported,
    isSubscribed,
    permission,
    permissionStatus: permission,
    isLoading,
    error,
    subscriptions,
    requestPermission,
    subscribe,
    unsubscribe,
    preferences,
    updatePreferences,
    sendTestNotification,
  };
}
