"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  showLocalNotification,
  setupNotificationClickListener,
  getDeviceType,
  getUserAgent,
} from "@/lib/push-notifications";

interface PushSubscriptionData {
  id: string;
  endpoint: string;
  deviceType: string | null;
  userAgent: string | null;
  notifyReminders: boolean;
  notifyPayments: boolean;
  notifyAlerts: boolean;
  notifyWeeklyDigest: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface UsePushNotificationsReturn {
  // State
  isSupported: boolean;
  permissionState: 'granted' | 'denied' | 'default';
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscriptions: PushSubscriptionData[];
  vapidPublicKey: string | null;

  // Actions
  requestPermission: () => Promise<'granted' | 'denied' | 'default'>;
  subscribe: () => Promise<boolean>;
  unsubscribe: (subscriptionId?: string) => Promise<boolean>;
  unsubscribeAll: () => Promise<boolean>;
  updatePreferences: (subscriptionId: string, preferences: Partial<{
    notifyReminders: boolean;
    notifyPayments: boolean;
    notifyAlerts: boolean;
    notifyWeeklyDigest: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  }>) => Promise<boolean>;
  showNotification: (title: string, body: string, data?: Record<string, unknown>) => Promise<boolean>;
  refreshSubscriptions: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported] = useState(() => isPushSupported());
  const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'default'>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionData[]>([]);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Check permission and subscription status on mount
  useEffect(() => {
    const checkStatus = async () => {
      const currentPermission = getNotificationPermission();
      setPermissionState(currentPermission as 'granted' | 'denied' | 'default');

      if (currentPermission === "granted" && isSupported) {
        await refreshSubscriptions();
      }
    };

    checkStatus();

    // Listen for notification clicks
    const cleanup = setupNotificationClickListener((data) => {
      if (data.url) {
        window.location.href = data.url as string;
      }
    });

    return cleanup;
  }, [isSupported]);

  // Refresh subscriptions from server
  const refreshSubscriptions = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/subscribe");
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
        setVapidPublicKey(data.vapidPublicKey || null);
        setIsSubscribed((data.subscriptions || []).length > 0);
      }
    } catch (err) {
      console.error("Error refreshing subscriptions:", err);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newPermission = await requestNotificationPermission();
      const permission = newPermission as 'granted' | 'denied' | 'default';
      setPermissionState(permission);

      if (permission !== "granted") {
        setError("Permission de notification refusée");
      }

      return permission;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la demande de permission";
      setError(errorMessage);
      return "denied" as const;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError("Les notifications push ne sont pas supportées par ce navigateur");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission if needed
      let currentPermission = permissionState;
      if (currentPermission !== "granted") {
        currentPermission = await requestPermission();
        if (currentPermission !== "granted") {
          setError("Permission de notification requise");
          return false;
        }
      }

      // Get push subscription from browser
      const subscriptionData = await subscribeToPush(vapidPublicKey || undefined);
      if (!subscriptionData) {
        setError("Impossible de créer la subscription push");
        return false;
      }

      // Register with server
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscriptionData.endpoint,
          p256dh: subscriptionData.p256dh,
          auth: subscriptionData.auth,
          userAgent: getUserAgent(),
          deviceType: getDeviceType(),
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'enregistrement de la subscription");
      }

      await refreshSubscriptions();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'abonnement";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permissionState, requestPermission, vapidPublicKey, refreshSubscriptions]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (subscriptionId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Unsubscribe from browser
      await unsubscribeFromPush();

      // Remove from server
      const response = await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          subscriptionId ? { subscriptionId } : {}
        ),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du désabonnement");
      }

      await refreshSubscriptions();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du désabonnement";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshSubscriptions]);

  // Unsubscribe all devices
  const unsubscribeAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Unsubscribe from browser
      await unsubscribeFromPush();

      // Remove all from server
      const response = await fetch("/api/notifications/unsubscribe", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors du désabonnement");
      }

      setSubscriptions([]);
      setIsSubscribed(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du désabonnement";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update subscription preferences
  const updatePreferences = useCallback(async (
    subscriptionId: string,
    preferences: Partial<{
      notifyReminders: boolean;
      notifyPayments: boolean;
      notifyAlerts: boolean;
      notifyWeeklyDigest: boolean;
      quietHoursEnabled: boolean;
      quietHoursStart: string;
      quietHoursEnd: string;
    }>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notifications/subscribe", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId,
          ...preferences,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour des préférences");
      }

      await refreshSubscriptions();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la mise à jour";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshSubscriptions]);

  // Show local notification
  const showNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => {
    if (permissionState !== "granted") {
      setError("Permission de notification non accordée");
      return false;
    }

    return showLocalNotification({
      title,
      body,
      data,
    });
  }, [permissionState]);

  return {
    isSupported,
    permissionState,
    isSubscribed,
    isLoading,
    error,
    subscriptions,
    vapidPublicKey,
    requestPermission,
    subscribe,
    unsubscribe,
    unsubscribeAll,
    updatePreferences,
    showNotification,
    refreshSubscriptions,
  };
}
