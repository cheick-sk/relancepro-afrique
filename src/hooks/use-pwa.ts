"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// =====================================================
// PWA Hook - Gestion de l'installation et état offline
// RelancePro Africa - Progressive Web App
// =====================================================

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PendingActionsCount {
  reminders: number;
  clients: number;
  debts: number;
  actions: number;
  total: number;
}

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingActions: PendingActionsCount;
  error: string | null;
}

interface PWAState {
  // Installation state
  isInstalled: boolean;
  canInstall: boolean;
  isInstallable: boolean; // Alias for backward compatibility
  
  // Network state
  isOffline: boolean;
  
  // Service worker state
  updateAvailable: boolean;
  needsUpdate: boolean; // Alias for backward compatibility
  registration: ServiceWorkerRegistration | null;
  
  // Sync state
  syncStatus: SyncStatus;
}

interface PWAActions {
  // Installation
  installApp: () => Promise<boolean>;
  promptInstall: () => Promise<boolean>; // Alias for backward compatibility
  
  // Updates
  updateApp: () => void;
  
  // Cache management
  clearCache: () => Promise<void>;
  cacheUrls: (urls: string[]) => Promise<void>;
  
  // Sync
  registerSync: (tag?: string) => Promise<void>;
  getPendingCount: () => Promise<PendingActionsCount>;
  
  // Notifications
  requestNotificationPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => void;
  subscribeToPush: (vapidKey: string) => Promise<PushSubscriptionJSON | null>;
}

// Helper functions for lazy initialization
function getIsInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

function getIsOffline(): boolean {
  if (typeof window === "undefined") return false;
  return !navigator.onLine;
}

export function usePWA(): PWAState & PWAActions {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PWAState>(() => ({
    isInstalled: getIsInstalled(),
    canInstall: false,
    isInstallable: false,
    isOffline: getIsOffline(),
    updateAvailable: false,
    needsUpdate: false,
    registration: null,
    syncStatus: {
      isSyncing: false,
      lastSyncTime: null,
      pendingActions: { reminders: 0, clients: 0, debts: 0, actions: 0, total: 0 },
      error: null,
    },
  }));

  // Vérifier si l'app est déjà installée (update on mount for SSR hydration)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone = getIsInstalled();
    // Defer setState to avoid synchronous call
    const timer = setTimeout(() => {
      setState((prev) => ({ 
        ...prev, 
        isInstalled: isStandalone,
      }));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Écouter l'événement d'installation
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setState((prev) => ({ 
        ...prev, 
        canInstall: true,
        isInstallable: true,
      }));
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState((prev) => ({
        ...prev,
        canInstall: false,
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

    // Update initial state with deferred call
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, isOffline: !navigator.onLine }));
    }, 0);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearTimeout(timer);
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
                  updateAvailable: true,
                  needsUpdate: true,
                }));
              }
            });
          }
        });

        // Vérifier si un SW est déjà en attente
        if (registration.waiting) {
          setState((prev) => ({ 
            ...prev, 
            updateAvailable: true,
            needsUpdate: true,
          }));
        }

        // Vérifier périodiquement les mises à jour
        const intervalId = setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Chaque heure

        return () => clearInterval(intervalId);
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    };

    registerServiceWorker();
  }, []);

  // Obtenir le nombre d'actions en attente - defined before useEffect that uses it
  const getPendingCount = useCallback(async (): Promise<PendingActionsCount> => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "GET_PENDING_COUNT" });
    }
    
    return state.syncStatus.pendingActions;
  }, [state.syncStatus.pendingActions]);

  // Écouter les messages du Service Worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data || {};

      switch (type) {
        case "PENDING_COUNT":
          setState((prev) => ({
            ...prev,
            syncStatus: {
              ...prev.syncStatus,
              pendingActions: data,
              isSyncing: false,
            },
          }));
          break;

        case "sync-progress":
        case "sync-complete":
          setState((prev) => ({
            ...prev,
            syncStatus: {
              ...prev.syncStatus,
              isSyncing: false,
              lastSyncTime: data?.timestamp || Date.now(),
              error: null,
            },
          }));
          // Rafraîchir le compteur
          getPendingCount();
          break;

        case "action-pending":
          getPendingCount();
          break;

        case "PUSH_SUBSCRIPTION":
          console.log("Push subscription:", data);
          break;

        case "PUSH_SUBSCRIPTION_ERROR":
          console.error("Push subscription error:", data?.error);
          break;
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    // Obtenir le compteur initial
    getPendingCount();

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [getPendingCount]);

  // Prompt d'installation
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      setDeferredPrompt(null);
      setState((prev) => ({ 
        ...prev, 
        canInstall: false,
        isInstallable: false,
      }));

      return outcome === "accepted";
    } catch (error) {
      console.error("Install prompt error:", error);
      return false;
    }
  }, [deferredPrompt]);

  // Alias pour compatibilité
  const promptInstall = installApp;

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
        data: { urls },
      });
    }
  }, []);

  // Enregistrer une synchronisation en arrière-plan
  const registerSync = useCallback(async (tag: string = "sync-all"): Promise<void> => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      setState((prev) => ({
        ...prev,
        syncStatus: { ...prev.syncStatus, isSyncing: true, error: null },
      }));

      navigator.serviceWorker.controller.postMessage({
        type: "REGISTER_SYNC",
        data: { tag },
      });
    }
  }, []);

  // Demander la permission de notification
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
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
  }, []);

  // Afficher une notification locale
  const showNotification = useCallback((title: string, options?: NotificationOptions): void => {
    if (typeof window === "undefined") return;

    if (Notification.permission === "granted") {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-72x72.png",
            ...options,
          });
        });
      } else {
        new Notification(title, {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          ...options,
        });
      }
    }
  }, []);

  // S'abonner aux push notifications
  const subscribeToPush = useCallback(async (vapidKey: string): Promise<PushSubscriptionJSON | null> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Vérifier s'il y a déjà un abonnement
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      return subscription.toJSON();
    } catch (error) {
      console.error("Push subscription error:", error);
      return null;
    }
  }, []);

  return {
    ...state,
    installApp,
    promptInstall,
    updateApp,
    clearCache,
    cacheUrls,
    registerSync,
    getPendingCount,
    requestNotificationPermission,
    showNotification,
    subscribeToPush,
  };
}

