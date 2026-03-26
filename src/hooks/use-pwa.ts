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
  canInstall: boolean;
  isOffline: boolean;
  isOnline: boolean;
  needsUpdate: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface PWAActions {
  promptInstall: () => Promise<boolean>;
  install: () => Promise<boolean>;
  updateApp: () => void;
  applyUpdate: () => void;
  clearCache: () => Promise<void>;
  cacheUrls: (urls: string[]) => Promise<void>;
}

// Helper function to get initial PWA state (called only once on mount)
function getInitialPWAState(): PWAState {
  if (typeof window === "undefined") {
    return {
      isInstallable: false,
      isInstalled: false,
      canInstall: false,
      isOffline: false,
      isOnline: true,
      needsUpdate: false,
      updateAvailable: false,
      registration: null,
    };
  }

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true;

  return {
    isInstallable: false,
    isInstalled: isStandalone,
    canInstall: false,
    isOffline: !navigator.onLine,
    isOnline: navigator.onLine,
    needsUpdate: false,
    updateAvailable: false,
    registration: null,
  };
}

export function usePWA(): PWAState & PWAActions {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PWAState>(getInitialPWAState);

  // Écouter l'événement d'installation
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setState((prev) => ({ ...prev, isInstallable: true, canInstall: true }));
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState((prev) => ({
        ...prev,
        isInstallable: false,
        canInstall: false,
        isInstalled: true,
      }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Écouter l'état online/offline
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOffline: false, isOnline: true }));
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOffline: true, isOnline: false }));
    };

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
                setState((prev) => ({
                  ...prev,
                  needsUpdate: true,
                  updateAvailable: true,
                }));
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
      setState((prev) => ({
        ...prev,
        isInstallable: false,
        canInstall: false,
      }));

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

  // Alias functions for consistent API
  const install = promptInstall;
  const applyUpdate = updateApp;

  return {
    ...state,
    promptInstall,
    install,
    updateApp,
    applyUpdate,
    clearCache,
    cacheUrls,
  };
}

// Helper function to get initial capabilities (called only once on mount)
function getInitialCapabilities() {
  if (typeof window === "undefined") {
    return {
      serviceWorker: false,
      pushManager: false,
      notifications: false,
      backgroundSync: false,
      indexedDB: false,
      cache: false,
      pwaSupported: false,
    };
  }

  return {
    serviceWorker: "serviceWorker" in navigator,
    pushManager: "PushManager" in window,
    notifications: "Notification" in window,
    backgroundSync:
      "sync" in (window.ServiceWorkerRegistration?.prototype || {}),
    indexedDB: "indexedDB" in window,
    cache: "caches" in window,
    pwaSupported: "serviceWorker" in navigator && "PushManager" in window,
  };
}

// Hook pour vérifier les fonctionnalités PWA
export function usePWACapabilities() {
  const [capabilities] = useState(getInitialCapabilities);
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
