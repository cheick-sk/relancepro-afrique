"use client";

import { useState, useEffect, useRef } from "react";
import { usePWA } from "@/hooks/use-pwa";
import { WifiOff, Wifi, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// =====================================================
// Offline Indicator Component
// Shows toast notifications when offline/online status changes
// =====================================================

export function OfflineIndicator() {
  const { isOffline, isOnline } = usePWA();
  const wasOfflineRef = useRef(false);
  const [showBanner, setShowBanner] = useState(false);

  // Track online/offline transitions
  useEffect(() => {
    const wasOffline = wasOfflineRef.current;
    wasOfflineRef.current = isOffline;

    // Defer state updates to avoid cascading renders
    const timer = setTimeout(() => {
      // Going offline
      if (isOffline && !wasOffline) {
        setShowBanner(true);
        toast.error("Vous êtes hors ligne", {
          description: "Certaines fonctionnalités peuvent être limitées.",
          icon: <WifiOff className="h-4 w-4" />,
          duration: Infinity,
          id: "offline-toast",
        });
      }

      // Coming back online
      if (!isOffline && wasOffline) {
        setShowBanner(false);
        toast.dismiss("offline-toast");
        toast.success("Connexion rétablie !", {
          description: "Vos données seront synchronisées automatiquement.",
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          duration: 5000,
        });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isOffline]);

  // Show persistent offline banner at top of screen
  if (showBanner && isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 px-4 text-center text-sm font-medium shadow-lg animate-in slide-in-from-top duration-300">
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4 animate-pulse" />
          <span>Vous êtes hors ligne</span>
          <span className="hidden sm:inline">• Certaines fonctionnalités peuvent être limitées</span>
        </div>
      </div>
    );
  }

  return null;
}

// =====================================================
// Compact Offline Badge
// Small indicator for use in headers/navigation
// =====================================================

export function OfflineBadge() {
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium">
      <WifiOff className="h-3 w-3" />
      <span>Hors ligne</span>
    </div>
  );
}

// =====================================================
// Connection Status Indicator
// Shows current connection status with icon
// =====================================================

export function ConnectionStatus() {
  const { isOffline, isOnline } = usePWA();

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-300 ${
        isOffline
          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Hors ligne</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5" />
          <span>En ligne</span>
        </>
      )}
    </div>
  );
}

// =====================================================
// Sync Status Component
// Shows pending sync items count
// =====================================================

export function SyncStatus() {
  const { isOffline } = usePWA();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Check for pending sync items in IndexedDB
    if (typeof window === "undefined" || !("indexedDB" in window)) return;

    const checkPending = async () => {
      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("RelanceProOffline", 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const stores = ["pending-reminders", "pending-clients", "pending-debts"];
        let total = 0;

        for (const storeName of stores) {
          try {
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const count = await new Promise<number>((resolve) => {
              const request = store.count();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => resolve(0);
            });
            total += count;
          } catch {
            // Store might not exist
          }
        }

        setPendingCount(total);
      } catch {
        // IndexedDB not available
      }
    };

    checkPending();

    // Check periodically when offline
    const interval = setInterval(checkPending, 30000);
    return () => clearInterval(interval);
  }, [isOffline]);

  if (pendingCount === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
      <AlertCircle className="h-3.5 w-3.5" />
      <span>{pendingCount} élément{pendingCount > 1 ? "s" : ""} en attente de sync</span>
    </div>
  );
}

export default OfflineIndicator;
