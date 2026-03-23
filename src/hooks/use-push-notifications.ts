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
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface UsePushNotificationsReturn {
  // État
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  showNotification: (title: string, body: string, data?: Record<string, unknown>) => Promise<boolean>;
  
  // Préférences
  preferences: {
    notifyReminders: boolean;
    notifyPayments: boolean;
    notifyAlerts: boolean;
  };
  updatePreferences: (prefs: Partial<{
    notifyReminders: boolean;
    notifyPayments: boolean;
    notifyAlerts: boolean;
  }>) => void;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    notifyReminders: true,
    notifyPayments: true,
    notifyAlerts: true,
  });

  // Vérifier la permission et le statut de subscription au montage
  useEffect(() => {
    const checkStatus = async () => {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      // Vérifier si déjà subscribed
      if (currentPermission === "granted" && isSupported) {
        try {
          const response = await fetch("/api/push/subscribe");
          if (response.ok) {
            const subscriptions = await response.json();
            setIsSubscribed(subscriptions.length > 0);
          }
        } catch (err) {
          console.error("Error checking subscription status:", err);
        }
      }
    };

    checkStatus();

    // Écouter les clics sur les notifications
    const cleanup = setupNotificationClickListener((data) => {
      // Rediriger vers l'URL si spécifiée
      if (data.url) {
        window.location.href = data.url as string;
      }
    });

    return cleanup;
  }, [isSupported]);

  // Demander la permission
  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission !== "granted") {
        setError("Permission de notification refusée");
      }

      return newPermission;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la demande de permission";
      setError(errorMessage);
      return "denied" as NotificationPermission;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // S'abonner aux notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError("Les notifications push ne sont pas supportées par ce navigateur");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Demander la permission si nécessaire
      let currentPermission = permission;
      if (currentPermission !== "granted") {
        currentPermission = await requestPermission();
        if (currentPermission !== "granted") {
          setError("Permission de notification requise");
          return false;
        }
      }

      // Obtenir la subscription push
      const subscriptionData = await subscribeToPush();
      if (!subscriptionData) {
        setError("Impossible de créer la subscription push");
        return false;
      }

      // Enregistrer sur le serveur
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...subscriptionData,
          userAgent: getUserAgent(),
          deviceType: getDeviceType(),
          ...preferences,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'enregistrement de la subscription");
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'abonnement";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission, requestPermission, preferences]);

  // Se désabonner des notifications
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Supprimer du navigateur
      const unsubscribed = await unsubscribeFromPush();
      if (!unsubscribed) {
        console.warn("Could not unsubscribe from browser");
      }

      // Supprimer du serveur
      const response = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      // Essayer de supprimer toutes les subscriptions
      await fetch("/api/push/unsubscribe", { method: "DELETE" });

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

  // Afficher une notification locale
  const showNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => {
    if (permission !== "granted") {
      setError("Permission de notification non accordée");
      return false;
    }

    return showLocalNotification({
      title,
      body,
      data,
    });
  }, [permission]);

  // Mettre à jour les préférences
  const updatePreferences = useCallback((prefs: Partial<typeof preferences>) => {
    setPreferences((prev) => ({ ...prev, ...prefs }));
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    preferences,
    updatePreferences,
  };
}
