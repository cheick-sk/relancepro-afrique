"use client";

import { useState, useEffect, useCallback } from "react";

// =====================================================
// PWA Hook - Gestion de l'installation et état offline
// =====================================================

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  needsUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface PWAActions {
  promptInstall: () => Promise<boolean>;
  updateApp: () => void;
  clearCache: () => Promise<void>;
  cacheUrls: (urls: string[]) => Promise<void>;
}

export function usePWA(): PWAState & PWAActions {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: false,
    needsUpdate: false,
    registration: null,
  });

  // Vérifier si l'app est déjà installée
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Vérifier le mode standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setState((prev) => ({ ...prev, isInstalled: isStandalone }));
  }, []);

  // Écouter l'événement d'installation
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setState((prev) => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState((prev) => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
      }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Écouter l'état online/offline
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOffline: true }));
    };

    setState((prev) => ({ ...prev, isOffline: !navigator.onLine }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Enregistrer et gérer le Service Worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        setState((prev) => ({ ...prev, registration }));

        // Vérifier les mises à jour
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setState((prev) => ({ ...prev, needsUpdate: true }));
              }
            });
          }
        });

        // Vérifier périodiquement les mises à jour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Chaque heure
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    };

    registerServiceWorker();
  }, []);

  // Prompt d'installation
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      setDeferredPrompt(null);
      setState((prev) => ({ ...prev, isInstallable: false }));

      return outcome === "accepted";
    } catch (error) {
      console.error("Install prompt error:", error);
      return false;
    }
  }, [deferredPrompt]);

  // Mettre à jour l'app
  const updateApp = useCallback(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
          window.location.reload();
        }
      });
    }
  }, []);

  // Vider le cache
  const clearCache = useCallback(async (): Promise<void> => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHE" });
    }

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  }, []);

  // Cacher des URLs spécifiques
  const cacheUrls = useCallback(async (urls: string[]): Promise<void> => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "CACHE_URLS",
        urls,
      });
    }
  }, []);

  return {
    ...state,
    promptInstall,
    updateApp,
    clearCache,
    cacheUrls,
  };
}

// Hook pour vérifier les fonctionnalités PWA
export function usePWACapabilities() {
  const [capabilities, setCapabilities] = useState({
    serviceWorker: false,
    pushManager: false,
    notifications: false,
    backgroundSync: false,
    indexedDB: false,
    cache: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    setCapabilities({
      serviceWorker: "serviceWorker" in navigator,
      pushManager: "PushManager" in window,
      notifications: "Notification" in window,
      backgroundSync: "sync" in (window.ServiceWorkerRegistration?.prototype || {}),
      indexedDB: "indexedDB" in window,
      cache: "caches" in window,
    });
  }, []);

  return capabilities;
}

// Composant utilitaire pour demander la permission de notification
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

// Fonction pour envoyer une notification locale
export function showLocalNotification(
  title: string,
  options?: NotificationOptions
): void {
  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      ...options,
    });
  }
}

export default usePWA;