// Helper pour convertir la clé VAPID
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

// Hook pour vérifier les fonctionnalités PWA
export function usePWACapabilities() {
  // Use lazy initialization to compute capabilities once
  const [capabilities] = useState(() => {
    if (typeof window === "undefined") {
      return {
        serviceWorker: false,
        pushManager: false,
        notifications: false,
        backgroundSync: false,
        periodicSync: false,
        indexedDB: false,
        cache: false,
      };
    }
    return {
      serviceWorker: "serviceWorker" in navigator,
      pushManager: "PushManager" in window,
      notifications: "Notification" in window,
      backgroundSync: "sync" in (window.ServiceWorkerRegistration?.prototype || {}),
      periodicSync: "periodicSync" in (window.ServiceWorkerRegistration?.prototype || {}),
      indexedDB: "indexedDB" in window,
      cache: "caches" in window,
    };
  });

  return capabilities;
}

// Hook pour le statut de synchronisation
export function useSyncStatus() {
  const { syncStatus, registerSync, isOffline } = usePWA();
  const [showSyncNotification, setShowSyncNotification] = useState(false);
  const wasOfflineRef = useRef(isOffline);

  // Synchroniser automatiquement quand on revient online
  useEffect(() => {
    // Only trigger when transitioning from offline to online
    if (wasOfflineRef.current && !isOffline && syncStatus.pendingActions.total > 0) {
      // Defer setState to avoid synchronous call
      const timer = setTimeout(() => {
        setShowSyncNotification(true);
        registerSync("sync-all");
        
        setTimeout(() => setShowSyncNotification(false), 5000);
      }, 0);
      return () => clearTimeout(timer);
    }
    wasOfflineRef.current = isOffline;
  }, [isOffline, syncStatus.pendingActions.total, registerSync]);

  return {
    ...syncStatus,
    showSyncNotification,
    triggerSync: () => registerSync("sync-all"),
  };
}

// Fonction utilitaire pour demander la permission de notification
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
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
  if (typeof window === "undefined") return;

  if (Notification.permission === "granted") {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          ...options,
        });
      });
    } else {
      new Notification(title, {
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        ...options,
      });
    }
  }
}

// Hook pour le stockage offline (IndexedDB wrapper simple)
export function useOfflineStorage<T>(storeName: string) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const request = indexedDB.open("RelanceProOffline", 2);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
      }
    };
    
    request.onsuccess = () => {
      setIsReady(true);
    };
  }, [storeName]);

  const save = useCallback(async (data: T): Promise<number> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("RelanceProOffline", 2);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const addRequest = store.add({ ...data, timestamp: Date.now() });
        
        addRequest.onsuccess = () => resolve(addRequest.result as number);
        addRequest.onerror = () => reject(addRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }, [storeName]);

  const getAll = useCallback(async (): Promise<(T & { id: number; timestamp: number })[]> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("RelanceProOffline", 2);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(storeName)) {
          resolve([]);
          return;
        }
        
        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }, [storeName]);

  const remove = useCallback(async (id: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("RelanceProOffline", 2);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }, [storeName]);

  const clear = useCallback(async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("RelanceProOffline", 2);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }, [storeName]);

  return {
    isReady,
    save,
    getAll,
    remove,
    clear,
  };
}

export default usePWA;
